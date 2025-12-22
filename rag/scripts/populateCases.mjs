import fs from "node:fs";
import path from "node:path";

const JSON_DIR = "src/data/json";
const RAG_CASES_DIR = "rag/cases";

for (const file of fs.readdirSync(JSON_DIR)) {
  if (!file.endsWith(".json")) continue;

  const raw = fs.readFileSync(path.join(JSON_DIR, file), "utf-8");
  const data = JSON.parse(raw);

  const caseId = data.case_id;
  const caseDir = path.join(RAG_CASES_DIR, caseId);
  const docsDir = path.join(caseDir, "docs");

  console.log(`🧠 Poblando caso: ${caseId}`);

  // ---- contexto.md ----
  fs.writeFileSync(
    path.join(docsDir, "contexto.md"),
`# ${data.meta.ejemplo}

**Categoría:** ${data.meta.categoria}  
**Tipo de víctima:** ${data.meta.tipo_victima}

## Descripción
${data.meta.breve_descripcion}

## Metáfora dominante
${data.meta.metafora_dominante}

## Mecanismo de distorsión
${data.meta.mecanismo_de_distorsion}

## Canal de difusión
${data.meta.canal_difusion}
`
  );

  // ---- reglas_mundo.md ----
  fs.writeFileSync(
    path.join(docsDir, "reglas_mundo.md"),
`# Reglas del mundo narrativo

- El caso se describe como fenómeno colectivo.
- Metáfora dominante: ${data.meta.metafora_dominante}
- Distorsión principal: ${data.meta.mecanismo_de_distorsion}
- Canal predominante: ${data.meta.canal_difusion}
- El tono puede ser irónico, pero los datos no se inventan.
`
  );

  // ---- personajes.md ----
  fs.writeFileSync(
    path.join(docsDir, "personajes.md"),
`# Entidades narrativas

- Colectivo estigmatizado: ${data.meta.ejemplo}
- Masa amplificadora
- Contra-flujo
- Canales de difusión
`
  );

  // ---- timeline.json ----
  const timeline = {
    case_id: caseId,
    events: data.series.map((d, i) => ({
      t: i,
      date: d.date,
      estado: {
        engagement: d.engagement,
        contagio: d.contagio,
        pluralidad: d.pluralidad,
        resistencia: d.resistencia,
        contra_flujo: d.contra_flujo
      }
    }))
  };

  fs.writeFileSync(
    path.join(caseDir, "timeline.json"),
    JSON.stringify(timeline, null, 2)
  );
}

console.log("✅ Casos poblados correctamente");
