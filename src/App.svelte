<script>
  // @ts-nocheck

  import {
    filtros,
    ui,
    filtrados,
    conteosFiltrados,
    nubes,
    graphData,
    categoriasUnicas,
    metaforasUnicas,
    mecanismosUnicos,
    canalesUnicos,
    estadoPerfil,
    ataqueActual,
    ataqueIndex,
  } from "./stores/store.js";

  import { COLORES_TIPO } from "./lib/theme.js";

  import ConceptCloud from "./lib/ConceptCloud.svelte";
  import BarChart from "./lib/BarChart.svelte";
  import ForceConceptGraph from "./lib/ForceConceptGraph.svelte";
  import Legend from "./lib/Legend.svelte";
  import MapaMetaforico from "./lib/MapaMetaforico.svelte";

  import { continentesConfig, perfilesPersonaje } from "./stores/store.js";
  import {
    perfilActivo,
    ataquesPerfil,
    ratioSupervivencia,
    ataquesPorContinente,
  } from "./stores/store.js";
  import MapaProcreate from "./lib/MapaProcreate.svelte";

 function seleccionarPerfil(id) {
  const perfil = perfilesPersonaje.find((p) => p.id === id);
  perfilActivo.set(id);
  ataqueIndex.set(0); // reiniciamos replay

  // ⚠️ FASE SEGURA:
  // NO tocamos categoria/canal/metafora/mecanismo
  // solo tocamos el texto de búsqueda
  if (perfil?.presetFiltros) {
    const pf = perfil.presetFiltros;
    setFiltro({
      texto: pf.texto ?? ""   // suponiendo que tu filtro se llama 'texto' o 'busqueda'
    });
  }
}

  
  // ==== helpers para actualizar STORES ====

  function setFiltro(partial) {
    filtros.update((f) => ({ ...f, ...partial }));
  }

  function setUi(partial) {
    ui.update((u) => ({ ...u, ...partial }));
  }

  function handleSelectConcept(event) {
    const { type, key } = event.detail;
    filtros.update((f) => {
      if (type === "cat") {
        return { ...f, categoria: f.categoria === key ? "todas" : key };
      } else if (type === "meta") {
        return { ...f, metafora: f.metafora === key ? "todas" : key };
      } else if (type === "mec") {
        return { ...f, mecanismo: f.mecanismo === key ? "todos" : key };
      } else if (type === "canal") {
        return { ...f, canal: f.canal === key ? "todos" : key };
      }
      return f;
    });
  }

  function handleFocusTipo(event) {
    const { type } = event.detail;
    if (type === "metaforas") setUi({ nubeVista: "metaforas" });
    if (type === "categorias") setUi({ nubeVista: "categorias" });
    if (type === "mecanismos") setUi({ nubeVista: "mecanismos" });
    if (type === "canales") setUi({ nubeVista: "canales" });
  }

  // clic en un tag de la nube (usa la pestaña activa del store ui)
  function handleToggleTag(evt) {
    const { nombre } = evt.detail;
    const vista = $ui.nubeVista;

    filtros.update((f) => {
      if (vista === "metaforas") {
        return { ...f, metafora: f.metafora === nombre ? "todas" : nombre };
      } else if (vista === "categorias") {
        return { ...f, categoria: f.categoria === nombre ? "todas" : nombre };
      } else if (vista === "mecanismos") {
        return { ...f, mecanismo: f.mecanismo === nombre ? "todos" : nombre };
      } else if (vista === "canales") {
        return { ...f, canal: f.canal === nombre ? "todos" : nombre };
      }
      return f;
    });
  }

  // ==== derivados (solo lectura) ====

  // resumen textual de filtros activos
  $: resumenFiltros = `
    ${$filtros.categoria !== "todas" ? `Categoría: ${$filtros.categoria}` : ""}
    ${$filtros.metafora !== "todas" ? ` · Metáfora: ${$filtros.metafora}` : ""}
    ${$filtros.mecanismo !== "todos" ? ` · Mecanismo: ${$filtros.mecanismo}` : ""}
    ${$filtros.canal !== "todos" ? ` · Canal: ${$filtros.canal}` : ""}
  `.trim();

  // datos para gráficas
  $: dataChartCategorias = $conteosFiltrados.categorias.map((d) => ({
    label: d.nombre,
    value: d.valor,
  }));
  $: dataChartMetaforas = $conteosFiltrados.metaforas.map((d) => ({
    label: d.nombre,
    value: d.valor,
  }));
  $: dataChartCanales = $conteosFiltrados.canales.map((d) => ({
    label: d.nombre,
    value: d.valor,
  }));

  // nubes según pestaña activa
  $: nubeActualBase =
    $ui.nubeVista === "metaforas"
      ? $nubes.nubeMetaforas
      : $ui.nubeVista === "categorias"
        ? $nubes.nubeCategorias
        : $ui.nubeVista === "mecanismos"
          ? $nubes.nubeMecanismos
          : $nubes.nubeCanales;

  $: nubeActual = nubeActualBase.filter((item) =>
    item.nombre
      .toLowerCase()
      .includes(($ui.busquedaTag || "").toLowerCase().trim()),
  );

  let continenteActivoId = null;

  function handleSelectContinente(event) {
    const { id } = event.detail;
    continenteActivoId = id;
  }
  $: console.log("ataques perfil: ", $ataquesPerfil, $perfilActivo);
  $: resumenContinenteActivo = $ataquesPorContinente.find(
    (c) => c.continenteId === continenteActivoId,
  );

  // Controles del replay
  function siguienteAtaque() {
    ataqueIndex.update((i) => {
      if (!$ataquesPerfil.total) return 0;
      return (i + 1) % $ataquesPerfil.total;
    });
  }

  function anteriorAtaque() {
    ataqueIndex.update((i) => {
      if (!$ataquesPerfil.total) return 0;
      const total = $ataquesPerfil.total;
      return (i - 1 + total) % total;
    });
  }

  $: console.log($ataqueActual);

  function resetReplay() {
    ataqueIndex.set(0);
  }

  $: ataquesIds = new Set(
    $ataquesPerfil.ataques
      ? $ataquesPerfil.ataques.map((a) => a.id).filter(Boolean)
      : [],
  );
