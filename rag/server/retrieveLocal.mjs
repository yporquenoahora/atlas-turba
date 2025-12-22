// rag/server/retrieveLocal.mjs
import fs from "node:fs/promises";
import path from "node:path";

async function safeRead(p) {
  try { return await fs.readFile(p, "utf-8"); }
  catch { return ""; }
}

export async function retrieveLocal({ caseDir, cursor, topK = 8 }) {
  const docsDir = path.join(caseDir, "docs");

  const contexto = await safeRead(path.join(docsDir, "contexto.md"));
  const reglas = await safeRead(path.join(docsDir, "reglas_mundo.md"));
  const personajes = await safeRead(path.join(docsDir, "personajes.md"));

  const timelineRaw = await safeRead(path.join(caseDir, "timeline.json"));
  const timeline = timelineRaw ? JSON.parse(timelineRaw) : { events: [] };
  const events = timeline.events || [];

  const window = 5;
  const start = Math.max(0, cursor - window);
  const end = Math.min(events.length, cursor + window + 1);

  const timelineSlice = events.slice(start, end);
  const timelineChunk =
`TIMELINE (ventana t=${start}..${end - 1})
${timelineSlice.map(e => `t=${e.t} date=${e.date} estado=${JSON.stringify(e.estado)}`).join("\n")}`;

  const case_id = path.basename(caseDir);

  const chunks = [
    { id: "doc_contexto", text: contexto, meta: { tipo: "doc", case_id } },
    { id: "doc_reglas", text: reglas, meta: { tipo: "doc", case_id } },
    { id: "doc_personajes", text: personajes, meta: { tipo: "doc", case_id } },
    { id: `timeline_${start}_${end}`, text: timelineChunk, meta: { tipo: "timeline", case_id, t_min: start, t_max: end - 1 } }
  ].filter(c => c.text && c.text.trim().length);

  return chunks.slice(0, topK);
}
