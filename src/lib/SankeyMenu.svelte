<!-- src/lib/SankeyMenu.svelte -->
<script>
  import { createEventDispatcher } from "svelte";
  import { sankey, sankeyLinkHorizontal } from "d3-sankey";
  import { COLORES_TIPO } from "../lib/theme.js";

  // datos: array de ejemplos (tu CSV parseado)
  // campos esperados: categoria, metafora_dominante, mecanismo, canal
  export let datos = [];
  // máximo de nodos visibles tras el layout (para no convertirlo en sopa)
  export let maxNodosVisibles = 40;

  const dispatch = createEventDispatcher();

  // helper para mapear "familia" corta a familia usada en filtros
  function familiaLarga(short) {
    if (short === "cat") return "categorias";
    if (short === "meta") return "metaforas";
    if (short === "mec") return "mecanismos";
    if (short === "canal") return "canales";
    return short;
  }

  // color de nodo/flujo según familia
  function colorFamilia(familia) {
    if (familia === "categorias") return COLORES_TIPO?.categorias || "#60a5fa";
    if (familia === "metaforas")  return COLORES_TIPO?.metaforas  || "#22c55e";
    if (familia === "mecanismos") return COLORES_TIPO?.mecanismos || "#f97316";
    if (familia === "canales")    return COLORES_TIPO?.canales    || "#a855f7";
    return "#64748b";
  }

  // ==========================
  //   CONSTRUCCIÓN DEL GRAFO
  // ==========================

  function buildSankeyData(rows, maxNodos) {
    if (!rows || rows.length === 0) {
      return { nodes: [], links: [] };
    }

    // 1) Acumulamos flujos entre columnas
    const linkMap = new Map();

    function addLink(sourceId, targetId) {
      if (!sourceId || !targetId) return;
      const key = `${sourceId}__${targetId}`;
      linkMap.set(key, (linkMap.get(key) || 0) + 1);
    }

    for (const d of rows) {
      const cat   = d.categoria;
      const meta  = d.metafora_dominante;
      const mec   = d.mecanismo;
      const canal = d.canal;

      if (cat && meta)   addLink(`cat:${cat}`,   `meta:${meta}`);
      if (meta && mec)   addLink(`meta:${meta}`, `mec:${mec}`);
      if (mec && canal)  addLink(`mec:${mec}`,   `canal:${canal}`);
    }

    const linksRaw = Array.from(linkMap, ([key, value]) => {
      const [source, target] = key.split("__");
      return { source, target, value };
    });

    if (linksRaw.length === 0) {
      return { nodes: [], links: [] };
    }

    // 2) Derivamos nodos a partir de links (garantiza que no falte ninguno)
    const nodeIdSet = new Set();
    for (const l of linksRaw) {
      nodeIdSet.add(l.source);
      nodeIdSet.add(l.target);
    }

    const nodesRaw = Array.from(nodeIdSet, (id) => {
      const [short, ...rest] = id.split(":");
      const key = rest.join(":");
      const familia = familiaLarga(short);
      return {
        id,          // ej: "cat:celebridad"
        key,         // ej: "celebridad"
        short,       // "cat", "meta", "mec", "canal"
        familia      // "categorias", "metaforas", ...
      };
    });

    // 3) Layout Sankey con d3-sankey
    const s = sankey()
      .nodeId((d) => d.id)
      .nodeWidth(14)
      .nodePadding(10)
      .extent([[0, 0], [760, 260]]); // espacio del viewBox

    const graph = s({
      nodes: nodesRaw.map((d) => ({ ...d })),
      links: linksRaw.map((d) => ({ ...d }))
    });

    let { nodes, links } = graph;

    // 4) Simplificación visual: top N nodos por valor
    const sortedNodes = nodes
      .slice()
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const keep = new Set(
      sortedNodes.slice(0, maxNodos).map((n) => n.index)
    );

    const nodesVisibles = nodes.filter((n) => keep.has(n.index));
    const linksVisibles = links.filter(
      (l) => keep.has(l.source.index) && keep.has(l.target.index)
    );

    return { nodes: nodesVisibles, links: linksVisibles };
  }

  // layout reactivo cuando cambian datos o maxNodosVisibles
  let nodes = [];
  let links = [];

  $: ({ nodes, links } = buildSankeyData(datos, maxNodosVisibles));

  let hoveredNodeId = null;
  let hoveredLinkIndex = null;

  function handleClickNode(n) {
    // lo exponemos como { tipo, key } para engancharlo a tus filtros
    dispatch("selectNodo", {
      tipo: n.familia, // "categorias"/"metaforas"/...
      key: n.key
    });
  }

  function handleClickLink(l, i) {
    hoveredLinkIndex = i;
    dispatch("selectPar", {
      fromTipo: l.source.familia,
      fromKey:  l.source.key,
      toTipo:   l.target.familia,
      toKey:    l.target.key
    });
  }

  $: console.log("nodes: ", nodes)