</script>

<main class="app">
  <header class="header">
    <h1>Atlas de la Turba Moderna</h1>
    <p>
      Explora ejemplos de demonización, linchamiento simbólico y monstruos
      públicos usando nubes de conceptos y gráficos.
    </p>
  </header>

  <section class="panel panel-perfil">
    <h2>Simulador de personaje</h2>

    <div class="perfiles">
      {#each perfilesPersonaje as p}
        <button
          type="button"
          class:selected={$perfilActivo === p.id}
          on:click={() => seleccionarPerfil(p.id)}
        >
          {p.nombre}
        </button>
      {/each}
    </div>

    {#if $ataquesPerfil.perfil}
      <p class="resumen-perfil">
        {$ataquesPerfil.perfil.nombre} tiene
        <strong>{$ataquesPerfil.perfil.vidas ?? 3} vidas</strong> y recibe
        <strong> {$ataquesPerfil.total} ataques</strong> en la vista actual
        {#if $ataquesPerfil.modo === "arcade"}
          <span style="opacity:0.8;">
            &nbsp;(modo arcade: todos los ejemplos filtrados cuentan como
            ataque).
          </span>
          {#each $ataquesPerfil.ataques as atak}
            <p>{atak.descripcion}</p>
          {/each}
        {/if}
      </p>

      {#if $estadoPerfil === "sin_datos"}
        <p class="resumen-perfil">
          Por ahora no hay datos en la combinación de filtros actual.
        </p>
      {:else}
        <div class="barra-vida">
          <div
            class="barra-vida-fill"
            style={`--vida:${Math.round(($ratioSupervivencia || 0) * 100)}%;`}
          ></div>
        </div>

        <p class="resumen-perfil">
          Estado:
          {#if $estadoPerfil === "resiste"}
            <strong>resiste</strong> (aguanta bien la campaña).
          {:else if $estadoPerfil === "tocado"}
            <strong>tocado</strong> (la narrativa empieza a hacer mella).
          {:else if $estadoPerfil === "critico"}
            <strong>crítico</strong> (cualquier ataque extra puede rematarlo).
          {:else}
            <strong>devorado</strong> (la turba se lo ha comido mediáticamente).
          {/if}
        </p>
      {/if}
    {:else}
      <p class="resumen-perfil">
        Elige un personaje para ver cómo le afecta la turba en el mapa y en el
        atlas.
      </p>
    {/if}
    <section class="panel panel-replay">
      <h2>Replay de ataques</h2>

      {#if $ataquesPerfil.perfil && $ataquesPerfil.total > 0}
        <p class="replay-info">
          Ataque {$ataqueActual?.index + 1} de {$ataqueActual?.total}
          {#if $ataquesPerfil.modo === "arcade"}
            · modo arcade
          {/if}
        </p>
        <!-- resto igual -->
      {:else if $ataquesPerfil.perfil}
        <p class="replay-info">
          No hay ataques registrados para este perfil porque no hay datos en
          esta vista.
        </p>
      {:else}
        <p class="replay-info">
          Elige un personaje para activar el replay de ataques.
        </p>
      {/if}
    </section>

    {#if resumenContinenteActivo}
      <p class="resumen-perfil">
        En <strong>{resumenContinenteActivo.label}</strong> este perfil recibe
        <strong>{resumenContinenteActivo.total}</strong> ataques.
      </p>
    {/if}
  </section>

  <h1>Mapa de la turba</h1>
  <MapaProcreate
    on:selectContinente={handleSelectContinente}
    continenteActivo={continenteActivoId}
  />
  <MapaMetaforico
    continentes={continentesConfig}
    ejemplos={$filtrados}
    ataquesPerfil={$ataquesPerfil}
    ataqueActualId={$ataqueActual ? $ataqueActual.ataque.id : null}
  />

  <section class="layout">
    <!-- Columna izquierda: filtros “clásicos” -->
    <aside class="panel filtros">
      <h2>Filtros básicos</h2>

      <label>
        Categoría
        <select
          bind:value={$filtros.categoria}
          on:change={(e) => setFiltro({ categoria: e.target.value })}
        >
          <option value="todas">todas</option>
          {#each categoriasUnicas as c}
            <option value={c}>{c}</option>
          {/each}
        </select>
      </label>

      <label>
        Metáfora dominante
        <select
          bind:value={$filtros.metafora}
          on:change={(e) => setFiltro({ metafora: e.target.value })}
        >
          <option value="todas">todas</option>
          {#each metaforasUnicas as m}
            <option value={m}>{m}</option>
          {/each}
        </select>
      </label>

      <label>
        Mecanismo
        <select
          bind:value={$filtros.mecanismo}
          on:change={(e) => setFiltro({ mecanismo: e.target.value })}
        >
          <option value="todos">todos</option>
          {#each mecanismosUnicos as m}
            <option value={m}>{m}</option>
          {/each}
        </select>
      </label>

      <label>
        Canal
        <select
          bind:value={$filtros.canal}
          on:change={(e) => setFiltro({ canal: e.target.value })}
        >
          <option value="todos">todos</option>
          {#each canalesUnicos as c}
            <option value={c}>{c}</option>
          {/each}
        </select>
      </label>

      <label>
        Buscar texto
        <input
          type="text"
          placeholder="Ej: tiburones, Sálvame, científicos..."
          bind:value={$filtros.texto}
          on:input={(e) => setFiltro({ texto: e.target.value })}
        />
      </label>

      <p class="resumen">
        {$filtrados.length} ejemplos coinciden con la combinación actual.
      </p>
    </aside>

    <!-- Columna derecha: nubes + gráficos + tarjetas -->
    <section class="col-derecha">
      <!-- Nubes de conceptos -->
      <section class="panel panel-nube">
        <div class="tabs">
          <button
            class:selected={$ui.nubeVista === "metaforas"}
            style={`--tab-color: ${COLORES_TIPO.metaforas}`}
            on:click={() => setUi({ nubeVista: "metaforas", busquedaTag: "" })}
          >
            Metáforas
          </button>
          <button
            class:selected={$ui.nubeVista === "categorias"}
            style={`--tab-color: ${COLORES_TIPO.categorias}`}
            on:click={() => setUi({ nubeVista: "categorias", busquedaTag: "" })}
          >
            Categorías
          </button>
          <button
            class:selected={$ui.nubeVista === "mecanismos"}
            style={`--tab-color: ${COLORES_TIPO.mecanismos}`}
            on:click={() => setUi({ nubeVista: "mecanismos", busquedaTag: "" })}
          >
            Mecanismos
          </button>
          <button
            class:selected={$ui.nubeVista === "canales"}
            style={`--tab-color: ${COLORES_TIPO.canales}`}
            on:click={() => setUi({ nubeVista: "canales", busquedaTag: "" })}
          >
            Canales
          </button>
        </div>

        <div class="nube-header">
          <p class="nube-titulo">
            {#if $ui.nubeVista === "metaforas"}
              Metáforas dominantes
            {:else if $ui.nubeVista === "categorias"}
              Categorías temáticas
            {:else if $ui.nubeVista === "mecanismos"}
              Mecanismos de distorsión
            {:else}
              Canales de difusión
            {/if}
          </p>
          <input
            type="text"
            placeholder="Filtrar tags de esta nube..."
            class="input-tag"
            value={$ui.busquedaTag}
            on:input={(e) => setUi({ busquedaTag: e.target.value })}
          />
        </div>

        <ConceptCloud items={nubeActual} on:toggle={handleToggleTag} />
      </section>

      <section class="panel" style="padding: 0.5rem;">
        <div class="resumen-filtros">
          {resumenFiltros || "Sin filtros activos"}
        </div>
        <h2 style="font-size:0.9rem; margin:0 0 0.3rem 0;">
          Mapa de conexiones entre familias de conceptos
        </h2>

        <Legend
          items={[
            {
              label: "Categorías",
              type: "categorias",
              color: COLORES_TIPO.categorias,
            },
            {
              label: "Metáforas",
              type: "metaforas",
              color: COLORES_TIPO.metaforas,
            },
            {
              label: "Mecanismos",
              type: "mecanismos",
              color: COLORES_TIPO.mecanismos,
            },
            { label: "Canales", type: "canales", color: COLORES_TIPO.canales },
          ]}
          on:focusTipo={handleFocusTipo}
        />

        <div class="slider">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label>Mínimo de casos: {$ui.minCount}</label>
          <input
            type="range"
            min="1"
            max="20"
            value={$ui.minCount}
            on:input={(e) => setUi({ minCount: Number(e.target.value) })}
          />
        </div>

        <ForceConceptGraph
          graphData={$graphData}
          on:selectConcept={handleSelectConcept}
        />
      </section>

      <section class="panel" style="padding: 0.5rem;">
        <!-- Gráficos -->
        <section class="grid-charts">
          <BarChart
            titulo="Top categorías en el filtro actual"
            data={$conteosFiltrados.categorias}
            maxItems={8}
          />
          <BarChart
            titulo="Top metáforas en el filtro actual"
            data={$conteosFiltrados.metaforas}
            maxItems={8}
          />
          <BarChart
            titulo="Top canales en el filtro actual"
            data={$conteosFiltrados.canales}
            maxItems={6}
          />
        </section>

        <!-- Lista de resultados -->
        <section class="panel panel-lista">
          <h2>Ejemplos detallados</h2>

          {#if $filtrados.length === 0}
            <p class="vacio">
              No se han encontrado ejemplos con esta combinación.
            </p>
          {:else}
            <div class="grid-ejemplos">
              {#each $filtrados as d}
                <article class="card" class:ataque={ataquesIds.has(d.id)}>
                  <h3>{d.ejemplo}</h3>

                  <p class="tags">
                    <span>{d.categoria}</span> ·
                    <span>{d.tipo_victima}</span> ·
                    <span>Metáfora: {d.metafora_dominante}</span> ·
                    <span>Canal: {d.canal}</span>
                  </p>

                  <p class="desc">{d.descripcion}</p>

                  <p class="mec">
                    Mecanismo: <strong>{d.mecanismo}</strong>
                  </p>
                </article>
              {/each}
            </div>
          {/if}
        </section>
      </section>
    </section>
  </section>
</main>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }

  :global(body) {
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    background: #020617;
    color: #f9fafb;
  }

  #app {
    max-width: 1280px;
    width: 100%;
    margin: 0 auto;
    padding: 1.5rem;
    box-sizing: border-box;
  }

  .header h1 {
    margin: 0;
    font-size: 1.9rem;
  }

  .header p {
    margin-top: 0.4rem;
    max-width: 48rem;
    color: #e5e7eb;
    font-size: 0.95rem;
  }

  .layout {
    margin-top: 1.5rem;
    display: grid;
    grid-template-columns: minmax(260px, 280px) minmax(0, 1fr);
    gap: 1.5rem;
  }

  @media (max-width: 900px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }

  .panel {
    background: #020617;
    border-radius: 0.75rem;
    border: 1px solid #1f2937;
  }

  .filtros {
    padding: 0.9rem;
  }

  .filtros h2 {
    margin-top: 0;
    font-size: 1rem;
  }

  .filtros label {
    display: block;
    margin-top: 0.7rem;
    font-size: 0.85rem;
  }

  .filtros select,
  .filtros input {
    width: 100%;
    margin-top: 0.25rem;
    padding: 0.35rem 0.5rem;
    border-radius: 0.4rem;
    border: 1px solid #374151;
    background: #030712;
    color: #f9fafb;
    font-size: 0.85rem;
  }

  .resumen {
    margin-top: 1rem;
    font-size: 0.8rem;
    color: #e5e7eb;
  }

  .col-derecha {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .grid-nubes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.75rem;
  }

  .grid-charts {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 2fr) minmax(0, 1.5fr);
    gap: 0.75rem;
  }

  @media (max-width: 900px) {
    .grid-charts {
      grid-template-columns: 1fr;
    }
  }

  .panel-lista {
    padding: 0.9rem;
  }

  .panel-lista h2 {
    margin-top: 0;
    font-size: 1rem;
  }

  .vacio {
    font-size: 0.85rem;
    color: #9ca3af;
  }

  .grid-ejemplos {
    margin-top: 0.75rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 0.75rem;
  }

  .card {
    border-radius: 0.75rem;
    border: 1px solid #1f2937;
    background: #030712;
    padding: 0.7rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .card h3 {
    margin: 0;
    font-size: 0.95rem;
  }

  .tags {
    margin: 0;
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .desc {
    margin: 0.3rem 0 0;
    font-size: 0.85rem;
  }

  .mec {
    margin: 0.2rem 0 0;
    font-size: 0.8rem;
    color: #e5e7eb;
  }

  .panel-nube {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .tabs {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .tabs button {
    border-radius: 999px;
    border: 1px solid #374151;
    background: #020617;
    color: #e5e7eb;
    font-size: 0.8rem;
    padding: 0.25rem 0.7rem;
    cursor: pointer;
  }

  .tabs button.selected {
    border-color: #22d3ee;
    background: radial-gradient(circle at top left, #22d3ee33, #020617);
  }

  .nube-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .nube-titulo {
    margin: 0;
    font-size: 0.85rem;
    color: #e5e7eb;
  }

  .input-tag {
    flex: 1 1 180px;
    max-width: 260px;
    padding: 0.3rem 0.5rem;
    border-radius: 999px;
    border: 1px solid #374151;
    background: #030712;
    color: #f9fafb;
    font-size: 0.8rem;
  }

  .resumen-filtros {
    font-size: 0.8rem;
    color: #cbd5e1;
    margin-bottom: 0.3rem;
  }
  .slider {
    font-size: 0.75rem;
    color: #94a3b8;
    margin-bottom: 0.5rem;
  }

  /* ===== Ajustes para móvil ===== */
  @media (max-width: 768px) {
    .app {
      padding: 0.75rem;
    }

    .layout {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .col-derecha {
      gap: 0.75rem;
    }

    .panel {
      border-radius: 0.5rem;
    }

    .panel-nube {
      padding: 0.6rem;
    }

    .layout {
      margin-top: 1.5rem;
      display: grid;
      grid-template-columns: minmax(260px, 280px) minmax(0, 1fr);
      gap: 1.5rem;
    }

    /* 👇 MUY IMPORTANTE: permitir que se recorten al ancho disponible */
    .layout > * {
      min-width: 0;
    }

    .col-derecha {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-width: 0;
    }

    .panel,
    .panel-nube,
    .panel-lista {
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }
    /* Cualquier cosa con estas clases NO puede ser más ancha que su contenedor */
    :global(.chart),
    :global(.force-graph),
    :global(.concept-cloud-root),
    :global(.legend-root) {
      max-width: 100%;
      box-sizing: border-box;
      overflow-x: hidden;
    }

    .grid-charts {
      grid-template-columns: 1fr;
    }

    .grid-ejemplos {
      grid-template-columns: 1fr;
    }

    .force-graph {
      height: 260px;
    }
  }

  @media (max-width: 400px) {
    .app {
      padding: 0.5rem;
    }

    .input-tag {
      max-width: 100%;
    }
  }
  @media (max-width: 768px) {
    .app {
      padding: 0.75rem;
    }

    .layout {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .col-derecha {
      gap: 0.75rem;
    }

    .grid-charts {
      grid-template-columns: 1fr;
    }

    .grid-ejemplos {
      grid-template-columns: 1fr;
    }

    .force-graph {
      height: 260px;
    }
    aside {
      display: none;
    }
  }

  @media (max-width: 400px) {
    .app {
      padding: 0.5rem;
    }

    .input-tag {
      max-width: 100%;
    }
  }
  .panel-perfil {
    padding: 0.75rem;
  }

  .perfiles {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.5rem;
  }

  .perfiles button {
    border-radius: 999px;
    border: 1px solid #374151;
    background: #020617;
    color: #e5e7eb;
    font-size: 0.75rem;
    padding: 0.2rem 0.6rem;
    cursor: pointer;
  }

  .perfiles button.selected {
    border-color: #f97316;
    background: radial-gradient(circle at top left, #f9731633, #020617);
  }

  .resumen-perfil {
    font-size: 0.8rem;
    color: #e5e7eb;
    margin: 0.25rem 0 0;
  }

  .barra-vida {
    margin: 0.4rem 0;
    width: 100%;
    height: 10px;
    border-radius: 999px;
    background: #020617;
    border: 1px solid #1f2937;
    overflow: hidden;
  }

  .barra-vida-fill {
    height: 100%;
    width: var(--vida, 0%);
    max-width: 100%;
    background: linear-gradient(90deg, #22c55e, #f97316, #ef4444);
    transition: width 0.25s ease-out;
  }

  .card.ataque {
  border-color: #f97316;
  box-shadow: 0 0 0 1px #f97316aa;
  background: radial-gradient(circle at top left, #f9731622, #030712);
}

</style>
