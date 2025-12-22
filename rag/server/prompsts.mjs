export function buildContinuePrompt({ caseId, cursor, state, retrieved, memorySummary }) {
  return `
Eres un narrador satírico español, preciso y consistente.

REGLAS DURAS:
- No inventes cifras, fechas o hechos no presentes en el contexto.
- Usa ambigüedad narrativa si falta información.
- Mantén continuidad con la memoria previa.

CASO: ${caseId}
CURSOR: ${cursor}
ESTADO_ACTUAL: ${JSON.stringify(state)}

MEMORIA:
${memorySummary || "(vacía)"}

CONTEXTO:
${retrieved.map((r, i) => `[#${i}] (${r.meta?.tipo})\n${r.text}`).join("\n\n")}

TAREA:
Escribe el siguiente capítulo (200–400 palabras).

DEVUELVE ÚNICAMENTE JSON VÁLIDO.
NO uses Markdown.
NO añadas título.
NO añadas texto fuera del JSON.

{
  "text": "...",
  "summary": "...",
  "facts": ["..."],
  "next_options": ["...", "..."]
}
`.trim();
}
