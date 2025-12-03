<script>
    // CircularForceGraph.svelte
    export let nodes = []; // [{ id, tipo, label, degree }]
    export let links = []; // [{ source, target, weight }]
    export let activeTipo = "metaforas"; // tab actual

    // mapeo de nombre de tab -> tipo interno de nodo
    const TIPO_MAP = {
        metaforas: "metafora",
        categorias: "categoria",
        mecanismos: "mecanismo",
        canales: "canal",
    };

    $: tipoActivo = TIPO_MAP[activeTipo] || "metafora";

    const R = 45; // radio dentro del viewBox 0-100

    // Colocamos nodos en círculo (no-physics pero “force-like” visualmente)

  $: positionedNodes = nodes.map((n, idx) => {
    const angle = (2 * Math.PI * idx) / Math.max(nodes.length, 1);
    const cx = 50 + R * Math.cos(angle);
    const cy = 50 + R * Math.sin(angle);
    return { ...n, x: cx, y: cy };
  });

    $: nodeById = new Map(positionedNodes.map((n) => [n.id, n]));

      // normalizamos degree para radio de círculo
  $: degrees = positionedNodes.map((n) => n.degree || 0);
  $: maxDegree = Math.max(...degrees, 1);

    $: maxOcurrencias = Math.max(...nodes.map((n) => n.ocurrencias || 0), 1);

    function nodeRadius(n) {
    const d = n.degree || 0;
    const ratio = d / maxDegree;
    const minR = 2;
    const maxR = 6; // puedes subirlo si quieres más contraste
    return minR + (maxR - minR) * ratio;
  }
    function radius(n) {
        // mínimo 2, máximo ~6, escalado por ocurrencias
        const base = (n.ocurrencias || 1) / maxOcurrencias;
        return 2 + base * 4;
    }
    // lookup rápido id -> nodo

    // normalización de pesos para grosor de links
    function colorVinculo(aTipo, bTipo) {
        const par = [aTipo, bTipo].sort().join("-");

        switch (par) {
            case "categoria-metafora":
                return "rgba(34,197,94,0.8)"; // verde → “imaginario sobre temas”
            case "categoria-mecanismo":
                return "rgba(249,115,22,0.8)"; // naranja → “cómo atacamos una temática”
            case "categoria-canal":
                return "rgba(59,130,246,0.8)"; // azul → “dónde se ataca una temática”
            case "metafora-mecanismo":
                return "rgba(244,114,182,0.85)"; // rosa → “figura retórica ↔ táctica”
            case "metafora-canal":
                return "rgba(56,189,248,0.85)"; // celeste
            case "mecanismo-canal":
                return "rgba(168,85,247,0.85)"; // violeta
            default:
                return "rgba(148,163,184,0.4)"; // gris para todo lo demás
        }
    }

     $: maxWeight = Math.max(...links.map((l) => l.weight || 0), 1);


   function labelTipo(tipo) {
    if (tipo === "metafora") return "Metáfora";
    if (tipo === "categoria") return "Categoría";
    if (tipo === "mecanismo") return "Mecanismo";
    if (tipo === "canal") return "Canal";
    return tipo;
  }
  function linkColor(tipoA, tipoB) {
    const pares = [tipoA, tipoB].sort().join("-");

    switch (pares) {
      case "categoria-metafora":
        return "rgba(56, 189, 248, 0.8)"; // azul claro
      case "categoria-mecanismo":
        return "rgba(249, 115, 22, 0.9)"; // naranja
      case "categoria-canal":
        return "rgba(139, 92, 246, 0.9)"; // violeta
      case "metafora-mecanismo":
        return "rgba(34, 197, 94, 0.9)";  // verde
      case "metafora-canal":
        return "rgba(45, 212, 191, 0.9)"; // turquesa
      case "canal-mecanismo":
        return "rgba(239, 68, 68, 0.9)";  // rojo
      case "categoria-categoria":
      case "metafora-metafora":
      case "mecanismo-mecanismo":
      case "canal-canal":
        return "rgba(148, 163, 184, 0.5)"; // gris para vínculos intra-tipo
      default:
        return "rgba(148, 163, 184, 0.4)";
    }
    }
</script>
<section class="circular-graph">
  <header class="header">
    <h3>Mapa circular de coocurrencias</h3>
    <p>Resaltando: {labelTipo(tipoActivo)}</p>
  </header>

  <div class="canvas-wrapper">
    <svg viewBox="0 0 100 100" class="svg"  preserveAspectRatio="xMidYMid meet">
      <!-- links -->
      {#each links as l}
        {#if nodeById.get(l.source) && nodeById.get(l.target)}
          {@const a = nodeById.get(l.source)}
          {@const b = nodeById.get(l.target)}
          <line
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            class="link"
            style={`stroke:${linkColor(a.tipo, b.tipo)};stroke-width:${0.2 + (l.weight / maxWeight) * 1.8}`}
          />
        {/if}
      {/each}

      <!-- nodos -->
      {#each positionedNodes as n}
        <g
          class="node"
          class:active={n.tipo === tipoActivo}
          transform={`translate(${n.x},${n.y})`}
        >
          <circle r={nodeRadius(n)} />
          <text x="0" y={-nodeRadius(n) - 1} class="label">
            {n.label}
          </text>
        </g>
      {/each}
    </svg>
  </div>
</section>

<style>

   .circular-graph {
  padding: 0.6rem;
  border-radius: 0.75rem;
  border: 1px solid #1f2937;
  background: #020617;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

/* Aquí está la magia responsive */
.canvas-wrapper {
  width: 100%;
  aspect-ratio: 1 / 1;   /* siempre cuadrado */
  max-height: 260px;     /* o 280 si lo quieres un pelín más grande */
}

.svg {
  width: 100%;
  height: 100%;
}


  .header h3 {
    margin: 0;
    font-size: 0.9rem;
  }

  .header p {
    margin: 0.1rem 0 0;
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .link {
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.7;
  }

  .node {
    opacity: 0.5;
    transition: opacity 0.15s ease;
  }

  .node.active {
    opacity: 1;
  }

  .node circle {
    fill: #0f172a;
    stroke: #4b5563;
    stroke-width: 0.4;
    transition:
      fill 0.15s ease,
      stroke 0.15s ease,
      r 0.15s ease,
      opacity 0.15s ease;
  }

  .node.active circle {
    fill: #22c55e;
    stroke: #bbf7d0;
  }

  .label {
    font-size: 2px;
    fill: #e5e7eb;
    text-anchor: middle;
    dominant-baseline: central;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    .circular-graph {
      padding: 0.5rem;
    }
  }
  </style>
