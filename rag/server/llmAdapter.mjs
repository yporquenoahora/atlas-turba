// rag/server/llmAdapter.mjs
export async function generateJsonWithLLM({ prompt }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);
  const MAX_RETRIES = 2;

  try {
    const res = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: "llama3.1:8b",
        stream: false,
        options: { temperature: 0.1 },
        messages: [
          {
            role: "system",
            content:
              "Devuelve ÚNICAMENTE JSON válido. Sin markdown, sin explicaciones, sin texto extra. " +
              "Si no puedes cumplir, devuelve exactamente: " +
              "{\"text\":\"\",\"summary\":\"\",\"facts\":[],\"next_options\":[]}"
          },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Ollama HTTP ${res.status}: ${t}`);
    }

    const data = await res.json();
    const txt = (data.message?.content || "").trim();

    if (!txt) throw new Error("Ollama devolvió respuesta vacía");

    // A veces lo envuelve en ```json ... ```
    const cleaned = txt
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("El modelo no devolvió JSON. Inicio:\n" + cleaned.slice(0, 500));
    }

    return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
  } catch (e) {
    throw new Error(`generateJsonWithLLM: ${e.name || "Error"}: ${e.message || e}`);
  } finally {
    clearTimeout(timeout);
  }
}
