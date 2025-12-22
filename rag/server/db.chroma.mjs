// rag/server/db.chroma.mjs
import { ChromaClient } from "chromadb";

const COLLECTION = "chunks";

export async function getChromaCollection() {
  const client = new ChromaClient({ path: "http://localhost:8000" });
  // si no existe, la crea
  const col = await client.getOrCreateCollection({ name: COLLECTION });
  return col;
}

export async function upsertChunksChroma(col, rows) {
  // rows: [{id, text, meta, embedding}]
  await col.upsert({
    ids: rows.map(r => r.id),
    documents: rows.map(r => r.text),
    metadatas: rows.map(r => r.meta),
    embeddings: rows.map(r => r.embedding)
  });
}

export async function queryChroma(col, embedding, { case_id, topK = 10 } = {}) {
  const res = await col.query({
    queryEmbeddings: [embedding],
    nResults: topK,
    where: case_id ? { case_id } : undefined
  });

  const docs = res.documents?.[0] ?? [];
  const ids = res.ids?.[0] ?? [];
  const metas = res.metadatas?.[0] ?? [];
  const dists = res.distances?.[0] ?? [];

  return docs.map((text, i) => ({
    id: ids[i],
    text,
    meta: metas[i],
    score: dists[i]
  }));
}
