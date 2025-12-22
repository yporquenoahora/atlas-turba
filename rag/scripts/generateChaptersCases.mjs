import fs from "node:fs/promises";
import path from "node:path";

import { retrieveLocal } from "../server/retrieveLocal.mjs";
import { buildContinuePrompt } from "../server/prompts.mjs";
import { generateJsonWithLLM } from "../server/llmAdapter.mjs";

const REPO_ROOT = path.resolve(process.cwd()); // ejecútalo desde la raíz atlas-turba
const RAG_ROOT = path.join(REPO_ROOT, "rag");
const CASES_DIR = path.join(RAG_ROOT, "cases");
const OUT_DIR = path.join(RAG_ROOT, "out");
const OUT_CSV = path.join(OUT_DIR, "chapters.csv");

const MAX_CHAPTERS = 100; // ajusta
const TOPK = 8;

function csvEscape(value) {
  const s = String(value ?? "");
  // CSV simple: comillas dobles si hay comas, saltos o comillas
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function pickCursor(chapterIndex, timelineLen, totalChapters) {
  if (timelineLen <= 1) return 0;
  // distribuye capítulos a lo largo del timeline
  const ratio = totalChapters <= 1 ? 0 : chapterIndex / (totalChapters - 1);
  return Math.min(timelineLen - 1, Math.max(0, Math.floor(ratio * (timelineLen - 1))));
}

async function readJSON(p) {
  return JSON.parse(await fs.readFile(p, "utf-8"));
}

async function readMemorySummary(memoryLines, lastN = 3) {
  const recent = memoryLines.slice(-lastN);
  return recent.map((r) => `Cap ${r.chapter}: ${r.summary}`).join("\n");
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const header = [
    "case_id",
    "chapter",
    "t",
    "date",
    "summary",
    "text",
    "facts_json",
    "next_options_json",
    "created_at"
  ].join(",");

  const rows = [header];

  const caseIds = await fs.readdir(CASES_DIR);

  for (const case_id of caseIds) {
    const caseDir = path.join(CASES_DIR, case_id);
    // saltar cosas raras
    try {
      const stat = await fs.stat(caseDir);
      if (!stat.isDirectory()) continue;
    } catch {
      continue;
    }

    const timelinePath = path.join(caseDir, "timeline.json");
    let timeline;
    try {
      timeline = await readJSON(timelinePath);
    } catch {
      console.log(`⏭️  ${case_id}: no timeline.json`);
      continue;
    }

    const events = timeline.events || [];
    const timelineLen = events.length;
    if (timelineLen === 0) {
      console.log(`⏭️  ${case_id}: timeline vacío`);
      continue;
    }

    console.log(`🧠 Generando ${MAX_CHAPTERS} capítulos para: ${case_id} (timeline ${timelineLen} eventos)`);

    const memory = []; // memoria en RAM durante la generación (no usamos memory.jsonl)
    for (let chapter = 0; chapter < MAX_CHAPTERS; chapter++) {
      const cursor = pickCursor(chapter, timelineLen, MAX_CHAPTERS);
      const ev = events[cursor] || { estado: {} };

      const retrieved = await retrieveLocal({ caseDir, cursor, topK: TOPK });
      const memorySummary = await readMemorySummary(memory);

      const prompt = buildContinuePrompt({
        caseId: case_id,
        cursor,
        state: ev.estado || {},
        retrieved,
        memorySummary
      });

      let out;
try {
  out = await generateJsonWithLLM({ prompt });
} catch (e) {
  // capítulo fallido: lo registramos y seguimos
  out = {
    text: "",
    summary: `ERROR: ${String(e.message || e).slice(0, 180)}`,
    facts: ["chapter_failed=true"],
    next_options: []
  };
}


      const created_at = new Date().toISOString();

      // Guardamos memoria para continuidad
      memory.push({
        chapter,
        summary: out.summary || "",
        facts: out.facts || []
      });

      // CSV row
      const line = [
        csvEscape(case_id),
        csvEscape(chapter),
        csvEscape(cursor),
        csvEscape(ev.date || ""),
        csvEscape(out.summary || ""),
        csvEscape(out.text || ""),
        csvEscape(JSON.stringify(out.facts || [])),
        csvEscape(JSON.stringify(out.next_options || [])),
        csvEscape(created_at)
      ].join(",");
      
      await fs.appendFile(OUT_CSV, line + "\n", "utf-8");
      

      // feedback
      if ((chapter + 1) % 10 === 0) console.log(`  ✅ ${case_id}: ${chapter + 1}/${MAX_CHAPTERS}`);
    }
  }

 // await fs.writeFile(OUT_CSV, rows.join("\n"), "utf-8");
  await fs.mkdir(OUT_DIR, { recursive: true });

// Cabecera (se crea desde el minuto 1)


await fs.writeFile(OUT_CSV, header + "\n", "utf-8");
console.log(`📝 CSV inicializado: ${OUT_CSV}`);

  console.log(`🏁 CSV generado: ${OUT_CSV}`);
}

main().catch((e) => {
  console.error("❌ Error generando CSV:", e);
  process.exit(1);
});
