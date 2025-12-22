export class RagStore {
    constructor({ embed, upsertMany, query }) {
      this.embed = embed;           // (text) => vector
      this.upsertMany = upsertMany; // (items[]) => void
      this.query = query;           // ({vector, filter, topK}) => results[]
    }
  }
  