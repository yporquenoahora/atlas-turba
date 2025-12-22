export function buildContinuePrompt({ caseId, cursor, state, retrieved, memorySummary }) {
    return `
  Eres narrador satírico español. Mantén continuidad y no contradigas hechos.
  
  REGLAS DURAS:
  - No inventes cifras, fechas, nombres o pruebas si no aparecen en CONTEXTO.
  - Si falta información, usa ambigüedad narrativa ("se rumorea", "nadie confirma") sin concretar datos.
  - Conserva el canon del caso.
  
  CASO: ${caseId}
  CURSOR_TIMELINE: ${cursor}
  ESTADO_ACTUAL: ${JSON.stringify(state)}
  
  MEMORIA_RESUMIDA:
  ${memorySummary || "(vacía)"}
  
  CONTEXTO (RAG):
  ${retrieved.map((r, idx) => `[#${idx}] (${r.meta.tipo}) ${r.text}`).join("\n\n")}
  
  TAREA:
  Escribe el siguiente capítulo (200-400 palabras) continuando desde el estado actual.
  Devuelve SIEMPRE JSON con estas claves:
  {
    "text": "...",
    "summary": "...",
    "facts": ["..."],
    "next_options": ["...", "..."]
  }
  `.trim();
  }
  