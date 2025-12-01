<script>
  import { createEventDispatcher } from "svelte";
  import mapaSrc from "../assets/mapaProcreate.png";
  import { continentesConfig } from "../stores/store.js";

  const dispatch = createEventDispatcher();

  // Hotspots colocados en % sobre el mapa
  // Ajusta estos % mirando el mapa en el navegador
  const hotspots = [
    { id: "espectaculo",    top: "18%", left: "18%" },
    { id: "ciencia",        top: "25%", left: "60%" },
    { id: "bestiario",      top: "55%", left: "12%" },
    { id: "pueblo_politico",top: "50%", left: "55%" },
    { id: "economia",       top: "70%", left: "40%" },
    { id: "redes",          top: "30%", left: "35%" },
    { id: "ficcion",        top: "35%", left: "80%" },
    { id: "crónica_negra",  top: "75%", left: "75%" }
  ];

  // si quieres resaltar el continente activo desde fuera
  export let continenteActivo = null;

  function clickHotspot(id) {
    const cont = continentesConfig.find(c => c.id === id);
    dispatch("selectContinente", { id, continente: cont || null });
  }
</script>
<h1>Mapa procreate - WIP</h1>
<div class="mapa-wrapper">
  <img
    src={mapaSrc}
    alt="Mapa metafórico de la turba"
    class="mapa-img"
    draggable="false"
  />

  {#each hotspots as h}
    <button
      type="button"
      class="hotspot"
      class:activo={h.id === continenteActivo}
      style={`top:${h.top};left:${h.left};`}
      on:click={() => clickHotspot(h.id)}
      aria-label={`Seleccionar continente ${h.id}`}
    >
      <span class="pulse"></span>
    </button>
  {/each}
</div>

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

  .hotspot {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 32px;
    height: 32px;
    border-radius: 999px;
    border: 1px solid #22d3ee;
    background: radial-gradient(circle, #22d3ee55, transparent);
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    outline: none;
  }

  .hotspot .pulse {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: #22d3ee;
  }

  .hotspot.activo {
    border-color: #f97316;
    background: radial-gradient(circle, #f9731666, transparent);
  }

  .hotspot.activo .pulse {
    background: #f97316;
  }

  @media (max-width: 768px) {
    .mapa-wrapper {
      border-radius: 0.5rem;
    }

    .hotspot {
      width: 24px;
      height: 24px;
    }

    .hotspot .pulse {
      width: 8px;
      height: 8px;
    }
  }
</style>
