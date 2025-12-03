<script>
  import { createEventDispatcher } from "svelte";
  import mapaSrc from "../assets/mapa.jpeg";
  import { rutasEntreContinentes } from "../stores/store.js";

  const dispatch = createEventDispatcher();

  // hotspots: coordenadas % para cada continente
  // (asegúrate de que los ids coinciden con continentesConfig.id)
  const hotspots = [
    { id: "espectaculo",     top: 18, left: 18,  label: "Espectáculo" },
    { id: "ciencia",         top: 25, left: 60,  label: "Ciencia" },
    { id: "bestiario",       top: 55, left: 12,  label: "Bestiario" },
    { id: "pueblo_politico", top: 50, left: 55,  label: "Pueblo político" },
    { id: "economia",        top: 70, left: 40,  label: "Economía" },
    { id: "redes",           top: 30, left: 35,  label: "Redes" },
    { id: "ficcion",         top: 35, left: 80,  label: "Ficción" },
    { id: "cronica_negra",   top: 75, left: 75,  label: "Crónica negra" }
  ];

  function coords(id) {
    const h = hotspots.find(h => h.id === id);
    if (!h) return null;
    return { x: h.left, y: h.top };
  }

  // color según mecanismo dominante
  function colorMecanismo(m) {
    if (!m) return "rgba(148,163,184,0.7)"; // gris
    const s = m.toLowerCase();
    if (s.includes("ridicul"))   return "rgba(34,197,94,0.9)";   // verde
    if (s.includes("deshuman"))  return "rgba(239,68,68,0.9)";   // rojo
    if (s.includes("conspir"))   return "rgba(59,130,246,0.9)";  // azul
    if (s.includes("culpabil"))  return "rgba(249,115,22,0.9)";  // naranja
    return "rgba(148,163,184,0.9)";
  }

  // transformamos rutas en paths curvos
  $: maxTotal = Math.max(...$rutasEntreContinentes.map(r => r.total || 0), 1);

  $: arcos = $rutasEntreContinentes
    .map((r, idx) => {
      const cFrom = coords(r.from);
      const cTo   = coords(r.to);
      if (!cFrom || !cTo) return null;

      const { x: x1, y: y1 } = cFrom;
      const { x: x2, y: y2 } = cTo;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;

      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;

      const nx = -dy / dist;
      const ny = dx / dist;

      const baseOffset = 6;
      const variacion  = (idx % 3) - 1; // -1,0,+1 para separar rutas paralelas
      const offset     = baseOffset + variacion * 2;

      const cx = mx + nx * offset;
      const cy = my + ny * offset;

      const d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

      const strokeWidth = 0.3 + (r.total / maxTotal) * 2.2;
      const color = colorMecanismo(r.mecanismoDominante);

      const tooltip = [
        `${r.total} ataques`,
        r.mecanismoDominante ? `Mec: ${r.mecanismoDominante}` : "",
        r.metaforaDominante ? `Met: ${r.metaforaDominante}` : ""
      ].filter(Boolean).join(" · ");

      return {
        key: `${r.from}->${r.to}`,
        d,
        strokeWidth,
        color,
        tooltip,
        ruta: r
      };
    })
    .filter(Boolean);

  let rutaSeleccionada = null;

  function seleccionarRuta(ruta) {
    rutaSeleccionada = ruta;
    dispatch("selectRuta", { ruta });
  }
</script>

