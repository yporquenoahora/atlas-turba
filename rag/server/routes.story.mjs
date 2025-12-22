import fs from "node:fs/promises";
import path from "node:path";
import { buildContinuePrompt } from "./prompts.mjs";
import { generateJsonWithLLM } from "./llmAdapter.mjs";

async function readJSON(p) {
  return JSON.parse(await fs.readFile(p, "utf-8"));
}

async function readMemorySummary(memoryPath, lastN = 3) {
  try {
    const raw = await fs.readFile(memoryPath, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    const recent = lines.slice(-lastN).map(l => JSON.parse(l));
    return recent.map(r => `Cap ${r.chapter}: ${r.summary}`).join("\n");
  } catch {
    return "";
  }
}

async function appendMemory(memoryPath, obj) {
  const line = JSON.stringify(obj);
  await fs.appendFile(memoryPath, line + "\n", "utf-8");
}

export async function continueStory({ ragStore, ragRoot, case_id, cursor }) {
  const caseDir = path.join(ragRoot, "cases", case_id);
  const timelinePath = path.join(caseDir, "timeline.json");
  const memoryPath = path.join(caseDir, "memory.jsonl");

  const timeline = await readJSON(timelinePath);
  const events = timeline.events || [];
  const lastEvent = events.find(e => e.t === cursor) || events[events.length - 1] || { estado: {}, tags: [] };

  // 1) Recuperación
  const queryText = `Continuación del caso ${case_id} desde t=${cursor}. Tags: ${(lastEvent.tags||[]).join(",")}`;
  const qVec = await ragStore.embed(queryText);

  const retrieved = await ragStore.query({
    vector: qVec,
    topK: 10,
    filter: { case_id }
  });

  // 2) Memoria resumida
  const memorySummary = await readMemorySummary(memoryPath);

  // 3) Prompt y generación
  const prompt = buildContinuePrompt({
    caseId: case_id,
    cursor,
    state: lastEvent.estado || {},
    retrieved,
    memorySummary
  });

  const out = await generateJsonWithLLM({ prompt });

  // 4) Persistencia: capítulo nuevo
  const chapterNum = Date.now(); // MVP (luego lo haces incremental)
  await appendMemory(memoryPath, {
    chapter: chapterNum,
    text: out.text,
    summary: out.summary,
    facts: out.facts || [],
    created_at: new Date().toISOString()
  });

  return {
    chapter: chapterNum,
    ...out,
    sources: retrieved.map(r => ({ id: r.id, tipo: r.meta?.tipo }))
  };
}
