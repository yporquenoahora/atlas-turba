<script>
  import { createEventDispatcher } from "svelte";

  export let titulo = "";
  // items: [{ nombre, count, active, disabled }]
  export let items = [];

  const dispatch = createEventDispatcher();

  function toggle(nombre) {
    dispatch("toggle", { nombre });
  }

  // Escalamos el tamaño de fuente según count
  $: maxCount = Math.max(1, ...items.map(i => i.count || 1));
</script>

<section class="cloud">
  <header>
    <h2>{titulo}</h2>
    <p class="sub">
      {items.length} conceptos · clic para filtrar
    </p>
  </header>

  <div class="tags">
    {#each items as item}
      <button
        class="tag {item.active ? 'active' : ''} {item.disabled ? 'disabled' : ''}"
        style={`--scale:${0.7 + 0.3 * (item.count / maxCount)};`}
        on:click={() => !item.disabled && toggle(item.nombre)}
      >
        {item.nombre}
        <span class="count">{item.count}</span>
      </button>
    {/each}
  </div>
</section>

<style>
  .cloud {
    background: #020617;
    border-radius: 0.75rem;
    border: 1px solid #1f2937;
    padding: 0.75rem;
  }

  h2 {
    margin: 0;
    font-size: 0.95rem;
  }

  .sub {
    margin: 0.2rem 0 0;
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .tags {
    margin-top: 0.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .tag {
    border-radius: 999px;
    border: 1px solid #374151;
    padding: 0.2rem 0.6rem;
    font-size: calc(0.75rem * var(--scale, 1));
    background: #030712;
    color: #e5e7eb;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    opacity: 0.9;
    transition: transform 0.1s ease, background 0.1s ease, opacity 0.1s;
  }

  .tag:hover {
    transform: translateY(-1px);
    background: #111827;
  }

  .tag.active {
    border-color: #22d3ee;
    background: radial-gradient(circle at top left, #22d3ee33, #020617);
  }

  .tag.disabled {
    opacity: 0.25;
    cursor: default;
  }

  .count {
    font-size: 0.7em;
    color: #9ca3af;
  }
</style>
