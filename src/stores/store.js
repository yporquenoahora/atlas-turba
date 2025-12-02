// src/lib/stores/atlasStores.js
import { writable, derived } from "svelte/store";
import { atlas } from "../lib/atlasData.js";
import { perfilesPersonaje } from "../lib/perfilesPersonaje.js"
// en store.js
import { continentesConfig } from "../lib/continentesConfig.js";

export { continentesConfig, perfilesPersonaje }; // para reexportar si quieres


function contarPorClave(datos, clave) {
    const mapa = new Map();
    for (const d of datos) {
        const k = d[clave];
        if (!k) continue;
        mapa.set(k, (mapa.get(k) || 0) + 1);
    }
    return Array.from(mapa, ([nombre, valor]) => ({ nombre, valor }))
        .sort((a, b) => b.valor - a.valor);
}

// ---------- STORES BÁSICOS DE ESTADO ----------

// filtros “semánticos”
export const filtros = writable({
    categoria: "todas",
    metafora: "todas",
    mecanismo: "todos",
    canal: "todos",
    texto: "",
    continente: null
});

// UI de exploración
export const ui = writable({
    nubeVista: "metaforas",
    busquedaTag: "",
    minCount: 1
});

// helpers para usar más cómodo en componentes (opcional)
export const nubeVista = derived(ui, $ui => $ui.nubeVista);
export const busquedaTag = derived(ui, $ui => $ui.busquedaTag);
export const minCount = derived(ui, $ui => $ui.minCount);

// ---------- VALORES ÚNICOS PARA SELECTS ----------

export const categoriasUnicas = [...new Set(atlas.map(d => d.categoria).filter(Boolean))].sort();
export const metaforasUnicas = [...new Set(atlas.map(d => d.metafora_dominante).filter(Boolean))].sort();
export const mecanismosUnicos = [...new Set(atlas.map(d => d.mecanismo).filter(Boolean))].sort();
export const canalesUnicos = [...new Set(atlas.map(d => d.canal).filter(Boolean))].sort();

// ---------- DATOS FILTRADOS ----------

export const filtrados = derived(
    [filtros],
    ([$filtros]) => {
        const { categoria, metafora, mecanismo, canal, texto, continente } = $filtros;

        // NUEVO: troceamos el texto en términos
        const terms = texto
            .toLowerCase()
            .split(/[;,]/)      // separamos por ; o ,
            .map(t => t.trim())
            .filter(Boolean);

        const categoriasContinente = continente
            ? (continentesConfig.find((c) => c.id === continente)?.matchCategorias || [])
            : null;

        return atlas.filter(d => {
            const pasaCategoria =
                categoria === "todas" || d.categoria === categoria;
            const pasaMetafora =
                metafora === "todas" || d.metafora_dominante === metafora;
            const pasaMecanismo =
                mecanismo === "todos" || d.mecanismo === mecanismo;
            const pasaCanal =
                canal === "todos" || d.canal === canal;

            const cuerpoTexto = (
                (d.ejemplo || "") + " " +
                (d.descripcion || "") + " " +
                (d.tipo_victima || "")
            ).toLowerCase();

            // NUEVO: cualquier término que aparezca ya vale
            const pasaTexto =
                terms.length === 0 ||
                terms.some(term => cuerpoTexto.includes(term));

                const pasaContinente =
        !categoriasContinente ||
        (d.categoria && categoriasContinente.includes(d.categoria));

            return (
                pasaCategoria &&
                pasaMetafora &&
                pasaMecanismo &&
                pasaCanal &&
                pasaTexto && 
                pasaContinente
            );
        });
    }
);

// ---------- CONTEOS GLOBALES Y FILTRADOS ----------

const conteoGlobalCategorias = contarPorClave(atlas, "categoria");
const conteoGlobalMetaforas = contarPorClave(atlas, "metafora_dominante");
const conteoGlobalMecanismos = contarPorClave(atlas, "mecanismo");
const conteoGlobalCanales = contarPorClave(atlas, "canal");

export const conteosFiltrados = derived(
    [filtrados],
    ([$filtrados]) => ({
        categorias: contarPorClave($filtrados, "categoria"),
        metaforas: contarPorClave($filtrados, "metafora_dominante"),
        mecanismos: contarPorClave($filtrados, "mecanismo"),
        canales: contarPorClave($filtrados, "canal")
    })
);

// ---------- NUBES PARA ConceptCloud ----------

export const nubes = derived(
    [filtros, conteosFiltrados],
    ([$filtros, $conteos]) => {
        const { categoria, metafora, mecanismo, canal } = $filtros;

        const mapaCat = new Map($conteos.categorias.map(d => [d.nombre, d.valor]));
        const mapaMet = new Map($conteos.metaforas.map(d => [d.nombre, d.valor]));
        const mapaMec = new Map($conteos.mecanismos.map(d => [d.nombre, d.valor]));
        const mapaCan = new Map($conteos.canales.map(d => [d.nombre, d.valor]));

        const nubeCategorias = conteoGlobalCategorias.map(d => ({
            nombre: d.nombre,
            count: d.valor,
            active: categoria === d.nombre,
            disabled: !mapaCat.has(d.nombre)
        }));

        const nubeMetaforas = conteoGlobalMetaforas.map(d => ({
            nombre: d.nombre,
            count: d.valor,
            active: metafora === d.nombre,
            disabled: !mapaMet.has(d.nombre)
        }));

        const nubeMecanismos = conteoGlobalMecanismos.map(d => ({
            nombre: d.nombre,
            count: d.valor,
            active: mecanismo === d.nombre,
            disabled: !mapaMec.has(d.nombre)
        }));

        const nubeCanales = conteoGlobalCanales.map(d => ({
            nombre: d.nombre,
            count: d.valor,
            active: canal === d.nombre,
            disabled: !mapaCan.has(d.nombre)
        }));

        return { nubeCategorias, nubeMetaforas, nubeMecanismos, nubeCanales };
    }
);

