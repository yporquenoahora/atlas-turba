import fs from "node:fs";
import path from "node:path";

const CASES_DIR = "rag/cases";

function nowISO() {
  return new Date().toISOString();
}

for (const caseId of fs.readdirSync(CASES_DIR)) {
  const caseDir = path.join(CASES_DIR, caseId);
  if (!fs.statSync(caseDir).isDirectory()) continue;

  const timelinePath = path.join(caseDir, "timeline.json");
  const contextoPath = path.join(caseDir, "docs", "contexto.md");
  const memoryPath = path.join(caseDir, "memory.jsonl");

  if (!fs.existsSync(timelinePath) || !fs.existsSync(contextoPath)) continue;

  // Si ya hay memoria con contenido, no pisamos.
  const existing = fs.existsSync(memoryPath) ? fs.readFileSync(memoryPath, "utf-8").trim() : "";
  if (existing.length > 0) {
    console.log(`⏭️  ${caseId}: memory ya tiene contenido, no se toca`);
    continue;
  }

  const timeline = JSON.parse(fs.readFileSync(timelinePath, "utf-8"));
  const events = timeline.events || [];
  const first = events[0];
  const last = events[events.length - 1];

  const cap0 = {
    chapter: 0,
    text:
      `Arranque del caso "${caseId}".\n` +
      `Aquí todavía no hay capítulos generados: esto es la semilla narrativa.\n` +
      `El sistema parte del contexto y de la serie temporal para continuar sin contradecir los datos.`,
    summary: `Semilla narrativa del caso ${caseId}.`,
    facts: [
      `case_id=${caseId}`,
      first?.date ? `timeline_inicio=${first.date}` : "timeline_inicio=desconocido",
      last?.date ? `timeline_fin=${last.date}` : "timeline_fin=desconocido",
      `num_eventos=${events.length}`
    ],
    created_at: nowISO()
  };

  fs.writeFileSync(memoryPath, JSON.stringify(cap0) + "\n", "utf-8");
  console.log(`✅ ${caseId}: memory.jsonl sembrado con capítulo 0`);
}

console.log("🏁 Seed completado");
