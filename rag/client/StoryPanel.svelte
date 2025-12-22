<script>
    export let caseId;
    export let cursor;
  
    let loading = false;
    let chapter = null;
  
    async function continuar() {
      loading = true;
      const res = await fetch("/api/story/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId, cursor })
      });
      chapter = await res.json();
      loading = false;
    }
  </script>
  
  <div class="story">
    <button on:click={continuar} disabled={loading}>
      {loading ? "Generando..." : "Continuar historia"}
    </button>
  
    {#if chapter}
      <article>
        <h3>Capítulo</h3>
        <p>{chapter.text}</p>
  
        <h4>Resumen</h4>
        <p>{chapter.summary}</p>
  
        <h4>Hechos nuevos (canon)</h4>
        <ul>
          {#each chapter.facts as f}
            <li>{f}</li>
          {/each}
        </ul>
  
        <h4>Opciones</h4>
        <ol>
          {#each chapter.next_options as o}
            <li>{o}</li>
          {/each}
        </ol>
  
        <h4>Fuentes usadas</h4>
        <ul>
          {#each chapter.sources as s}
            <li>{s.tipo} · {s.id}</li>
          {/each}
        </ul>
      </article>
    {/if}
  </div>
  