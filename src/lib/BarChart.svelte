<script>
  // data: [{ label, value }]
  export let data = [];
  export let titulo = "";
  export let maxItems = 10;

  $: topData = data
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, maxItems);

  $: maxValue = Math.max(1, ...topData.map(d => d.value || 0));
</script>

<section class="chart">
  <header>
    <h2>{titulo}</h2>
    <p class="sub">
      Top {maxItems} · total categorías: {data.length}
    </p>
  </header>

  {#if topData.length === 0}
    <p class="empty">No hay datos para mostrar.</p>
  {:else}
    <div class="bars">
      {#each topData as d}
        <div class="row">
          <div class="label">{d.label}</div>
          <div class="bar-wrapper">
            <div
              class="bar"
              style={`--w:${(d.value / maxValue) * 100}%;`}
            ></div>
          </div>
          <div class="value">{d.value}</div>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .chart {
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
  .empty {
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: #9ca3af;
  }
  .bars {
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .row {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 4fr) auto;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8rem;
  }
  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .bar-wrapper {
    background: #020617;
    border-radius: 999px;
    height: 0.8rem;
    overflow: hidden;
    border: 1px solid #1f2937;
  }
  .bar {
    height: 100%;
    width: var(--w, 10%);
    max-width: 100%;
    background: linear-gradient(90deg, #22c55e, #84cc16);
  }
  .value {
    font-variant-numeric: tabular-nums;
    font-size: 0.75rem;
    color: #e5e7eb;
  }
</style>
