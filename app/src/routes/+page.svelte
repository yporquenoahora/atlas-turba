<script>
    let caseId = "abogados";
    let cursor = 0;
    let loading = false;
    let result = null;
    let error = null;
  
    async function continuar() {
      loading = true;
      error = null;
  
      try {
        const res = await fetch("/api/story/continue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            case_id: caseId,
            cursor
          })
        });
  
        if (!res.ok) {
          const e = await res.json();
          throw new Error(e.error || "Error desconocido");
        }
  
        result = await res.json();
      } catch (e) {
        error = e.message;
      } finally {
        loading = false;
      }
    }
  </script>
  
  <h1>Atlas de Turbas · Narrativa</h1>
  
  <label>
    Caso:
    <input bind:value={caseId} />
  </label>
  
  <label>
    Cursor timeline:
    <input type="number" min="0" bind:value={cursor} />
  </label>
  
  <button on:click={continuar} disabled={loading}>
    {loading ? "Generando…" : "Continuar historia"}
  </button>
  
  {#if error}
    <p style="color:red">❌ {error}</p>
  {/if}
  
  {#if result}
    <hr />
  
    <h2>Capítulo {result.chapter}</h2>
    <p>{result.text}</p>
  
    <h3>Resumen</h3>
    <p>{result.summary}</p>
  
    <h3>Hechos (canon)</h3>
    <ul>
      {#each result.facts as f}
        <li>{f}</li>
      {/each}
    </ul>
  
    <h3>Opciones</h3>
    <ol>
      {#each result.next_options as o}
        <li>{o}</li>
      {/each}
    </ol>
  
    <h3>Fuentes usadas</h3>
    <ul>
      {#each result.sources as s}
        <li>{s.tipo} · {s.id}</li>
      {/each}
    </ul>
  {/if}
  