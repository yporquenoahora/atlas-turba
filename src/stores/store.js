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
    minCount: 10
});

// Máximo de ocurrencias de un nodo con los filtros actuales
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

// Ejemplos visibles según el umbral (minCount)
// Solo mostramos ejemplos que tengan al menos UN atributo
// (categoría / metáfora / mecanismo / canal) con conteo >= threshold




// Máximo de ocurrencias de un nodo con los filtros actuales
export const maxMinCountPosible = derived(
  filtrados,
  ($filtrados) => {
    const counts = new Map();

    for (const d of $filtrados) {
      const pairs = [
        ["cat",  d.categoria],
        ["meta", d.metafora_dominante],
        ["mec",  d.mecanismo],
        ["canal", d.canal]
      ];
      for (const [type, key] of pairs) {
        if (!key) continue;
        const id = `${type}:${key}`;
        counts.set(id, (counts.get(id) || 0) + 1);
      }
    }

    if (counts.size === 0) return 1; // fallback para no romper slider

    return Math.max(...counts.values());
  }
);

// minCount efectivo = lo que diga el UI, pero nunca más que el máximo posible
export const effectiveMinCount = derived(
  [ui, maxMinCountPosible],
  ([$ui, $max]) => {
    const raw = Number($ui.minCount) || 1;
    return Math.min(raw, $max || 1);
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

export const filtradosVisibles = derived(
  [filtrados, conteosFiltrados, effectiveMinCount],
  ([$filtrados, $conteos, $min]) => {
    const threshold = $min || 1;

    // Mapas rápidos nombre -> conteo con filtros actuales
    const mapaCat = new Map($conteos.categorias.map(d => [d.nombre, d.valor]));
    const mapaMet = new Map($conteos.metaforas.map(d => [d.nombre, d.valor]));
    const mapaMec = new Map($conteos.mecanismos.map(d => [d.nombre, d.valor]));
    const mapaCan = new Map($conteos.canales.map(d => [d.nombre, d.valor]));

    return $filtrados.filter(d => {
      const cCat = d.categoria
        ? (mapaCat.get(d.categoria) || 0)
        : 0;
      const cMet = d.metafora_dominante
        ? (mapaMet.get(d.metafora_dominante) || 0)
        : 0;
      const cMec = d.mecanismo
        ? (mapaMec.get(d.mecanismo) || 0)
        : 0;
      const cCan = d.canal
        ? (mapaCan.get(d.canal) || 0)
        : 0;

      // si ALGUNO de sus “tags” supera el umbral, el ejemplo se muestra
      return (
        cCat >= threshold ||
        cMet >= threshold ||
        cMec >= threshold ||
        cCan >= threshold
      );
    });
  }
);
// ---------- NUBES PARA ConceptCloud ----------


// ...

export const nubes = derived(
  [filtros, conteosFiltrados, effectiveMinCount],
  ([$filtros, $conteos, $min]) => {
    const { categoria, metafora, mecanismo, canal } = $filtros;
    const threshold = $min || 1;

    // Usamos SOLO los conteos filtrados y aplicamos el umbral
    const nubeCategorias = $conteos.categorias
      .filter((d) => d.valor >= threshold)
      .map((d) => ({
        nombre: d.nombre,
        count: d.valor,
        active: categoria === d.nombre,
        disabled: false
      }));

    const nubeMetaforas = $conteos.metaforas
      .filter((d) => d.valor >= threshold)
      .map((d) => ({
        nombre: d.nombre,
        count: d.valor,
        active: metafora === d.nombre,
        disabled: false
      }));

    const nubeMecanismos = $conteos.mecanismos
      .filter((d) => d.valor >= threshold)
      .map((d) => ({
        nombre: d.nombre,
        count: d.valor,
        active: mecanismo === d.nombre,
        disabled: false
      }));

    const nubeCanales = $conteos.canales
      .filter((d) => d.valor >= threshold)
      .map((d) => ({
        nombre: d.nombre,
        count: d.valor,
        active: canal === d.nombre,
        disabled: false
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
    [filtrados, effectiveMinCount],
    ([$filtrados, $effectiveMin]) => buildGraphData($filtrados, $effectiveMin || 1)
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


// --- helpers para rutas entre continentes ---
// --- helpers para rutas entre continentes ---
// ----------------- HELPERS DE CONTINENTE -----------------

function normaliza(str) {
    return str
        .toLowerCase()
        .normalize("NFD")                // separa acentos
        .replace(/\p{Diacritic}/gu, ""); // elimina acentos
}

// Usa las matchCategorias del propio continentesConfig
function continenteDeCategoria(categoria) {
    if (!categoria) return null;
    for (const cont of continentesConfig) {
        const lista = cont.matchCategorias || [];
        if (lista.includes(categoria)) {
            return cont.id;
        }
    }
    return null;
}

export function continenteDeCanal(canal) {
    if (!canal) return null;
    const c = normaliza(canal);

    // adapta estas reglas a tus valores reales de "canal"
    if (c.includes("tele") || c.includes("tv") || c.includes("plat") || c.includes("reality")) {
        return "espectaculo";
    }
    if (c.includes("red") || c.includes("twitter") || c.includes("tiktok") || c.includes("instagram") || c.includes("social")) {
        return "redes";
    }
    if (c.includes("prensa") || c.includes("sucesos") || c.includes("true crime") || c.includes("cronica")) {
        return "cronica_negra";
    }
    if (c.includes("podcast") || c.includes("divulg") || c.includes("documental")) {
        return "ciencia";
    }
    if (c.includes("economia") || c.includes("finanzas") || c.includes("empresa")) {
        return "economia";
    }

    // sin mapa claro → ya veremos si la categoria ayuda
    return null;
}

export function continenteDeVictima(tipo) {
    if (!tipo) return null;
    const t = normaliza(tipo);

    if (t.includes("cient") || t.includes("investig") || t.includes("experto")) {
        return "ciencia";
    }
    if (t.includes("artista") || t.includes("cantante") || t.includes("estrella") || t.includes("celebridad") || t.includes("influencer")) {
        return "espectaculo";
    }
    if (t.includes("refug") || t.includes("migr") || t.includes("minoria") || t.includes("extranj") || t.includes("bestiario")) {
        return "bestiario";
    }
    if (t.includes("politic") || t.includes("activista") || t.includes("manifestante") || t.includes("militante")) {
        return "pueblo_politico";
    }
    if (t.includes("empres") || t.includes("banqu") || t.includes("rico") || t.includes("multinacional")) {
        return "economia";
    }

    return null;
}

// --- rutas de ataque entre continentes, derivadas de ataquesPerfil ---
export const rutasContinentes = derived(
    [filtrados, ataquesPerfil],
    ([$filtrados, $ataquesPerfil]) => {
        const rutasMap = new Map();

        const ataquesIds = new Set(
            $ataquesPerfil.ataques
                ? $ataquesPerfil.ataques.map((a) => a.id).filter(Boolean)
                : []
        );

        for (const d of $filtrados || []) {
            // ORIGEN: canal si se puede, si no categoría
            const from =
                continenteDeCanal(d.canal) ||
                continenteDeCategoria(d.categoria);

            // DESTINO: tipo_victima si se puede, si no categoría
            const to =
                continenteDeVictima(d.tipo_victima) ||
                continenteDeCategoria(d.categoria);

            if (!from || !to || from === to) continue;

            const key = `${from}->${to}`;
            const prev = rutasMap.get(key) || {
                from,
                to,
                count: 0,
                countAtaquesPerfil: 0,
                mecanismos: new Map(),
                metaforas: new Map()
            };

            prev.count += 1;

            if (d.id && ataquesIds.has(d.id)) {
                prev.countAtaquesPerfil += 1;
            }

            if (d.mecanismo) {
                prev.mecanismos.set(
                    d.mecanismo,
                    (prev.mecanismos.get(d.mecanismo) || 0) + 1
                );
            }
            if (d.metafora_dominante) {
                prev.metaforas.set(
                    d.metafora_dominante,
                    (prev.metaforas.get(d.metafora_dominante) || 0) + 1
                );
            }

            rutasMap.set(key, prev);
        }

        return Array.from(rutasMap.values()).map((r) => ({
            from: r.from,
            to: r.to,
            count: r.count,
            countAtaquesPerfil: r.countAtaquesPerfil,
            topMecanismo:
                Array.from(r.mecanismos.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
                null,
            topMetafora:
                Array.from(r.metaforas.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
                null
        }));
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


// Cada "ataque" se convierte en un arco entre continentes (si podemos inferirlos)
// Si el perfil actual no tiene ataques, usamos todos los $filtrados como base visual.

export const arcosContinentes = derived(
    [filtrados, ataquesPerfil],
    ([$filtrados, $ataquesPerfil]) => {
        const base =
            $ataquesPerfil.ataques && $ataquesPerfil.ataques.length > 0
                ? $ataquesPerfil.ataques
                : $filtrados;

        const arcos = [];

        base.forEach((d, idx) => {
            const from =
                continenteDeCanal(d.canal) ||
                continenteDeCategoria(d.categoria);
            const to =
                continenteDeVictima(d.tipo_victima) ||
                continenteDeCategoria(d.categoria);

            if (!from || !to || from === to) return;

            const esPerfil =
                $ataquesPerfil.ataques &&
                $ataquesPerfil.ataques.some((a) => a.id === d.id);

            arcos.push({
                id: d.id ?? `arc-${idx}`,
                from,
                to,
                ejemplo: d.ejemplo,
                descripcion: d.descripcion,
                mecanismo: d.mecanismo,
                metafora: d.metafora_dominante,
                canal: d.canal,
                tipo_victima: d.tipo_victima,
                esPerfil
            });
        });

        return arcos;
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

// --- RUTAS AGREGADAS ENTRE CONTINENTES ---
// Cada ruta agrupa todos los ataques/ejemplos que van de un continente a otro,
// con distribución por mecanismo y metáfora, y lista de casos.

export const rutasEntreContinentes = derived(
    [filtrados],
    ([$filtrados]) => {
        const rutasMap = new Map();

        for (const d of $filtrados || []) {
            const from =
                continenteDeCanal(d.canal) ||
                continenteDeCategoria(d.categoria);
            const to =
                continenteDeVictima(d.tipo_victima) ||
                continenteDeCategoria(d.categoria);

            if (!from || !to || from === to) continue;

            const key = `${from}->${to}`;
            const prev = rutasMap.get(key) || {
                from,
                to,
                total: 0,
                porMecanismo: new Map(),
                porMetafora: new Map(),
                casos: []
            };

            prev.total += 1;

            if (d.mecanismo) {
                prev.porMecanismo.set(
                    d.mecanismo,
                    (prev.porMecanismo.get(d.mecanismo) || 0) + 1
                );
            }

            if (d.metafora_dominante) {
                prev.porMetafora.set(
                    d.metafora_dominante,
                    (prev.porMetafora.get(d.metafora_dominante) || 0) + 1
                );
            }

            prev.casos.push({
                id: d.id,
                ejemplo: d.ejemplo,
                descripcion: d.descripcion,
                mecanismo: d.mecanismo,
                metafora: d.metafora_dominante,
                canal: d.canal,
                tipo_victima: d.tipo_victima,
                categoria: d.categoria
            });

            rutasMap.set(key, prev);
        }

        // lo convertimos a array "bonito"
        return Array.from(rutasMap.values()).map((r) => {
            const mecanismosOrdenados = Array.from(r.porMecanismo.entries())
                .sort((a, b) => b[1] - a[1]);
            const metaforasOrdenadas = Array.from(r.porMetafora.entries())
                .sort((a, b) => b[1] - a[1]);

            return {
                from: r.from,
                to: r.to,
                total: r.total,
                porMecanismo: mecanismosOrdenados, // [ [mec, count], ... ]
                porMetafora: metaforasOrdenadas,   // [ [meta, count], ... ]
                mecanismoDominante: mecanismosOrdenados[0]?.[0] || null,
                metaforaDominante: metaforasOrdenadas[0]?.[0] || null,
                casos: r.casos
            };
        });
    }
);


// ---------- GRAFO CIRCULAR DE COOCURRENCIA ENTRE FILTROS ----------
// Cada nodo = un valor de filtro (categoria/metafora/mecanismo/canal)
// Cada link = dos filtros que aparecen en el mismo ejemplo (coocurrencia)



// ---------- GRAFO CIRCULAR DE COOCURRENCIA ENTRE FILTROS ----------
// Cada nodo = un valor de filtro (categoria/metafora/mecanismo/canal)
// Cada link = dos filtros que aparecen en el mismo ejemplo (coocurrencia)

export const graphCircular = derived(
    filtrados,
    ($filtrados) => {
        const nodesMap = new Map();
        const linksMap = new Map();

        function addNode(tipo, key) {
            if (!key) return null;
            const id = `${tipo}:${key}`;
            if (!nodesMap.has(id)) {
                nodesMap.set(id, {
                    id,
                    tipo,        // "categoria" | "metafora" | "mecanismo" | "canal"
                    label: key,
                    degree: 0
                });
            }
            return id;
        }

        function addLink(a, b) {
            if (!a || !b || a === b) return;
            const key = a < b ? `${a}||${b}` : `${b}||${a}`;
            const prev = linksMap.get(key) || { source: a, target: b, weight: 0 };
            prev.weight += 1;
            linksMap.set(key, prev);
        }

        // Recorremos ejemplos filtrados y conectamos sus filtros internos
        for (const d of $filtrados || []) {
            const idCat = addNode("categoria", d.categoria);
            const idMet = addNode("metafora", d.metafora_dominante);
            const idMec = addNode("mecanismo", d.mecanismo);
            const idCan = addNode("canal", d.canal);

            const presentes = [idCat, idMet, idMec, idCan].filter(Boolean);

            // todas las parejas que coaparecen en el mismo ejemplo
            for (let i = 0; i < presentes.length; i++) {
                for (let j = i + 1; j < presentes.length; j++) {
                    addLink(presentes[i], presentes[j]);
                }
            }
        }

        // calculamos degree aproximado
        const links = Array.from(linksMap.values());
        for (const l of links) {
            const a = nodesMap.get(l.source);
            const b = nodesMap.get(l.target);
            if (a) a.degree += l.weight;
            if (b) b.degree += l.weight;
        }

        const nodes = Array.from(nodesMap.values());

        return { nodes, links };
    }
);
