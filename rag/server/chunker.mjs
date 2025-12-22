export function chunkText(text, { maxChars = 1800, overlapChars = 200 } = {}) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
      const end = Math.min(i + maxChars, text.length);
      const chunk = text.slice(i, end);
      chunks.push(chunk.trim());
      i = end - overlapChars;
      if (i < 0) i = 0;
      if (end === text.length) break;
    }
    return chunks.filter(Boolean);
  }
  