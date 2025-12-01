<script>
  import { atlas } from "./lib/atlasData.js";
  import ConceptCloud from "./lib/ConceptCloud.svelte";
  import BarChart from "./lib/BarChart.svelte";
  import ForceConceptGraph from "./lib/ForceConceptGraph.svelte";

  // Filtros
  let categoriaSeleccionada = "todas";
  let metaforaSeleccionada = "todas";
  let mecanismoSeleccionado = "todos";
  let canalSeleccionado = "todos";
  let busqueda = "";

  // Vista actual de la nube: metaforas | categorias | mecanismos | canales
  let nubeVista = "metaforas";
  let busquedaTag = "";

  // Helpers
  function contarPorClave(datos, clave) {
    const mapa = new Map();
    for (const d of datos) {
      const k = d[clave];
      if (!k) continue;
      mapa.set(k, (mapa.get(k) || 0) + 1);
    }
    return Array.from(mapa, ([nombre, valor]) => ({ nombre, valor })).sort(
      (a, b) => b.valor - a.valor,
    );
  }

  // Valores únicos para selects (además de las nubes)
  const categoriasUnicas = [
    ...new Set(atlas.map((d) => d.categoria).filter(Boolean)),
  ].sort();
  const metaforasUnicas = [
    ...new Set(atlas.map((d) => d.metafora_dominante).filter(Boolean)),
  ].sort();
  const mecanismosUnicos = [
    ...new Set(atlas.map((d) => d.mecanismo).filter(Boolean)),
  ].sort();
  const canalesUnicos = [
    ...new Set(atlas.map((d) => d.canal).filter(Boolean)),
  ].sort();

  // Datos filtrados según los filtros actuales
  $: filtrados = atlas.filter((d) => {
    const pasaCategoria =
      categoriaSeleccionada === "todas" ||
      d.categoria === categoriaSeleccionada;
    const pasaMetafora =
      metaforaSeleccionada === "todas" ||
      d.metafora_dominante === metaforaSeleccionada;
    const pasaMecanismo =
      mecanismoSeleccionado === "todos" ||
      d.mecanismo === mecanismoSeleccionado;
    const pasaCanal =
      canalSeleccionado === "todos" || d.canal === canalSeleccionado;

    const texto = (
      (d.ejemplo || "") +
      " " +
      (d.descripcion || "") +
      " " +
      (d.tipo_victima || "")
    ).toLowerCase();
    const pasaBusqueda = texto.includes(busqueda.toLowerCase().trim());

    return (
      pasaCategoria &&
      pasaMetafora &&
      pasaMecanismo &&
      pasaCanal &&
      pasaBusqueda
    );
  });

    // Construir datos del grafo a partir de los ejemplos filtrados
  function buildGraphData(datos) {
    const nodesMap = new Map();
    const links = [];

    function addNode(key, type) {
      if (!key) return null;
      const id = `${type}:${key}`;
      if (!nodesMap.has(id)) {
        nodesMap.set(id, { id, key, type });
      }
      return id;
    }

    for (const d of datos) {
      const catId  = addNode(d.categoria,          "cat");
      const metaId = addNode(d.metafora_dominante, "meta");
      const mecId  = addNode(d.mecanismo,          "mec");
      const canId  = addNode(d.canal,              "canal");

      if (catId && metaId) links.push({ source: catId, target: metaId });
      if (metaId && mecId) links.push({ source: metaId, target: mecId });
      if (mecId && canId)  links.push({ source: mecId, target: canId });
    }

    return { nodes: Array.from(nodesMap.values()), links };
  }

  $: graphData = buildGraphData(filtrados);


  // Grafo basado en los datos filtrados actuales
  $: graphData = buildGraphData(filtrados);

      function handleSelectConcept(event) {
    const { type, key } = event.detail;

    if (type === "cat") {
      categoriaSeleccionada = categoriaSeleccionada === key ? "todas" : key;
    } else if (type === "meta") {
      metaforaSeleccionada = metaforaSeleccionada === key ? "todas" : key;
    } else if (type === "mec") {
      mecanismoSeleccionado = mecanismoSeleccionado === key ? "todos" : key;
    } else if (type === "canal") {
      canalSeleccionado = canalSeleccionado === key ? "todos" : key;
    }
  }



  // Conteos globales (sobre todo el atlas)
  const conteoGlobalCategorias = contarPorClave(atlas, "categoria");
  const conteoGlobalMetaforas = contarPorClave(atlas, "metafora_dominante");
  const conteoGlobalMecanismos = contarPorClave(atlas, "mecanismo");
  const conteoGlobalCanales = contarPorClave(atlas, "canal");

  // Conteos sobre datos filtrados (para conectar nubes)
  $: conteoFiltradoCategorias = contarPorClave(filtrados, "categoria");
  $: conteoFiltradoMetaforas = contarPorClave(filtrados, "metafora_dominante");
  $: conteoFiltradoMecanismos = contarPorClave(filtrados, "mecanismo");
  $: conteoFiltradoCanales = contarPorClave(filtrados, "canal");

  // Convertimos conteos filtrados en Map para lookup rápido
  $: mapaCatFiltrado = new Map(
    conteoFiltradoCategorias.map((d) => [d.nombre, d.valor]),
  );
  $: mapaMetFiltrado = new Map(
    conteoFiltradoMetaforas.map((d) => [d.nombre, d.valor]),
  );
  $: mapaMecFiltrado = new Map(
    conteoFiltradoMecanismos.map((d) => [d.nombre, d.valor]),
  );
  $: mapaCanFiltrado = new Map(
    conteoFiltradoCanales.map((d) => [d.nombre, d.valor]),
  );

  // Nubes de conceptos (usamos los conteos globales como base)
  $: nubeCategorias = conteoGlobalCategorias.map((d) => ({
    nombre: d.nombre,
    count: d.valor,
    active: categoriaSeleccionada === d.nombre,
    disabled: !mapaCatFiltrado.has(d.nombre),
  }));

  $: nubeMetaforas = conteoGlobalMetaforas.map((d) => ({
    nombre: d.nombre,
    count: d.valor,
    active: metaforaSeleccionada === d.nombre,
    disabled: !mapaMetFiltrado.has(d.nombre),
  }));

  $: nubeMecanismos = conteoGlobalMecanismos.map((d) => ({
    nombre: d.nombre,
    count: d.valor,
    active: mecanismoSeleccionado === d.nombre,
    disabled: !mapaMecFiltrado.has(d.nombre),
  }));

  $: nubeCanales = conteoGlobalCanales.map((d) => ({
    nombre: d.nombre,
    count: d.valor,
    active: canalSeleccionado === d.nombre,
    disabled: !mapaCanFiltrado.has(d.nombre),
  }));

  // Datos para gráficos de barras
  $: dataChartCategorias = conteoFiltradoCategorias.map((d) => ({
    label: d.nombre,
    value: d.valor,
  }));
  $: dataChartMetaforas = conteoFiltradoMetaforas.map((d) => ({
    label: d.nombre,
    value: d.valor,
  }));
  $: dataChartCanales = conteoFiltradoCanales.map((d) => ({
    label: d.nombre,
    value: d.valor,
  }));



    // Nube en función de la pestaña activa
  $: nubeActualBase =
    nubeVista === "metaforas"
      ? nubeMetaforas
      : nubeVista === "categorias"
      ? nubeCategorias
      : nubeVista === "mecanismos"
      ? nubeMecanismos
      : nubeCanales; // "canales"

  // Filtro de texto sobre la nube actual
  $: nubeActual = nubeActualBase.filter(item =>
    item.nombre.toLowerCase().includes(busquedaTag.toLowerCase().trim())
  );

  // Manejar clic en un tag según la pestaña actual
  function handleToggleTag(evt) {
    const { nombre } = evt.detail;

    if (nubeVista === "metaforas") {
      metaforaSeleccionada = metaforaSeleccionada === nombre ? "todas" : nombre;
    } else if (nubeVista === "categorias") {
      categoriaSeleccionada = categoriaSeleccionada === nombre ? "todas" : nombre;
    } else if (nubeVista === "mecanismos") {
      mecanismoSeleccionado = mecanismoSeleccionado === nombre ? "todos" : nombre;
    } else if (nubeVista === "canales") {
      canalSeleccionado = canalSeleccionado === nombre ? "todos" : nombre;
    }
  }


  // Handlers para la nube
  function toggleCategoria(evt) {
    const { nombre } = evt.detail;
    categoriaSeleccionada = categoriaSeleccionada === nombre ? "todas" : nombre;
  }

  function toggleMetafora(evt) {
    const { nombre } = evt.detail;
    metaforaSeleccionada = metaforaSeleccionada === nombre ? "todas" : nombre;
  }

  function toggleMecanismo(evt) {
    const { nombre } = evt.detail;
    mecanismoSeleccionado = mecanismoSeleccionado === nombre ? "todos" : nombre;
  }

  function toggleCanal(evt) {
    const { nombre } = evt.detail;
    canalSeleccionado = canalSeleccionado === nombre ? "todos" : nombre;
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

  <section class="layout">
    <!-- Columna izquierda: filtros “clásicos” -->
    <aside class="panel filtros">
      <h2>Filtros básicos</h2>

      <label>
        Categoría
        <select bind:value={categoriaSeleccionada}>
          <option value="todas">todas</option>
          {#each categoriasUnicas as c}
            <option value={c}>{c}</option>
          {/each}
        </select>
      </label>

      <label>
        Metáfora dominante
        <select bind:value={metaforaSeleccionada}>
          <option value="todas">todas</option>
          {#each metaforasUnicas as m}
            <option value={m}>{m}</option>
          {/each}
        </select>
      </label>

      <label>
        Mecanismo
        <select bind:value={mecanismoSeleccionado}>
          <option value="todos">todos</option>
          {#each mecanismosUnicos as m}
            <option value={m}>{m}</option>
          {/each}
        </select>
      </label>

      <label>
        Canal
        <select bind:value={canalSeleccionado}>
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
          bind:value={busqueda}
        />
      </label>

      <p class="resumen">
        {filtrados.length} ejemplos coinciden con la combinación actual.
      </p>
    </aside>

    <!-- Columna derecha: nubes + gráficos + tarjetas -->
    <section class="col-derecha">
      <!-- Nubes de conceptos -->
    <section class="panel panel-nube">
  <div class="tabs">
    <button
      class:selected={nubeVista === "metaforas"}
      on:click={() => { nubeVista = "metaforas"; busquedaTag = ""; }}
    >
      Metáforas
    </button>
    <button
      class:selected={nubeVista === "categorias"}
      on:click={() => { nubeVista = "categorias"; busquedaTag = ""; }}
    >
      Categorías
    </button>
    <button
      class:selected={nubeVista === "mecanismos"}
      on:click={() => { nubeVista = "mecanismos"; busquedaTag = ""; }}
    >
      Mecanismos
    </button>
    <button
      class:selected={nubeVista === "canales"}
      on:click={() => { nubeVista = "canales"; busquedaTag = ""; }}
    >
      Canales
    </button>
  </div>

  <div class="nube-header">
    <p class="nube-titulo">
      {#if nubeVista === "metaforas"}
        Metáforas dominantes
      {:else if nubeVista === "categorias"}
        Categorías temáticas
      {:else if nubeVista === "mecanismos"}
        Mecanismos de distorsión
      {:else}
        Canales de difusión
      {/if}
    </p>
    <input
      type="text"
      placeholder="Filtrar tags de esta nube..."
      bind:value={busquedaTag}
      class="input-tag"
    />
  </div>

  <ConceptCloud
    items={nubeActual}
    on:toggle={handleToggleTag}
  />
</section>

<section class="panel" style="padding: 0.5rem;">
  <h2 style="font-size:0.9rem; margin:0 0 0.3rem 0;">
    Mapa de conexiones entre familias de conceptos
  </h2>
  <ForceConceptGraph {graphData} on:selectConcept={handleSelectConcept} />

      <!-- Gráficos -->
      <section class="grid-charts">
        <BarChart
          titulo="Top categorías en el filtro actual"
          data={dataChartCategorias}
          maxItems={8}
        />
        <BarChart
          titulo="Top metáforas en el filtro actual"
          data={dataChartMetaforas}
          maxItems={8}
        />
        <BarChart
          titulo="Top canales en el filtro actual"
          data={dataChartCanales}
          maxItems={6}
        />
      </section>

      <!-- Lista de resultados -->
      <section class="panel panel-lista">
        <h2>Ejemplos detallados</h2>
        {#if filtrados.length === 0}
          <p class="vacio">
            No se han encontrado ejemplos con esta combinación.
          </p>
        {:else}
          <div class="grid-ejemplos">
            {#each filtrados as d}
              <article class="card">
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
</main>

<style>
  :global(body) {
    margin: 0;
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    background: #020617;
    color: #f9fafb;
  }

  .app {
    max-width: 1280px;
    margin: 0 auto;
    padding: 1.5rem;
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


</style>