// ---------- GRAFO PARA EL FORCE LAYOUT ----------

function buildGraphData(datos, minCount) {
    const counts = new Map();

    for (const d of datos) {
        const pairs = [
            ["cat", d.categoria],
            ["meta", d.metafora_dominante],
            ["mec", d.mecanismo],
            ["canal", d.canal]
        ];
        for (const [type, key] of pairs) {
            if (!key) continue;
            const id = `${type}:${key}`;
            counts.set(id, (counts.get(id) || 0) + 1);
        }
    }

    const nodesMap = new Map();
    const links = [];

    function addNode(key, type) {
        if (!key) return null;
        const id = `${type}:${key}`;
        if ((counts.get(id) || 0) < minCount) return null;
        if (!nodesMap.has(id)) {
            nodesMap.set(id, { id, key, type });
        }
        return id;
    }

    for (const d of datos) {
        const catId = addNode(d.categoria, "cat");
        const metaId = addNode(d.metafora_dominante, "meta");
        const mecId = addNode(d.mecanismo, "mec");
        const canId = addNode(d.canal, "canal");

        const pairs = [
            [catId, metaId],
            [metaId, mecId],
            [mecId, canId]
        ];

        for (const [a, b] of pairs) {
            if (a && b) links.push({ source: a, target: b });
        }
    }

    return {
        nodes: Array.from(nodesMap.values()),
        links
    };
}

export const graphData = derived(
    [filtrados, ui],
    ([$filtrados, $ui]) => buildGraphData($filtrados, Number($ui.minCount) || 1)
);


export const perfilActivo = writable(null); // id de perfil o null
// helper para comparar ejemplo con el perfil
function coincideConPerfil(ejemplo, perfil) {
    const { match } = perfil;
    if (!match) return true;

    // Si hay textoIncluye, usamos solo eso
    if (match.textoIncluye && match.textoIncluye.length) {
        const haystack = [
            ejemplo.ejemplo,
            ejemplo.descripcion,
            ejemplo.tipo_victima,
            ejemplo.categoria,
            ejemplo.canal,
            ejemplo.metafora_dominante
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const alguno = match.textoIncluye.some((frag) =>
            haystack.includes(frag.toLowerCase())
        );

        return alguno;
    }

    // Si no se definió textoIncluye, no filtramos por perfil
    return true;
}


export const ataquesPerfil = derived(
    [filtrados, perfilActivo],
    ([$filtrados, $perfilActivo]) => {
        if (!$perfilActivo) {
            return { perfil: null, ataques: [], total: 0, modo: "sin_perfil" };
        }

        const perfil = perfilesPersonaje.find((p) => p.id === $perfilActivo);
        if (!perfil) {
            return { perfil: null, ataques: [], total: 0, modo: "perfil_invalido" };
        }

        if (!$filtrados || $filtrados.length === 0) {
            return { perfil, ataques: [], total: 0, modo: "sin_datos" };
        }

        // ahora usamos sólo textoIncluye para decidir ataques
        const ataques = $filtrados.filter((e) => coincideConPerfil(e, perfil));

        return {
            perfil,
            ataques,
            total: ataques.length,
            modo: "perfil"
        };
    }
);



// ÍNDICE DEL ATAQUE ACTUAL
export const ataqueIndex = writable(0);

// ATAQUE ACTUAL (para el replay)
export const ataqueActual = derived(
    [ataquesPerfil, ataqueIndex],
    ([$ataquesPerfil, $ataqueIndex]) => {
        const { ataques } = $ataquesPerfil;
        if (!ataques || ataques.length === 0) return null;

        const idx = Math.min(
            Math.max(0, $ataqueIndex),
            ataques.length - 1
        );

        return {
            ataque: ataques[idx],
            index: idx,
            total: ataques.length
        };
    }
);
// ratio de supervivencia basado en vidas y número de ataques
export const ratioSupervivencia = derived(
    ataquesPerfil,
    ($ataquesPerfil) => {
        const { perfil, total, modo } = $ataquesPerfil;
        if (!perfil) return null;

        const vidas = perfil.vidas ?? 3;

        // Si no hay datos, no hay barra
        if (modo === "sin_datos" || total === 0) return null;

        const dano = total; // cada ataque vale 1 por ahora
        const ratio = Math.max(0, 1 - dano / vidas);
        return ratio; // 1 = sano, 0 = devorado
    }
);


// estado textual del perfil según el ratio
export const estadoPerfil = derived(
    [ataquesPerfil, ratioSupervivencia],
    ([$ataquesPerfil, $ratio]) => {
        if (!$ataquesPerfil.perfil) return null;
        if ($ataquesPerfil.modo === "sin_datos" || $ataquesPerfil.total === 0) {
            return "sin_datos";
        }
        if ($ratio === null) return "sin_datos";

        if ($ratio > 0.66) return "resiste";
        if ($ratio > 0.33) return "tocado";
        if ($ratio > 0) return "critico";
        return "devorado";
    }
);


// ataques por continente usando el total (para el mapa)
export const ataquesPorContinente = derived(
    ataquesPerfil,
    ($ataquesPerfil) => {
        return continentesConfig.map((cont) => {
            const matchCats = cont.matchCategorias || [];

            const ataques = $ataquesPerfil.ataques.filter(
                (e) => e.categoria && matchCats.includes(e.categoria)
            );

            const total = ataques.length;

            return {
                continenteId: cont.id,
                label: cont.label,
                total
            };
        });
    }
);
