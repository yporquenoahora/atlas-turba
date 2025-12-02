<script>
  import { onDestroy } from "svelte";
  import {
    ataquesPerfil,
    ataqueIndex,
    ataqueActual
  } from "../stores/store"; // ajusta la ruta

  let playing = false;
  let timer = null;
  let logContainer;

  function stop() {
    playing = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function tick() {
    if (!$ataquesPerfil || !$ataquesPerfil.total) {
      stop();
      return;
    }

    ataqueIndex.update(i => {
      const next = i + 1;
      if (next >= $ataquesPerfil.total) {
        // último ataque → nos quedamos ahí y paramos
        stop();
        return $ataquesPerfil.total - 1;
      }
      return next;
    });
  }

  function play() {
    if (playing) return;
    if (!$ataquesPerfil || !$ataquesPerfil.total) return;

    playing = true;
    timer = setInterval(tick, 1200); // 1.2 s por ataque
  }

  function reset() {
    stop();
    ataqueIndex.set(0);
  }

  onDestroy(stop);

  // --- derivados para vida y log ---

  $: vidasPerfil =
    $ataquesPerfil.perfil ? ($ataquesPerfil.perfil.vidas ?? 3) : 3;

  $: golpesRecibidos =
    $ataquesPerfil.total === 0 || !$ataqueActual
      ? 0
      : Math.min($ataqueActual.index + 1, $ataquesPerfil.total);

  $: vidaRestante =
    vidasPerfil > 0
      ? Math.max(0, 1 - golpesRecibidos / vidasPerfil)
      : 0;

  // lista completa de ataques
  $: ataquesMostrados =
    $ataquesPerfil.ataques
      ? $ataquesPerfil.ataques.slice(0, golpesRecibidos)
      : [];

  // índice actual (para marcarlo en el log)
  $: currentIndex =
    golpesRecibidos > 0 ? golpesRecibidos - 1 : -1;

  // hacer scroll automático hacia el último ataque mostrado
  $: if (logContainer && ataquesMostrados.length > 0) {
    // chat-style: baja al final
    logContainer.scrollTop = logContainer.scrollHeight;
  }
</script>

<section class="panel panel-juego">
  <h2>Partida: ataques recibidos</h2>

  {#if $ataquesPerfil.perfil}
    {#if $ataquesPerfil.total === 0}
      <p class="replay-info">
        Este personaje no recibe ataques con los filtros actuales.
      </p>
    {:else}
      <p class="replay-info">
        Ataques totales posibles en esta vista:
        <strong>{$ataquesPerfil.total}</strong>
      </p>

      <div class="replay-controles">
        <button type="button" on:click={stop} disabled={!playing}>
          ⏸ Pausa
        </button>
        <button type="button" on:click={reset}>
          ⏮ Reiniciar
        </button>
        <button
          type="button"
          on:click={play}
          disabled={playing || !$ataquesPerfil.total}
        >
          ▶ Reproducir
        </button>
      </div>

      <!-- ATAQUE ACTUAL, SOLO UNO EN PRIMER PLANO -->
      {#if $ataqueActual}
        <article class="card card-actual">
          <h3>Ataque actual #{ $ataqueActual.index + 1 }</h3>
          <p class="titulo-ataque">{ $ataqueActual.ataque.ejemplo }</p>
          <p class="tags">
            <span>{ $ataqueActual.ataque.categoria }</span> ·
            <span>Metáfora: { $ataqueActual.ataque.metafora_dominante }</span> ·
            <span>{ $ataqueActual.ataque.canal }</span>
          </p>
          {#if $ataqueActual.ataque.descripcion}
            <p class="desc-ataque">{ $ataqueActual.ataque.descripcion }</p>
          {/if}
        </article>
      {/if}

      <!-- BARRA DE VIDA -->
      <div class="barra-vida">
        <div
          class="barra-vida-fill"
          style={`--vida:${Math.round(vidaRestante * 100)}%;`}
        ></div>
      </div>

      <p class="replay-info">
        Golpes recibidos:
        <strong>{golpesRecibidos}</strong> / {vidasPerfil} vidas
        {#if $ataqueActual}
          · Ataque actual #{ $ataqueActual.index + 1 }
        {/if}
      </p>

      <!-- LOG COMPLETO, PERO SCROLLEANDO HASTA EL ÚLTIMO -->
      <p class="log-titulo-general">
        Historial de ataques (se va revelando uno a uno):
      </p>
      <ul class="log-ataques" bind:this={logContainer}>
        {#each ataquesMostrados as a, i}
          <li class:actual={i === currentIndex}>
            <span class="log-index">#{i + 1}</span>
            <span class="log-titulo">{a.ejemplo}</span>
            <span class="log-meta">
              {a.categoria} · {a.metafora_dominante} · {a.canal}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  {:else}
    <p class="replay-info">
      Elige un personaje para iniciar la partida.
    </p>
  {/if}
</section>

<style>
  .panel-juego {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .replay-controles {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .replay-controles button {
    border-radius: 999px;
    border: 1px solid #374151;
    background: #020617;
    color: #e5e7eb;
    font-size: 0.75rem;
    padding: 0.25rem 0.7rem;
    cursor: pointer;
  }

  .replay-controles button:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .replay-info {
    font-size: 0.8rem;
    color: #e5e7eb;
    margin: 0.2rem 0;
  }

  .card-actual {
    border-radius: 0.75rem;
    border: 1px solid #f97316aa;
    background: radial-gradient(circle at top left, #f9731622, #030712);
    padding: 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .card-actual h3 {
    margin: 0;
    font-size: 0.9rem;
  }

  .titulo-ataque {
    margin: 0;
    font-size: 0.88rem;
    font-weight: 600;
  }

  .tags {
    margin: 0;
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .desc-ataque {
    margin: 0.3rem 0 0;
    font-size: 0.8rem;
  }

  .barra-vida {
    margin: 0.1rem 0 0.2rem 0;
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
    transition: width 0.4s ease-out;
  }

  .log-titulo-general {
    font-size: 0.78rem;
    color: #9ca3af;
    margin: 0.3rem 0 0.1rem 0;
  }

  .log-ataques {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-height: 220px;
    overflow-y: auto;
    font-size: 0.78rem;
  }

  .log-ataques li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.4rem;
    align-items: baseline;
    padding: 0.25rem 0.3rem;
    border-radius: 0.5rem;
    background: #020617;
    border: 1px solid #111827;
    opacity: 0.5;
  }

  .log-ataques li.actual {
    opacity: 1;
    border-color: #f97316;
    background: radial-gradient(circle at top left, #f973161a, #020617);
  }

  .log-index {
    font-variant-numeric: tabular-nums;
    color: #9ca3af;
  }

  .log-titulo {
    font-weight: 600;
  }

  .log-meta {
    grid-column: 2 / 3;
    color: #9ca3af;
    font-size: 0.7rem;
  }
</style>
