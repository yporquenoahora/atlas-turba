// rag/server/ragStoreFactory.mjs
import { embedText, EMBEDDING_DIM } from "./embeddings.mjs";
import { getLanceDB, ensureTable, upsertChunksLance, queryLance } from "./db.lancedb.mjs";

export async function createRagStore() {
  const db = await getLanceDB();
  const table = await ensureTable(db, EMBEDDING_DIM);

  return {
    embed: embedText,
    async upsertMany(items) {
      // items: [{id, text, meta}]
      const rows = [];
      for (const it of items) {
        const embedding = await embedText(it.text);
        rows.push({ id: it.id, text: it.text, meta: it.meta, embedding });
      }
      await upsertChunksLance(table, rows);
    },
    async query({ vector, filter, topK }) {
      const case_id = filter?.case_id;
      return await queryLance(table, vector, { case_id, topK });
    }
  };
}
