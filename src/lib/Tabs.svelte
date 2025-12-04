<script>
    import { ui, filtros } from "../stores/store";

    import { COLORES_TIPO } from "../lib/theme.js";

    function toggleTab(tab) {
        ui.update((u) => ({
            ...u,
            // si vuelves a hacer click en la misma pestaña -> la desactivas
            nubeVista: u.nubeVista === tab ? null : tab,
            busquedaTag: "", // reseteamos el buscador de tags
        }));
    }

    // clic en un tag de la nube (usa la pestaña activa del store ui)
    function handleToggleTag(evt) {
        const { nombre } = evt.detail;
        const vista = $ui.nubeVista;

        filtros.update((f) => {
            if (vista === "metaforas") {
                return {
                    ...f,
                    metafora: f.metafora === nombre ? "todas" : nombre,
                };
            } else if (vista === "categorias") {
                return {
                    ...f,
                    categoria: f.categoria === nombre ? "todas" : nombre,
                };
            } else if (vista === "mecanismos") {
                return {
                    ...f,
                    mecanismo: f.mecanismo === nombre ? "todos" : nombre,
                };
            } else if (vista === "canales") {
                return { ...f, canal: f.canal === nombre ? "todos" : nombre };
            }
            return f;
        });
    }
</script>

<div class="tabs">
    <button
        class:selected={$ui.nubeVista === "metaforas"}
        style={`--tab-color: ${COLORES_TIPO.metaforas}`}
        on:click={() => toggleTab("metaforas")}
    >
        Metáforas
    </button>
    <button
        class:selected={$ui.nubeVista === "categorias"}
        style={`--tab-color: ${COLORES_TIPO.categorias}`}
        on:click={() => toggleTab("categorias")}
    >
        Categorías
    </button>
    <button
        class:selected={$ui.nubeVista === "mecanismos"}
        style={`--tab-color: ${COLORES_TIPO.mecanismos}`}
        on:click={() => toggleTab("mecanismos")}
    >
        Mecanismos
    </button>
    <button
        class:selected={$ui.nubeVista === "canales"}
        style={`--tab-color: ${COLORES_TIPO.canales}`}
        on:click={() => toggleTab("canales")}
    >
        Canales
    </button>
</div>


<style>

    .tabs {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .tabs button {
    border-radius: 999px;
    border: 1px solid #374151;
    background: #020617;
    color: #e5e7eb;
    font-size: 0.8rem;
    padding: 0.25rem 0.7rem;
    cursor: pointer;
  }

  .tabs button.selected {
    border-color: #22d3ee;
    background: radial-gradient(circle at top left, #22d3ee33, #020617);
  }

</style>