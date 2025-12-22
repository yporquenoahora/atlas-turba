// rag/server/ragStoreFactory.chroma.mjs
import { embedText } from "./embeddings.mjs";
import { getChromaCollection, upsertChunksChroma, queryChroma } from "./db.chroma.mjs";

export async function createRagStore() {
  const col = await getChromaCollection();

  return {
    embed: embedText,
    async upsertMany(items) {
      const rows = [];
      for (const it of items) {
        const embedding = await embedText(it.text);
        rows.push({ id: it.id, text: it.text, meta: it.meta, embedding });
      }
      await upsertChunksChroma(col, rows);
    },
    async query({ vector, filter, topK }) {
      const case_id = filter?.case_id;
      return await queryChroma(col, vector, { case_id, topK });
    }
  };
}
