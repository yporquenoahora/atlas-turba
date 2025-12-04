<script>
    // @ts-nocheck

    import { filtros } from "../stores/store";

    function setFiltro(partial) {
        filtros.update((f) => ({ ...f, ...partial }));
    }
</script>

<label>
   
    <input
        class="input-tag"
        type="text"
        placeholder="Ej: tiburones, Sálvame, científicos..."
        bind:value={$filtros.texto}
        on:input={(e) => setFiltro({ texto: e.target.value })}
    />
</label>

<style>
    .input-tag {
        flex: 1 1 180px;
        max-width: 260px;
        padding: 0.3rem 0.5rem;
        border-radius: 999px;
        border: 1px solid #374151;
        background: #030712;
        color: #f9fafb;
        font-size: 0.8rem;
    }
</style>
