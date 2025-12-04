<script>
    import { filtros, categoriasUnicas } from "../stores/store";

    function setFiltro(partial) {
        filtros.update((f) => ({ ...f, ...partial }));
    }
</script>

<h2>Filtros básicos</h2>

<label>
    Categoría
    <select
        bind:value={$filtros.categoria}
        on:change={(e) => setFiltro({ categoria: e.target.value })}
    >
        <option value="todas">todas</option>
        {#each categoriasUnicas as c}
            <option value={c}>{c}</option>
        {/each}
    </select>
</label>

<label>
    Metáfora dominante
    <select
        bind:value={$filtros.metafora}
        on:change={(e) => setFiltro({ metafora: e.target.value })}
    >
        <option value="todas">todas</option>
        {#each metaforasUnicas as m}
            <option value={m}>{m}</option>
        {/each}
    </select>
</label>

<label>
    Mecanismo
    <select
        bind:value={$filtros.mecanismo}
        on:change={(e) => setFiltro({ mecanismo: e.target.value })}
    >
        <option value="todos">todos</option>
        {#each mecanismosUnicos as m}
            <option value={m}>{m}</option>
        {/each}
    </select>
</label>

<label>
    Canal
    <select
        bind:value={$filtros.canal}
        on:change={(e) => setFiltro({ canal: e.target.value })}
    >
        <option value="todos">todos</option>
        {#each canalesUnicos as c}
            <option value={c}>{c}</option>
        {/each}
    </select>
</label>
