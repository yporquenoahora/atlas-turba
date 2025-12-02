<script>
    // continentes: array de objetos tipo continentesConfig
    // ejemplos: lista de ejemplos filtrados ($filtrados)
    // ataquesPerfil: objeto derivado del store { perfil, ataques, total, sobrevive }

    // @ts-ignore
    import { continentesConfig, perfilesPersonaje, ataqueActual } from "../stores/store.js";
    // @ts-ignore
    import { perfilActivo, ataquesPerfil } from "../stores/store.js";

    let continentes = continentesConfig;
    export let ejemplos = [];

    export let ataqueActualId = null; // 👈 nuevo
    //export let ataquesPerfil = null;

    // si ataquesPerfil viene con una lista de ejemplos, creamos un set de ids
    $: ataquesIds = new Set(
        // @ts-ignore
        ataquesPerfil?.ataques
            // @ts-ignore
            ? ataquesPerfil.ataques.map((a) => a.id).filter(Boolean)
            : [],
    );

    function ejemplosDeContinente(cont) {
        if (!Array.isArray(ejemplos)) return [];
        const matchCats = cont.matchCategorias || [];
        return ejemplos.filter(
            (e) => e.categoria && matchCats.includes(e.categoria),
        );
    }
</script>

<section class="world-map">
    {#each continentes as cont}
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
    }

    .ciudad.afectada {
        opacity: 1;
        font-weight: 600;
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
        box-shadow: 0 0 0 4px #ef444444;
    }

    .nombre {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    @media (max-width: 768px) {
        .world-map {
            grid-template-columns: 1fr;
        }
    }

    .ciudad {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        opacity: 0.65;
        min-width: 0;
    }

    .ciudad.afectada {
        opacity: 1;
        font-weight: 600;
    }

    .ciudad.actual {
        opacity: 1;
        font-weight: 700;
    }

    .ciudad.actual .punto {
        background: #22c55e;
        box-shadow: 0 0 0 4px #22c55e66;
    }
</style>
