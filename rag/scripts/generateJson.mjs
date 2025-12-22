import fs from "node:fs/promises";
import path from "node:path";

/**
 * Genera un index.json con los case_id disponibles.
 * Por defecto: lista los CSV en rag/out/*.csv y escribe rag/out/index.json
 *
 * Uso:
 *   node rag/scripts/buildIndex.mjs
 *
 * Opcional (si quieres pasar rutas):
 *   node rag/scripts/buildIndex.mjs <outDir> <indexFileName>
 *   node rag/scripts/buildIndex.mjs rag/out index.json
 */
async function buildIndex(outDir, indexFileName = "index.json") {
  await fs.mkdir(outDir, { recursive: true });

  const files = await fs.readdir(outDir);

  // case_id = nombre de archivo sin extensión .csv
  const caseIds = files
    .filter((f) => f.toLowerCase().endsWith(".csv"))
    .map((f) => f.slice(0, -4))
    .filter((id) => id && id.toLowerCase() !== "chapters") // por si existiera un global
    .sort((a, b) => a.localeCompare(b, "es"));

  const indexPath = path.join(outDir, indexFileName);

  const payload = {
    generated_at: new Date().toISOString(),
    count: caseIds.length,
    cases: caseIds
  };

  await fs.writeFile(indexPath, JSON.stringify(payload, null, 2), "utf-8");

  console.log(`✅ index generado: ${indexPath}`);
  console.log(`   casos: ${caseIds.length}`);
}

const REPO_ROOT = path.resolve(process.cwd());
const defaultOutDir = path.join(REPO_ROOT, "rag", "out");

const outDirArg = process.argv[2];
const nameArg = process.argv[3];

const outDir = outDirArg ? path.resolve(REPO_ROOT, outDirArg) : defaultOutDir;
const indexName = nameArg || "index.json";

buildIndex(outDir, indexName).catch((e) => {
  console.error("❌ Error generando index.json:", e);
  process.exit(1);
});
