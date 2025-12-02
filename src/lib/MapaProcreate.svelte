<script>
  import { createEventDispatcher } from "svelte";
  import mapaSrc from "../assets/mapaProcreate.png";

  // IMPORTAMOS STORES PARA SINCRONIZAR
  import {
    continentesConfig,
    filtrados,
    ataquesPerfil,
    ataqueActual
  } from "../stores/store.js"; // ajusta la ruta a tu store real

  const dispatch = createEventDispatcher();

  // si quieres resaltar continente desde fuera
  export let continenteActivo = null;

  // Hotspots colocados en % sobre el mapa
  // el id DEBE coincidir con continentesConfig[id]
  const hotspots = [
    { id: "espectaculo",     top: "18%", left: "18%" },
    { id: "ciencia",         top: "25%", left: "60%" },
    { id: "bestiario",       top: "55%", left: "12%" },
    { id: "pueblo_politico", top: "50%", left: "55%" },
    { id: "economia",        top: "70%", left: "40%" },
    { id: "redes",           top: "30%", left: "35%" },
    { id: "ficcion",         top: "35%", left: "80%" },
    { id: "cronica_negra",   top: "75%", left: "75%" } // ojo: sin tilde en el id
  ];

  // helpers: ejemplos y ataques por continente
  function ejemplosDeContinente(cont) {
    if (!$filtrados || !Array.isArray($filtrados)) return [];
    const matchCats = cont.matchCategorias || [];
    return $filtrados.filter(
      (e) => e.categoria && matchCats.includes(e.categoria)
    );
  }

  function ataquesDeContinente(cont) {
    if (!$ataquesPerfil.ataques || !Array.isArray($ataquesPerfil.ataques)) {
      return [];
    }
    const matchCats = cont.matchCategorias || [];
    return $ataquesPerfil.ataques.filter(
      (e) => e.categoria && matchCats.includes(e.categoria)
    );
  }

  // continente asociado al ataque actual del replay
  $: continenteAtaqueActualId = (() => {
    if (!$ataqueActual || !$ataqueActual.ataque) return null;
    const cat = $ataqueActual.ataque.categoria;
    if (!cat) return null;

    const cont = continentesConfig.find((c) =>
      (c.matchCategorias || []).includes(cat)
    );
    return cont ? cont.id : null;
  })();

  // stats preparados para la vista
  $: hotspotStats = hotspots.map((h) => {
    const cont = continentesConfig.find((c) => c.id === h.id);
    if (!cont) {
      return { ...h, label: h.id, ejemplos: 0, ataques: 0 };
    }
    const ej = ejemplosDeContinente(cont);
    const at = ataquesDeContinente(cont);
    return {
      ...h,
      label: cont.label || h.id,
      ejemplos: ej.length,
      ataques: at.length
    };
  });

  function clickHotspot(id) {
    const cont = continentesConfig.find((c) => c.id === id);
    dispatch("selectContinente", { id, continente: cont || null });
  }

  // qué continente consideramos “activo” visualmente:
  // 1) el que venga por prop, si existe
  // 2) si no, el del ataque actual
  $: continenteActivoEfectivo = continenteActivo ?? continenteAtaqueActualId;
</script>

<div class="mapa-wrapper">
  <img
    src={mapaSrc}
    alt="Mapa metafórico de la turba"
    class="mapa-img"
    draggable="false"
  />

  {#each hotspotStats as h}
    <button
      type="button"
      class="hotspot"
      class:activo={h.id === continenteActivoEfectivo}
      style={`top:${h.top};left:${h.left};`}
      on:click={() => clickHotspot(h.id)}
      aria-label={`Seleccionar continente ${h.label}`}
      data-ataques={h.ataques}
    >
      <span class="pulse"></span>

      {#if h.ataques > 0}
        <span class="badge">{h.ataques}</span>
      {:else if h.ejemplos > 0}
        <span class="badge badge-soft">{h.ejemplos}</span>
      {/if}
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
    width: 34px;
    height: 34px;
    border-radius: 999px;
    border: 1px solid #22d3ee;
    background: radial-gradient(circle, #22d3ee40, transparent);
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    outline: none;
    transition:
      border-color 0.15s ease,
      background 0.15s ease,
      transform 0.1s ease,
      opacity 0.15s ease;
    opacity: 0.6;
  }

  .hotspot:hover {
    transform: translate(-50%, -50%) scale(1.05);
    opacity: 1;
  }

  .hotspot .pulse {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: #22d3ee;
  }

  /* badge con número de ataques / ejemplos */
  .badge {
    position: absolute;
    bottom: -4px;
    right: -4px;
    transform: translate(25%, 25%);
    min-width: 18px;
    height: 18px;
    border-radius: 999px;
    background: #ef4444;
    color: #f9fafb;
    font-size: 0.65rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    border: 1px solid #020617;
    font-variant-numeric: tabular-nums;
  }

  .badge-soft {
    background: #4b5563;
  }

  /* si no hay ataques ni ejemplos → casi apagado */
  .hotspot[data-ataques="0"]:not(:has(.badge)) {
    opacity: 0.25;
  }

  /* ANIMACIONES según tipo */

  @keyframes pulse-ataques {
    0%   { transform: scale(1);   box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
    70%  { transform: scale(1.15); box-shadow: 0 0 0 14px rgba(239, 68, 68, 0); }
    100% { transform: scale(1);   box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  }

  @keyframes ping-actual {
    0%   { transform: scale(1);   box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.8); }
    60%  { transform: scale(1.25); box-shadow: 0 0 0 18px rgba(251, 191, 36, 0); }
    100% { transform: scale(1);   box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
  }

  /* hotspots con ataques laten en rojo */
  .hotspot[data-ataques]:not([data-ataques="0"]) .pulse {
    animation: pulse-ataques 1.8s ease-out infinite;
    background: #ef4444;
  }

  /* hotspot activo (seleccionado o del ataque actual) */
  .hotspot.activo {
    border-color: #fbbf24;
    background: radial-gradient(circle, #fbbf2440, transparent);
    opacity: 1;
  }

  .hotspot.activo .pulse {
    animation: ping-actual 1.1s ease-out infinite;
    background: #facc15;
  }

  @media (max-width: 768px) {
    .mapa-wrapper {
      border-radius: 0.5rem;
    }

    .hotspot {
      width: 26px;
      height: 26px;
    }

    .hotspot .pulse {
      width: 8px;
      height: 8px;
    }

    .badge {
      min-width: 16px;
      height: 16px;
      font-size: 0.6rem;
    }
  }
</style>
