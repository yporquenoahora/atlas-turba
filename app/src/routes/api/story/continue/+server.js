import { json } from "@sveltejs/kit";
import path from "node:path";
import fs from "node:fs/promises";

import { buildContinuePrompt } from "$rag/server/prompts.mjs";
import { retrieveLocal } from "$rag/server/retrieveLocal.mjs";

// Usa el dummy por ahora:
import { generateJsonWithLLM } from "$rag/server/llmAdapter.mjs";

async function readJSON(p) {
  return JSON.parse(await fs.readFile(p, "utf-8"));
}

async function readMemorySummary(memoryPath, lastN = 3) {
  try {
    const raw = (await fs.readFile(memoryPath, "utf-8")).trim();
    if (!raw) return "";
    const lines = raw.split("\n").filter(Boolean);
    const recent = lines.slice(-lastN).map((l) => JSON.parse(l));
    return recent.map((r) => `Cap ${r.chapter}: ${r.summary}`).join("\n");
  } catch {
    return "";
  }
}

async function appendMemory(memoryPath, obj) {
  await fs.appendFile(memoryPath, JSON.stringify(obj) + "\n", "utf-8");
}

function nextChapterNumber(raw) {
  if (!raw || !raw.trim()) return 0;
  const lines = raw.trim().split("\n").filter(Boolean);
  let max = -1;
  for (const l of lines) {
    try {
      const o = JSON.parse(l);
      if (typeof o.chapter === "number") max = Math.max(max, o.chapter);
    } catch {}
  }
  return max + 1;
}

export async function POST({ request }) {
  try {
    const { case_id, cursor = 0 } = await request.json();
    if (!case_id) return json({ error: "case_id requerido" }, { status: 400 });

    const ragRoot = path.join(process.cwd(), "../rag");
    const caseDir = path.join(ragRoot, "cases", case_id);
    const timelinePath = path.join(caseDir, "timeline.json");
    const memoryPath = path.join(caseDir, "memory.jsonl");

    const timeline = await readJSON(timelinePath);
    const events = timeline.events || [];
    const ev = events.find((e) => e.t === cursor) || events[events.length - 1] || { estado: {}, tags: [] };

    // Recuperación local (sin embeddings)
    const retrieved = await retrieveLocal({ caseDir, cursor, topK: 8 });

    const memorySummary = await readMemorySummary(memoryPath);

    const prompt = buildContinuePrompt({
      caseId: case_id,
      cursor,
      state: ev.estado || {},
      retrieved,
      memorySummary
    });

    const out = await generateJsonWithLLM({ prompt });

    let memRaw = "";
    try { memRaw = await fs.readFile(memoryPath, "utf-8"); } catch {}
    const chapter = nextChapterNumber(memRaw);

    await appendMemory(memoryPath, {
      chapter,
      text: out.text,
      summary: out.summary,
      facts: out.facts || [],
      created_at: new Date().toISOString()
    });

    return json({
      chapter,
      ...out,
      sources: retrieved.map((r) => ({ id: r.id, tipo: r.meta?.tipo || "chunk" }))
    });
  } catch (err) {
    console.error("🔥 /api/story/continue error:", err);
    return json(
      {
        error: String(err?.message || err),
        stack: err?.stack || null
      },
      { status: 500 }
    );
  }
  
}
