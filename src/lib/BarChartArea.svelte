<script>
    import BarChart from "./BarChart.svelte";
    import {
        conteosFiltrados
    } from "../stores/store"
</script>

<section class="grid-charts">
          <BarChart
            titulo="Top categorías en el filtro actual"
            data={$conteosFiltrados.categorias}
            maxItems={8}
          />
          <BarChart
            titulo="Top metáforas en el filtro actual"
            data={$conteosFiltrados.metaforas}
            maxItems={8}
          />
          <BarChart
            titulo="Top canales en el filtro actual"
            data={$conteosFiltrados.canales}
            maxItems={6}
          />
        </section> 


<style>

    
  .grid-charts {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 2fr) minmax(0, 1.5fr);
    gap: 0.75rem;
  }

  @media (max-width: 900px) {
    .grid-charts {
      grid-template-columns: 1fr;
    }
  }

</style>