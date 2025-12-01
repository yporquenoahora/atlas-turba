<script>
  import { onMount, onDestroy } from "svelte";
  import { createEventDispatcher } from "svelte";
  import * as d3 from "d3";

  export let graphData = { nodes: [], links: [] };

  let svgEl;
  let width = 800;
  let height = 380;

  let simulation;
  let currentNodes = [];
  let currentLinks = [];
  let neighbors = new Map();

  let tooltipEl;


  const dispatch = createEventDispatcher();

  // Cada vez que cambien los datos y el SVG exista, rehacemos el grafo
  $: if (svgEl && graphData) {
    initGraph();
  }

  function initGraph() {
    if (!graphData || !graphData.nodes) return;

    if (simulation) {
      simulation.stop();
      simulation = null;
    }

    currentNodes = graphData.nodes.map(d => ({ ...d }));
    currentLinks = graphData.links.map(d => ({ ...d }));

    buildNeighbors();

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const container = svg
      .append("g")
      .attr("class", "zoom-container");

    const link = container
      .append("g")
      .selectAll("line")
      .data(currentLinks)
      .join("line")
      .attr("class", "link");

    const node = container
      .append("g")
      .selectAll("circle")
      .data(currentNodes)
      .join("circle")
      .attr("r", 5)
      .attr("class", d => `node node-${d.type}`);

    const label = container
      .append("g")
      .selectAll("text")
      .data(currentNodes)
      .join("text")
      .attr("class", "node-label")
      .text(d => d.key);

    // Interacción en círculos y textos
    attachInteractivity(node, svg);
    attachInteractivity(label, svg);

    // Drag solo en nodos
    node.call(drag());

    simulation = d3
      .forceSimulation(currentNodes)
      .force(
        "link",
        d3
          .forceLink(currentLinks)
          .id(d => d.id)
          .distance(95)
          .strength(0.6)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(20))
      .on("tick", () => {
        link
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);

        node.attr("cx", d => d.x).attr("cy", d => d.y);

        label
          .attr("x", d => d.x)
          .attr("y", d => d.y - 14);
      });

    // Zoom + pan
    const zoom = d3.zoom()
      .scaleExtent([0.4, 2.5])
      .on("zoom", event => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Estado inicial: todo visible con opacidad "normal"
    resetHighlight(svg);
  }

  function buildNeighbors() {
    neighbors = new Map();
    for (const n of graphData.nodes || []) {
      neighbors.set(n.id, new Set());
    }
    for (const l of graphData.links || []) {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      neighbors.get(s)?.add(t);
      neighbors.get(t)?.add(s);
    }
  }

  function attachInteractivity(selection, svg) {
    selection
      .on("mouseover", (event, d) => {
        highlightNode(d, svg);
      })
      .on("mouseout", () => {
        resetHighlight(svg);
      })
      .on("click", (event, d) => {
        // que el click no se lo coma el zoom
        event.stopPropagation();
        dispatch("selectConcept", { type: d.type, key: d.key });
      })
      .on("mouseover", (event, d) => {
  highlightNode(d, svg);

  tooltipEl.innerHTML = `
    <strong>${d.key}</strong><br>
    Tipo: ${d.type}<br>
    Vecinos: ${neighbors.get(d.id)?.size ?? 0}
  `;
  tooltipEl.style.opacity = 1;

  const { clientX: x, clientY: y } = event;
  tooltipEl.style.left = x + 15 + "px";
  tooltipEl.style.top  = y + 15 + "px";
})
.on("mousemove", (event) => {
  const { clientX: x, clientY: y } = event;
  tooltipEl.style.left = x + 15 + "px";
  tooltipEl.style.top  = y + 15 + "px";
})
.on("mouseout", () => {
  resetHighlight(svg);
  tooltipEl.style.opacity = 0;
})
    .style("cursor", "pointer");
  }

  function drag() {
    function dragstarted(event, d) {
      // que el drag no active el zoom del fondo
      if (event.sourceEvent) event.sourceEvent.stopPropagation();
      if (!event.active && simulation) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active && simulation) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return d3
      .drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  // HOVER: sube opacidad de nodo + vecinos y sus enlaces
  function highlightNode(node, svg) {
    const activeId = node.id;
    const neigh = neighbors.get(activeId) || new Set();

    const allowed = new Set(neigh);
    allowed.add(activeId);

    // NODOS
    svg.selectAll(".node")
      .style("opacity", d => allowed.has(d.id) ? 1 : 0.2)
      .style("stroke-width", d => allowed.has(d.id) ? 2 : 1.2);

    // TEXTOS
    svg.selectAll(".node-label")
      .style("opacity", d => allowed.has(d.id) ? 1 : 0.3)
      .style("font-weight", d => allowed.has(d.id) ? "600" : "400");

    // ENLACES
    svg.selectAll(".link")
      .style("opacity", d => {
        const s = typeof d.source === "object" ? d.source.id : d.source;
        const t = typeof d.target === "object" ? d.target.id : d.target;
        return allowed.has(s) && allowed.has(t) ? 1 : 0.2;
      })
      .style("stroke-width", d => {
        const s = typeof d.source === "object" ? d.source.id : d.source;
        const t = typeof d.target === "object" ? d.target.id : d.target;
        return allowed.has(s) && allowed.has(t) ? 2.5 : 1;
      });
  }

  // Estado "normal": todo visible
  function resetHighlight(svg) {
    svg.selectAll(".node")
      .style("opacity", 0.65)
      .style("stroke-width", 1.2);

    svg.selectAll(".node-label")
      .style("opacity", 1)
      .style("font-weight", "400");

    svg.selectAll(".link")
      .style("opacity", 0.9)
      .style("stroke-width", 1.2);
  }

  onMount(() => {
    const rect = svgEl.getBoundingClientRect();
    width = rect.width || 800;
    height = 380;
  });

  onDestroy(() => {
    if (simulation) simulation.stop();
  });
</script>

<div bind:this={tooltipEl} class="tooltip"></div>

<svg bind:this={svgEl} class="force-graph"></svg>
<style>
  /* === Estilos locales del contenedor === */
  .force-graph {
    width: 100%;
    height: 380px;
    background: #020617;
    border-radius: 0.75rem;
    border: 1px solid #1f2937;
    overflow: hidden;
  }

  /* === Estilos globales para nodos creados por D3 === */
  :global(.node),
  :global(.node-label) {
    transition: opacity 0.15s;
    user-select: none;
    cursor: pointer;
  }

  :global(.node-cat)   { stroke: #22c55e; } /* categorías */
  :global(.node-meta)  { stroke: #38bdf8; } /* metáforas */
  :global(.node-mec)   { stroke: #f97316; } /* mecanismos */
  :global(.node-canal) { stroke: #a855f7; } /* canales */

  :global(.node-label) {
    fill: #e5e7eb;
    font-size: 11px;
    paint-order: stroke;
    stroke: #000;
    stroke-width: 0.8px;
  }

  :global(.link) {
    stroke: #4b5563;
    stroke-width: 1.2px;
    stroke-opacity: 0.8;
    transition: opacity 0.15s, stroke-width 0.15s;
  }

   .tooltip {
    position: fixed;
    background: #111827;
    color: #f1f5f9;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 0.75rem;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s ease;
    border: 1px solid #334155;
  }
</style>
