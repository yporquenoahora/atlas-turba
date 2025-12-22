// rag/server/db.lancedb.mjs
import * as lancedb from "lancedb";
import path from "node:path";
import fs from "node:fs";

const DB_DIR = path.join(process.cwd(), "rag", "index", "lancedb");
const TABLE_NAME = "chunks";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export async function getLanceDB() {
  ensureDir(DB_DIR);
  const db = await lancedb.connect(DB_DIR);
  return db;
}

export async function ensureTable(db, vectorDim = 1536) {
  // Esquema flexible: id, text, meta(json), embedding(vector)
  // LanceDB infiere tipos bien, pero conviene crear si no existe.
  const tables = await db.tableNames();
  if (!tables.includes(TABLE_NAME)) {
    // Creamos con una fila “dummy” para fijar dimensión vectorial.
    const dummy = [{
      id: "__init__",
      text: "init",
      meta: { case_id: "__init__", tipo: "init" },
      embedding: new Array(vectorDim).fill(0)
    }];
    const table = await db.createTable(TABLE_NAME, dummy);
    // Borramos dummy
    await table.delete(`id = "__init__"`);
    return table;
  }
  return await db.openTable(TABLE_NAME);
}

export async function upsertChunksLance(table, rows) {
  // rows: [{id,text,meta,embedding}]
  await table.add(rows);
}

export async function queryLance(table, embedding, { case_id, topK = 10 } = {}) {
  let q = table.search(embedding).limit(topK);
  if (case_id) q = q.where(`meta.case_id = "${case_id}"`);
  const res = await q.toArray();

  // Normalizamos formato
  return res.map((r) => ({
    id: r.id,
    text: r.text,
    meta: r.meta,
    score: r._distance ?? null
  }));
}
