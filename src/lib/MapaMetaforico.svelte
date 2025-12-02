<script>
  // Ajusta la ruta al store real (atlasStores / store, etc.)
  import {
    continentesConfig,
    filtrados,
    ataquesPerfil,
    ataqueActual
  } from "../stores/store.js";

  // Ya no necesitamos props: el mapa se alimenta de los stores
  // export let ejemplos = [];  // ❌ fuera
  // export let ataqueActualId = null; // ❌ fuera

  // Ejemplos que caen dentro de un continente
  function ejemplosDeContinente(cont) {
    if (!$filtrados || !Array.isArray($filtrados)) return [];
    const matchCats = cont.matchCategorias || [];
    return $filtrados.filter(
      (e) => e.categoria && matchCats.includes(e.categoria)
    );
  }

  // Set de ids que son ataques al perfil seleccionado
  $: ataquesIds = new Set(
    $ataquesPerfil.ataques
      ? $ataquesPerfil.ataques.map((a) => a.id).filter(Boolean)
      : []
  );

  // Id del ataque actual para resaltarlo
  $: ataqueActualId = $ataqueActual ? $ataqueActual.ataque.id : null;
</script>

<section class="world-map">
  {#each continentesConfig as cont}
    {#if ejemplosDeContinente(cont).length > 0}
      <article class="continente">
        <h3>{cont.label}</h3>
        {#if cont.descripcion}
          <p class="cont-desc">{cont.descripcion}</p>
        {/if}

        <div class="grid-ciudades">
          {#each ejemplosDeContinente(cont) as e}
            <div
              class="ciudad"
              class:afectada={ataquesIds.has(e.id)}
              class:actual={ataqueActualId === e.id}
              title={e.ejemplo}
            >
              <span class="punto"></span>
              <span class="nombre">{e.ejemplo}</span>
            </div>
          {/each}
        </div>
      </article>
    {/if}
  {/each}
</section>

<style>
  .world-map {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.75rem;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  .continente {
    border-radius: 0.75rem;
    border: 1px solid #1f2937;
    background: radial-gradient(circle at top, #020617, #030712);
    padding: 0.6rem;
    font-size: 0.78rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 0;
    transition: border-color 0.15s ease, background 0.15s ease,
      transform 0.1s ease;
  }

  .continente:hover {
    border-color: #22c55e55;
    transform: translateY(-1px);
  }

  .continente h3 {
    margin: 0;
    font-size: 0.85rem;
  }

  .cont-desc {
    margin: 0;
    color: #9ca3af;
    font-size: 0.72rem;
  }

  .grid-ciudades {
    margin-top: 0.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-height: 220px;
    overflow-y: auto;
  }

  .ciudad {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    opacity: 0.65;
    min-width: 0;
    font-size: 0.76rem;
  }

  .nombre {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Estado: es ataque de este perfil */
  .ciudad.afectada {
    opacity: 1;
    font-weight: 600;
  }

  /* Estado: es el ataque actual del replay */
  .ciudad.actual {
    opacity: 1;
    font-weight: 700;
  }

  .punto {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #f97316;
    flex-shrink: 0;
  }

  .ciudad.afectada .punto {
    background: #ef4444;
  }

  .ciudad.actual .punto {
    background: #22c55e;
    box-shadow: 0 0 0 4px #22c55e66;
  }

  @media (max-width: 768px) {
    .world-map {
      grid-template-columns: 1fr;
    }
  }

  /* --- ANIMACIONES --- */

  @keyframes pulse-attack {
    0%   { transform: scale(1);   box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
    70%  { transform: scale(1.15); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
    100% { transform: scale(1);   box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  }

  @keyframes ping-actual {
    0%   { transform: scale(1);   box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6); }
    60%  { transform: scale(1.3); box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
    100% { transform: scale(1);   box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
  }

  .ciudad.afectada .punto {
    animation: pulse-attack 1.6s ease-out infinite;
  }

  .ciudad.actual .punto {
    animation: ping-actual 0.9s ease-out infinite;
  }
</style>
