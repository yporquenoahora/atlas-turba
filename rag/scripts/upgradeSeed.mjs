import fs from "node:fs";
import path from "node:path";

const JSON_DIR = "src/data/json";
const CASES_DIR = "rag/cases";

function nowISO() {
  return new Date().toISOString();
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function readJsonlLines(p) {
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, "utf-8").trim();
  if (!raw) return [];
  return raw.split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

for (const file of fs.readdirSync(JSON_DIR)) {
  if (!file.endsWith(".json")) continue;

  const data = readJSON(path.join(JSON_DIR, file));
  const caseId = data.case_id;

  const caseDir = path.join(CASES_DIR, caseId);
  const timelinePath = path.join(caseDir, "timeline.json");
  const memoryPath = path.join(caseDir, "memory.jsonl");

  if (!fs.existsSync(caseDir) || !fs.existsSync(timelinePath) || !fs.existsSync(memoryPath)) continue;

  const mem = readJsonlLines(memoryPath);

  // Solo actualizamos si está vacío o solo tiene capítulo 0
  const hasOnlySeed = mem.length === 0 || (mem.length === 1 && mem[0].chapter === 0);
  if (!hasOnlySeed) {
    console.log(`⏭️  ${caseId}: ya tiene capítulos (>0), no se toca`);
    continue;
  }

  const timeline = readJSON(timelinePath);
  const events = timeline.events || [];
  const first = events[0];
  const last = events[events.length - 1];

  const meta = data.meta || {};
  const ejemplo = meta.ejemplo ?? caseId;
  const categoria = meta.categoria ?? "desconocida";
  const tipoVictima = meta.tipo_victima ?? "desconocido";
  const metafora = meta.metafora_dominante ?? "sin_metafora";
  const distorsion = meta.mecanismo_de_distorsion ?? "sin_mecanismo";
  const canal = meta.canal_difusion ?? "sin_canal";
  const desc = meta.breve_descripcion ?? "";

  const seedText =
`En este caso, el colectivo "${ejemplo}" entra en escena como si el mundo ya hubiese decidido el chiste antes de escuchar la historia: ${desc}

La metáfora dominante es una **${metafora}**: no porque haya barrotes físicos, sino porque el relato encierra a la víctima en una etiqueta que se repite hasta parecer “sentido común”.
El mecanismo que lo hace posible es la **${distorsion}**, y el canal preferido es **${canal}**: la risa como atajo cognitivo… y como disfraz de la crueldad.

A partir de aquí, la historia avanzará siguiendo la serie temporal: cuando sube el contagio, el rumor se pega; cuando sube la resistencia, aparecen grietas; si aparece contra_flujo, alguien devuelve el golpe (con datos, con sátira, o con simple cansancio).`;

  const cap0 = {
    chapter: 0,
    text: seedText,
    summary: `Semilla narrativa: ${ejemplo} como caso de ${categoria} con metáfora "${metafora}".`,
    facts: [
      `case_id=${caseId}`,
      `ejemplo=${ejemplo}`,
      `categoria=${categoria}`,
      `tipo_victima=${tipoVictima}`,
      `metafora_dominante=${metafora}`,
      `mecanismo_de_distorsion=${distorsion}`,
      `canal_difusion=${canal}`,
      first?.date ? `timeline_inicio=${first.date}` : "timeline_inicio=desconocido",
      last?.date ? `timeline_fin=${last.date}` : "timeline_fin=desconocido",
      `num_eventos=${events.length}`
    ],
    created_at: nowISO()
  };

  fs.writeFileSync(memoryPath, JSON.stringify(cap0) + "\n", "utf-8");
  console.log(`✅ ${caseId}: capítulo 0 mejorado`);
}

console.log("🏁 Upgrade seed completado");
