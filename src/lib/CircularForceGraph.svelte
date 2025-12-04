<script>
    import Tabs from "./Tabs.svelte";
    // CircularForceGraph.svelte
    export let nodes = []; // [{ id, tipo, label, degree }]
    export let links = []; // [{ source, target, weight }]
    export let activeTipo = "metaforas"; // tab actual

    // mapeo de nombre de tab -> tipo interno de nodo
    const TIPO_MAP = {
        metaforas: "metafora",
        categorias: "categoria",
        mecanismos: "mecanismo",
        canales: "canal",
    };

    $: tipoActivo = TIPO_MAP[activeTipo] || "metafora";

    const R = 45; // radio dentro del viewBox 0-100

    // Colocamos nodos en círculo (no-physics pero “force-like” visualmente)

    let hoveredId = null;

    // helpers para saber si un nodo es vecino del hovered
    function esVecino(id) {
        if (!hoveredId) return false;
        const set = vecinos.get(hoveredId);
        return set ? set.has(id) : false;
    }

    $: positionedNodes = nodes.map((n, idx) => {
        const angle = (2 * Math.PI * idx) / Math.max(nodes.length, 1);
        const cx = 50 + R * Math.cos(angle);
        const cy = 50 + R * Math.sin(angle);
        return { ...n, x: cx, y: cy };
    });

    $: nodeById = new Map(positionedNodes.map((n) => [n.id, n]));

    // normalizamos degree para radio de círculo
    $: degrees = positionedNodes.map((n) => n.degree || 0);
    $: maxDegree = Math.max(...degrees, 1);

    $: maxOcurrencias = Math.max(...nodes.map((n) => n.ocurrencias || 0), 1);

    function nodeRadius(n) {
        const d = n.degree || 0;
        const ratio = d / maxDegree;
        const minR = 2;
        const maxR = 6; // puedes subirlo si quieres más contraste
        return minR + (maxR - minR) * ratio;
    }
    function radius(n) {
        // mínimo 2, máximo ~6, escalado por ocurrencias
        const base = (n.ocurrencias || 1) / maxOcurrencias;
        return 2 + base * 4;
    }
    // lookup rápido id -> nodo

    // normalización de pesos para grosor de links
   

    $: maxWeight = Math.max(...links.map((l) => l.weight || 0), 1);

    function labelTipo(tipo) {
        if (tipo === "metafora") return "Metáfora";
        if (tipo === "categoria") return "Categoría";
        if (tipo === "mecanismo") return "Mecanismo";
        if (tipo === "canal") return "Canal";
        return tipo;
    }
    function linkColor(tipoA, tipoB) {
        const pares = [tipoA, tipoB].sort().join("-");

        switch (pares) {
            case "categoria-metafora":
                return "rgba(56, 189, 248, 0.8)"; // azul claro
            case "categoria-mecanismo":
                return "rgba(249, 115, 22, 0.9)"; // naranja
            case "categoria-canal":
                return "rgba(139, 92, 246, 0.9)"; // violeta
            case "metafora-mecanismo":
                return "rgba(34, 197, 94, 0.9)"; // verde
            case "metafora-canal":
                return "rgba(45, 212, 191, 0.9)"; // turquesa
            case "canal-mecanismo":
                return "rgba(239, 68, 68, 0.9)"; // rojo
            case "categoria-categoria":
            case "metafora-metafora":
            case "mecanismo-mecanismo":
            case "canal-canal":
                return "rgba(148, 163, 184, 0.5)"; // gris para vínculos intra-tipo
            default:
                return "rgba(148, 163, 184, 0.4)";
        }
    }

    const MAX_NODOS_ACTIVOS = 20; // máx. nodos del tipo activo
    const MAX_VECINOS_EXTRA = 10; // máx. nodos vecinos

    // mapa de vecinos por id
    $: vecinos = (() => {
        const m = new Map();
        for (const l of links) {
            const { source, target } = l;
            if (!m.has(source)) m.set(source, new Set());
            if (!m.has(target)) m.set(target, new Set());
            m.get(source).add(target);
            m.get(target).add(source);
        }
        return m;
    })();

    // nodos del tipo activo, ordenados por degree
    $: activosOrdenados = positionedNodes
        .filter((n) => n.tipo === tipoActivo)
        .sort((a, b) => (b.degree || 0) - (a.degree || 0));

    // cogemos los top N activos
    $: nodosActivosTop = activosOrdenados.slice(0, MAX_NODOS_ACTIVOS);
    $: idsActivos = new Set(nodosActivosTop.map((n) => n.id));

    // vecinos de esos nodos activos
    $: idsVecinos = new Set();
    $: {
        for (const id of idsActivos) {
            const vs = vecinos.get(id);
            if (!vs) continue;
            for (const v of vs) {
                idsVecinos.add(v);
            }
        }
    }

    // construimos el set final de nodos visibles
    $: todosVisibles = new Set([...idsActivos, ...idsVecinos]);

    // limitamos también el nº de vecinos extra si hace falta
    $: {
        if (idsVecinos.size > MAX_VECINOS_EXTRA) {
            // nos quedamos con los vecinos de mayor degree
            const vecinosNodes = [...idsVecinos]
                .map((id) => nodeById.get(id))
                .filter(Boolean)
                .sort((a, b) => (b.degree || 0) - (a.degree || 0))
                .slice(0, MAX_VECINOS_EXTRA);

            todosVisibles.clear();
            for (const n of nodosActivosTop) todosVisibles.add(n.id);
            for (const n of vecinosNodes) todosVisibles.add(n.id);
        }
    }

    // nodos y enlaces finales que se pintan
    $: visibleNodes = positionedNodes.filter((n) => todosVisibles.has(n.id));

    $: visibleLinks = links.filter((l) => {
        const a = nodeById.get(l.source);
        const b = nodeById.get(l.target);
        if (!a || !b) return false;
        return todosVisibles.has(a.id) && todosVisibles.has(b.id);
    });
