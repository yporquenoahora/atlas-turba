<script>
  // @ts-nocheck

  import { onDestroy } from "svelte";
  import { get } from "svelte/store";

  import {
    filtros,
    ui,
    effectiveMinCount,
    filtradosVisibles,
    maxMinCountPosible,
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
  import AttackReplay from "./lib/AttackReplay.svelte";

  import { graphCircular } from "./stores/store.js";
  import CircularForceGraph from "./lib/CircularForceGraph.svelte";

  import MapaRutasContinentes from "./lib/MapaRutas.svelte";
  import Tabs from "./lib/Tabs.svelte";
  import Buscador from "./lib/Buscador.svelte";

  import SankeyMenu from "./lib/SankeyMenu.svelte";
  // opcional: guardar la ruta seleccionada en App si quieres sincronizar con otros módulos
  let rutaSeleccionada = null;
  export let maxPorColumna = 8;

  function handleSelectRuta(event) {
    rutaSeleccionada = event.detail.ruta;
    // aquí podrías, por ejemplo, filtrar lista de ejemplos según esa ruta, etc.
  }

  function seleccionarPerfil(id) {
    const perfil = perfilesPersonaje.find((p) => p.id === id);
    perfilActivo.set(id);
    ataqueIndex.set(0); // reiniciamos replay

    if (perfil?.presetFiltros) {
      const pf = perfil.presetFiltros;
      setFiltro({
        texto: pf.texto ?? "", // suponiendo que tu filtro se llama 'texto' o 'busqueda'
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

  $: totalEjemplos = $filtrados.length;
  $: totalVisibles = $filtradosVisibles.length;

  let continenteActivoId = null;

  function handleSelectContinente(event) {
    const { id } = event.detail;
    continenteActivoId = id;
  }

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

  function resetReplay() {
    ataqueIndex.set(0);
  }

  $: ataquesIds = new Set(
    $ataquesPerfil.ataques
      ? $ataquesPerfil.ataques.map((a) => a.id).filter(Boolean)
      : [],
  );
  function handleSelectNodo(e) {
    const { tipo, key } = e.detail; // tipo: "categorias"/"metaforas"/...
    filtros.update((f) => {
      if (tipo === "categorias")
        return { ...f, categoria: f.categoria === key ? "todas" : key };
      if (tipo === "metaforas")
        return { ...f, metafora: f.metafora === key ? "todas" : key };
      if (tipo === "mecanismos")
        return { ...f, mecanismo: f.mecanismo === key ? "todos" : key };
      if (tipo === "canales")
        return { ...f, canal: f.canal === key ? "todos" : key };
      return f;
    });
  }

  function handleSelectPar(e) {
    const { fromTipo, fromKey, toTipo, toKey } = e.detail;
    filtros.update((f) => {
      let next = { ...f };
      if (fromTipo === "categorias") next.categoria = fromKey;
      if (fromTipo === "metaforas") next.metafora = fromKey;
      if (fromTipo === "mecanismos") next.mecanismo = fromKey;
      if (fromTipo === "canales") next.canal = fromKey;

      if (toTipo === "categorias") next.categoria = toKey;
      if (toTipo === "metaforas") next.metafora = toKey;
      if (toTipo === "mecanismos") next.mecanismo = toKey;
      if (toTipo === "canales") next.canal = toKey;

      return next;
    });
  }
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
            <span>{atak.descripcion}</span>
          {/each}
        {/if}
      </p>

      {#if $estadoPerfil === "sin_datos"}
        <p class="resumen-perfil">
          Por ahora no hay datos en la combinación de filtros actual.
        </p>
      {:else}
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
    <AttackReplay />

    {#if resumenContinenteActivo}
      <p class="resumen-perfil">
        En <strong>{resumenContinenteActivo.label}</strong> este perfil recibe
        <strong>{resumenContinenteActivo.total}</strong> ataques.
      </p>
    {/if}
  </section>

  <section class="panel area-sankey">
    <SankeyMenu
      datos={$filtradosVisibles}
      maxNodosVisibles={40}
      on:selectNodo={handleSelectNodo}
      on:selectPar={handleSelectPar}
    />
  </section>

  <section class="panel">
    <section class="panel panel-circular area-circular">
      <section class="panel panel-mapa-top">
        <div class="map-grid">
          <section class="map-cell">
            <CircularForceGraph
              nodes={$graphCircular.nodes}
              links={$graphCircular.links}
              activeTipo={$ui.nubeVista || "metaforas"}
            />
          </section>
          <section class="map-cell">
            <h2 class="map-title">Tráfico de ataques entre continentes</h2>
            <MapaRutasContinentes on:selectRuta={handleSelectRuta} />
          </section>
        </div>
      </section>
    </section>
    <section class="panel panel-mapa-metaforico"></section>
    <!--  <MapaMetaforico
    continentes={continentesConfig}
    ejemplos={$filtrados}
    ataquesPerfil={$ataquesPerfil}
    ataqueActualId={$ataqueActual ? $ataqueActual.ataque.id : null}
  /> -->
    <aside class="panel filtros">
      <Buscador />

      <p class="resumen">
        {totalEjemplos} ejemplos coinciden con la combinación actual;
        {totalVisibles} se muestran con el umbral mínimo actual.
      </p>
    </aside>

    <section class="layout">
      <section class="col-derecha">
        <!-- Nubes de conceptos -->
        <section class="panel panel-nube area-nube">
          <Tabs />

          <ConceptCloud items={nubeActual} on:toggle={handleToggleTag} />
        </section>

        <section
          class="panel panel-force area-circular"
          style="padding: 0.5rem;"
        >
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
              {
                label: "Canales",
                type: "canales",
                color: COLORES_TIPO.canales,
              },
            ]}
            on:focusTipo={handleFocusTipo}
          />

          <div class="slider">
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label>
              Mínimo de casos: {$effectiveMinCount}
              <span style="opacity:.7; font-size:.75rem;">
                (máx disponible: {$maxMinCountPosible})
              </span>
            </label>
            <input
              type="range"
              min="1"
              max={$maxMinCountPosible}
              value={$ui.minCount}
              on:input={(e) => {
                const raw = Number(e.target.value) || 1;
                const safe = Math.min(raw, $maxMinCountPosible || 1);
                setUi({ minCount: safe });
              }}
            />
          </div>

          <ForceConceptGraph
            graphData={$graphData}
            on:selectConcept={handleSelectConcept}
          />
        </section>
      </section>
      <section class="panel panel-lista area-lista" style="padding: 0.5rem;">
        <!-- Gráficos -->

        <!-- Lista de resultados -->
        <section class="panel panel-lista area-lista">
          <h2>Ejemplos detallados: {totalVisibles}</h2>

          {#if totalVisibles === 0}
            <p class="vacio">
              No hay ejemplos que superen el umbral mínimo con los filtros
              actuales.
            </p>
          {:else}
            <div class="grid-ejemplos">
              {#each $filtradosVisibles as d}
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
    display: flex;
    flex-direction: column;
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
    display: grid;
    grid-template-columns: 0.7fr 1.3fr;
  }

  .grid-nubes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.75rem;
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
    font-size: 0.75rem;
  }

  .tags {
    margin: 0;
    font-size: 0.65rem;
    color: #9ca3af;
  }

  .desc {
    margin: 0.3rem 0 0;
    font-size: 0.55rem;
  }

  .mec {
    margin: 0.2rem 0 0;
    font-size: 0.5rem;
    color: #e5e7eb;
  }

  .panel-nube {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
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
      /*  grid-template-columns: 1fr; */
      gap: 1rem;
      display: flex;
      flex-direction: row;
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
      /*  grid-template-columns: minmax(260px, 280px) minmax(0, 1fr); */
      gap: 1.5rem;
      display: flex;
      flex-direction: row;
    }
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
  .mapa {
    display: flex;
    flex-direction: row;
  }

  .col-derecha {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* Layout de escritorio: grid para evitar scroll loco */
  @media (min-width: 1024px) {
    .col-derecha {
      display: grid;
      grid-template-columns: minmax(0, 1.3fr) minmax(0, 1.2fr);
      grid-template-rows: auto auto auto;
      grid-template-areas:
        "nube circular"
        "charts charts"
        "lista lista";
      gap: 0.9rem;
      align-items: start;
    }

    .area-nube {
      grid-area: nube;
    }

    .area-circular {
      grid-area: circular;
    }

    .area-charts {
      grid-area: charts;
    }

    .area-lista {
      grid-area: lista;
      max-height: 320px;
      overflow-y: auto;
    }

    /* recortar un poco alturas internas para que todo quepa mejor */
    .grid-charts {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .panel-nube {
      max-height: 260px;
      overflow-y: auto;
    }
  }
  .panel-mapa-top {
    padding: 0.75rem;
  }

  .map-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    gap: 0.75rem;
  }

  .map-cell {
    min-height: 220px;
    /* dejamos crecer un poco más y no cortamos el svg */
    max-height: 100vh;
    overflow: hidden;
  }

  .map-title {
    margin: 0 0 0.4rem 0;
    font-size: 0.9rem;
  }

  /* En móvil lo dejamos en columna para que respire */
  @media (max-width: 900px) {
    .map-grid {
      grid-template-columns: 1fr;
    }
    .map-cell {
      max-height: none;
    }
  }

  /* Layout de escritorio: grid compacto en la columna derecha */
  @media (min-width: 1024px) {
    .col-derecha {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.1fr);
      /*  grid-template-rows: minmax(0, 260px) minmax(0, 320px); */
      grid-template-areas:
        "nube circular"
        "lista lista";
      gap: 0.75rem;
      align-items: start;
    }

    .area-nube {
      grid-area: nube;
    }

    .area-circular {
      grid-area: circular;
    }

    .area-lista {
      grid-area: lista;
    }

    .panel-nube {
      max-height: fit-content;
      overflow-y: auto;
    }

    .panel-force {
      /* max-height: 260px; */
      overflow: hidden;
    }

    .panel-lista.area-lista {
      max-height: 320px;
      overflow-y: auto;
    }
  }
  @media (min-width: 1024px) {
    .panel-mapa-metaforico {
      margin-top: 0.75rem;
      max-height: 280px;
      overflow-y: auto;
    }
  }

  .panel-circular {
    padding: 0.5rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .circular-header h2 {
    margin: 0;
    font-size: 0.95rem;
  }

  .circular-sub {
    margin: 0.15rem 0 0;
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .circular-container {
    width: 100%;
  }
</style>
