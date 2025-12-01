<script>
  export let items = [
    { label: "Categorías", color: "#22c55e" },
    { label: "Metáforas", color: "#38bdf8" },
    { label: "Mecanismos", color: "#f97316" },
    { label: "Canales", color: "#a855f7" }
  ];
</script>

<div class="legend">
  {#each items as item}
    <div class="legend-item">
      <span class="color" style="background:{item.color}"></span>
      {item.label}
    </div>
  {/each}
</div>

<style>
  .legend {
    display: flex;
    gap: 1rem;
    padding: 0.5rem 0;
    font-size: 0.85rem;
    color: #e5e7eb;
    flex-wrap: wrap;
  }
  .legend-item { display: flex; align-items: center; gap: 0.3rem; }
  .color {
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }
</style>