<div class="mapa-wrapper">
  <img
    src={mapaSrc}
    alt="Mapa metafórico de rutas entre continentes"
    class="mapa-img"
    draggable="false"
  />

  <svg
    class="map-overlay"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
  >
    {#each arcos as arco}
      <path
        class="arco"
        class:selected={rutaSeleccionada && rutaSeleccionada.from === arco.ruta.from && rutaSeleccionada.to === arco.ruta.to}
        d={arco.d}
        style={`stroke:${arco.color};stroke-width:${arco.strokeWidth};`}
        on:click={() => seleccionarRuta(arco.ruta)}
      >
        <title>{arco.tooltip}</title>
      </path>
    {/each}
  </svg>

  <!-- Hotspots (continentes) -->
  {#each hotspots as h}
    <div
      class="hotspot"
      style={`top:${h.top}%;left:${h.left}%;`}
    >
      <span class="punto"></span>
      <span class="label">{h.label}</span>
    </div>
  {/each}
</div>

<!-- Panel opcional: casos de la ruta seleccionada -->
{#if rutaSeleccionada}
  <section class="panel-ruta">
    <h3>{rutaSeleccionada.from} → {rutaSeleccionada.to}</h3>
    <p class="resumen">
      {rutaSeleccionada.total} ataques ·
      {rutaSeleccionada.mecanismoDominante
        ? `mecanismo dominante: ${rutaSeleccionada.mecanismoDominante}`
        : "sin mecanismo dominante claro"}
    </p>

    <div class="subgrid">
      <div>
        <h4>Por mecanismo</h4>
        <ul>
          {#each rutaSeleccionada.porMecanismo as [m, c]}
            <li>{m} · {c}</li>
          {/each}
        </ul>
      </div>
      <div>
        <h4>Por metáfora</h4>
        <ul>
          {#each rutaSeleccionada.porMetafora as [m, c]}
            <li>{m} · {c}</li>
          {/each}
        </ul>
      </div>
    </div>

    <h4>Casos de esta ruta</h4>
    <ul class="lista-casos">
      {#each rutaSeleccionada.casos as c}
        <li>
          <strong>{c.ejemplo}</strong>
          {#if c.tipo_victima} · {c.tipo_victima}{/if}
          {#if c.canal} · {c.canal}{/if}
          {#if c.mecanismo} · <em>{c.mecanismo}</em>{/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .mapa-wrapper {
    position: relative;
    width: 100%;
    max-width: 100%;
    border-radius: 0.75rem;
    overflow: hidden;
    border: 1px solid #1f2937;
    background: #020617;
  }

  .mapa-img {
    display: block;
    width: 100%;
    height: auto;
    max-width: 100%;
    pointer-events: none;
    user-select: none;
  }

  .map-overlay {
    position: absolute;
    inset: 0;
    pointer-events: auto;
  }

  .arco {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.65;
    cursor: pointer;
    transition:
      opacity 0.15s ease,
      stroke-width 0.15s ease,
      filter 0.15s ease;
  }

  .arco:hover {
    opacity: 1;
    filter: drop-shadow(0 0 4px rgba(148, 163, 184, 0.8));
  }

  .arco.selected {
    opacity: 1;
    filter: drop-shadow(0 0 6px rgba(250, 204, 21, 0.9));
  }

  .hotspot {
    position: absolute;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    gap: 0.25rem;
    pointer-events: none; /* para que los clicks vayan a los arcos */
  }

  .punto {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #0f172a;
    border: 1px solid #22d3ee;
  }

  .label {
    font-size: 0.7rem;
    color: #e5e7eb;
    text-shadow: 0 1px 2px #020617;
  }

  .panel-ruta {
    margin-top: 0.75rem;
    padding: 0.75rem;
    border-radius: 0.75rem;
    border: 1px solid #1f2937;
    background: #020617;
    font-size: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .panel-ruta h3 {
    margin: 0;
    font-size: 0.9rem;
  }

  .resumen {
    margin: 0;
    color: #e5e7eb;
  }

  .subgrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.5rem;
  }

  .subgrid h4 {
    margin: 0 0 0.2rem;
    font-size: 0.78rem;
  }

  .subgrid ul {
    margin: 0;
    padding-left: 1.1rem;
    font-size: 0.75rem;
  }

  .lista-casos {
    margin: 0;
    padding-left: 1.1rem;
    max-height: 180px;
    overflow-y: auto;
  }

  .lista-casos li {
    margin-bottom: 0.25rem;
  }
</style>
