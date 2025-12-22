import fs from "node:fs/promises";
import path from "node:path";

import { retrieveLocal } from "../server/retrieveLocal.mjs";
import { buildContinuePrompt } from "../server/prompts.mjs";
import { generateJsonWithLLM } from "../server/llmAdapter.mjs";

const REPO_ROOT = path.resolve(process.cwd()); // ejecútalo desde la raíz atlas-turba
const RAG_ROOT = path.join(REPO_ROOT, "rag");
const CASES_DIR = path.join(RAG_ROOT, "cases");
const OUT_DIR = path.join(RAG_ROOT, "out");

const MAX_CHAPTERS = 100; // ajusta
const TOPK = 8;

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function pickCursor(chapterIndex, timelineLen, totalChapters) {
  if (timelineLen <= 1) return 0;
  const ratio = totalChapters <= 1 ? 0 : chapterIndex / (totalChapters - 1);
  return Math.min(
    timelineLen - 1,
    Math.max(0, Math.floor(ratio * (timelineLen - 1)))
  );
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

  const caseIds = await fs.readdir(CASES_DIR);
  const exported = [];

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

    const outCaseCsv = path.join(OUT_DIR, `${case_id}.csv`);

    // Inicializa CSV del caso (se sobrescribe en cada run)
    await fs.writeFile(outCaseCsv, header + "\n", "utf-8");
    exported.push(case_id);

    console.log(`🧠 Generando ${MAX_CHAPTERS} capítulos para: ${case_id} (timeline ${timelineLen} eventos)`);
    console.log(`📝 CSV caso: ${outCaseCsv}`);

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

      // Generación (con fallback si falla)
      let out;
      try {
        out = await generateJsonWithLLM({ prompt });
      } catch (e) {
        out = {
          text: "",
          summary: `ERROR: ${String(e.message || e).slice(0, 180)}`,
          facts: ["chapter_failed=true"],
          next_options: []
        };
      }

      const created_at = new Date().toISOString();

      // Guardamos memoria para continuidad (aunque haya error, así avanza)
      memory.push({
        chapter,
        summary: out.summary || "",
        facts: out.facts || []
      });

      // Escribimos fila
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

      await fs.appendFile(outCaseCsv, line + "\n", "utf-8");

      // feedback
      if ((chapter + 1) % 10 === 0) {
        console.log(`  ✅ ${case_id}: ${chapter + 1}/${MAX_CHAPTERS}`);
      }
    }
  }

  // Índice para el front: lista de casos exportados
  const indexPath = path.join(OUT_DIR, "index.json");
  await fs.writeFile(indexPath, JSON.stringify(exported, null, 2), "utf-8");

  console.log(`🏁 CSVs generados en: ${OUT_DIR}`);
  console.log(`📌 Índice generado: ${indexPath}`);
}

main().catch((e) => {
  console.error("❌ Error generando CSV:", e);
  process.exit(1);
});