</script>

<section class="sankey-panel">
  <header class="sankey-header">
    <h2>Flujos de la turba</h2>
    <p class="sub">
      Usa los bloques y las “venas” como menú para filtrar el atlas.
    </p>
  </header>

  {#if nodes.length === 0}
    <p class="empty">
      No hay suficiente información con los filtros actuales para construir el Sankey.
    </p>
  {:else}
    <svg
      viewBox="0 0 760 260"
      class="sankey-svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <!-- LINKS (venas) -->
      {#each links as l, i}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <path
          class="link"
          class:hovered={hoveredLinkIndex === i}
          class:dimmed={hoveredLinkIndex !== null && hoveredLinkIndex !== i}
          d={sankeyLinkHorizontal()(l)}
          stroke={colorFamilia(l.source.familia)}
          stroke-width={Math.max(1, l.width || 1)}
          on:mouseenter={() => (hoveredLinkIndex = i)}
          on:mouseleave={() => (hoveredLinkIndex = null)}
          on:click={() => handleClickLink(l, i)}
        />
      {/each}

      <!-- NODOS (bloques) -->
      {#each nodes as n}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <g
          class="node"
          class:hovered={hoveredNodeId === n.id}
          transform={`translate(${n.x0},${n.y0})`}
          on:mouseenter={() => (hoveredNodeId = n.id)}
          on:mouseleave={() => (hoveredNodeId = null)}
          on:click={() => handleClickNode(n)}
        >
          <rect
            class="node-rect"
            width={n.x1 - n.x0}
            height={Math.max(8, n.y1 - n.y0)}
            fill={colorFamilia(n.familia)}
            rx="4"
            ry="4"
          />
          <text
            class="node-label"
            x="6"
            y="14"
            text-anchor = {n.familia.includes("cate") ? "start" : "end"}
          >
            {n.key}{n.familia}
          </text>
         <!--  <g>     
             <rect
            class="node-rect"
            width={n.x1 - n.x0}
            height="25px"
            fill="#ff00ff"
            rx="4"
            ry="4"
            y="10"

          />   
              <text
            class="node-value"
            x="6"
            y="27"
          >
            {n.value} casos
          </text>
          </g> -->

        </g>
      {/each}
    </svg>
  {/if}
</section>

<style>
  .sankey-panel {
    padding: 0.6rem 0.75rem 0.8rem;
  }

  .sankey-header h2 {
    margin: 0;
    font-size: 0.95rem;
  }

  .sankey-header .sub {
    margin: 0.2rem 0 0;
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .empty {
    font-size: 0.8rem;
    color: #9ca3af;
    margin-top: 0.5rem;
  }

  .sankey-svg {
    width: 100%;
    height: auto;
    min-height: 360px;
    margin-top: 0.4rem;
    display: block;
  }

  .link {
    fill: none;
    opacity: 0.3;
    cursor: pointer;
    transition:
      opacity 0.15s ease,
      stroke-width 0.15s ease;
  }

  .link.hovered {
    opacity: 0.95;
  }

  .link.dimmed {
    opacity: 0.08;
  }

  .node {
    cursor: pointer;
    transition:
      transform 0.12s ease,
      filter 0.12s ease,
      opacity 0.12s ease;
  }

  .node.hovered {
    filter: brightness(1.1);
    opacity: 1;
  }

  .node-rect {
    stroke: #020617;
    stroke-width: 1;
  }

  .node-label {
    font-size: 11px;
    fill: #ebecf1;
    font-weight: 600;
    pointer-events: none;
  }

  .node-value {
    font-size: 10px;
    fill: #020617;
    opacity: 0.9;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    .sankey-panel {
      padding: 0.5rem 0.5rem 0.7rem;
    }
  }
</style>