</script>

<section class="circular-graph">
    <header class="header">
        <h3>Mapa circular de coocurrencias</h3>
        <p>Resaltando: {labelTipo(tipoActivo)}</p>
    </header>
    <Tabs />
    <div class="canvas-wrapper">
        <svg
            viewBox="0 0 100 100"
            class="svg"
            preserveAspectRatio="xMidYMid meet"
        >
            <!-- LINKS -->
            {#each visibleLinks as l}
                {@const a = nodeById.get(l.source)}
                {@const b = nodeById.get(l.target)}
                {#if a && b}
                    <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        class="link"
                        class:hovered={hoveredId &&
                            (l.source === hoveredId || l.target === hoveredId)}
                        class:dimmed={hoveredId &&
                            l.source !== hoveredId &&
                            l.target !== hoveredId}
                        style={`stroke:${linkColor(a.tipo, b.tipo)};stroke-width:${0.2 + (l.weight / maxWeight) * 1.5}`}
                    />
                {/if}
            {/each}

            <!-- NODOS -->
            {#each visibleNodes as n}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <g
                    class="node"
                    class:active={n.tipo === tipoActivo}
                    class:hovered={hoveredId === n.id}
                    class:neighbor={esVecino(n.id)}
                    class:dimmed={hoveredId &&
                        hoveredId !== n.id &&
                        !esVecino(n.id)}
                    transform={`translate(${n.x},${n.y})`}
                    on:mouseenter={() => (hoveredId = n.id)}
                    on:mouseleave={() => (hoveredId = null)}
                >
                  <text
                        x="0"
                        y={-nodeRadius(n) - 1}
                        class="label"
                        class:label-activa={n.tipo === tipoActivo}
                        class:label-hover={hoveredId === n.id || esVecino(n.id)}
                    >
                        {n.label}
                    </text>
                    <circle r={nodeRadius(n)} />
                  
                </g>
            {/each}
        </svg>
    </div>
</section>

<style>
    .circular-graph {
        padding: 0.6rem;
        border-radius: 0.75rem;
        border: 1px solid #1f2937;
        background: #020617;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }

    .canvas-wrapper {
        width: 100%;
        aspect-ratio: 1 / 1; /* siempre cuadrado */
        max-height: 260px; /* puedes subirlo a 280/300 si quieres */
    }

    .svg {
        width: 100%;
        height: 100%;
    }

    .header h3 {
        margin: 0;
        font-size: 0.9rem;
    }

    .header p {
        margin: 0.1rem 0 0;
        font-size: 0.75rem;
        color: #9ca3af;
    }

    .link {
        stroke-linecap: round;
        stroke-linejoin: round;
        opacity: 0.7;
    }

    .node {
        opacity: 0.5;
        transition: opacity 0.15s ease;
    }

    .node.active {
        opacity: 1;
    }

    .node circle {
        fill: #0f172a;
        stroke: #4b5563;
        stroke-width: 0.4;
        transition:
            fill 0.15s ease,
            stroke 0.15s ease,
            r 0.15s ease,
            opacity 0.15s ease;
    }

    .node.active circle {
        fill: #22c55e;
        stroke: #bbf7d0;
    }

    .label {
        font-size: 3.5px;
        fill: #e5e7eb;
        text-anchor: middle;
        dominant-baseline: central;
        pointer-events: none;
    }

    @media (max-width: 768px) {
        .circular-graph {
            padding: 0.5rem;
        }
    }

    .link {
        stroke-linecap: round;
        stroke-linejoin: round;
        opacity: 0.25;
        transition:
            opacity 0.15s ease,
            stroke-width 0.15s ease;
    }

    .link.hovered {
        opacity: 0.95;
        stroke-width: 1.8;
    }

    .link.dimmed {
        opacity: 0.06;
    }

    .node {
        opacity: 0.45;
        transition:
            opacity 0.15s ease,
            transform 0.15s ease;
    }

    .node.hovered {
        opacity: 1;
        /*transform: scale(1.15); translate(var(--tx, 0), var(--ty, 0));*/
    }

    .node.neighbor {
        opacity: 0.9;
    }

    .node.dimmed {
        opacity: 0.15;
    }

    .node circle {
        fill: #0f172a;
        stroke: #4b5563;
        stroke-width: 0.4;
    }

    .node.active circle {
        fill: #22c55e;
        stroke: #bbf7d0;
    }

    .label {
        font-size: 4px;
        fill: #64748b;
        text-anchor: middle;
        dominant-baseline: central;
        pointer-events: none;
        opacity: 0.25;
    }

    .label-activa {
        font-size: 4px;
        opacity: 0.8;
    }

    .label-hover {
        font-size:4.5px;
        fill: #e5e7eb;
        opacity: 1;
    }
</style>
