// src/lib/stores/atlasStores.js
import { writable, derived } from "svelte/store";
import { atlas } from "../lib/atlasData.js";
import {perfilesPersonaje} from "../lib/perfilesPersonaje.js"
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
  texto: ""
});

// UI de exploración
export const ui = writable({
  nubeVista: "metaforas",
  busquedaTag: "",
  minCount: 3
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
    const { categoria, metafora, mecanismo, canal, texto } = $filtros;
    const txt = texto.toLowerCase().trim();

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

      const pasaTexto = txt === "" || cuerpoTexto.includes(txt);

      return pasaCategoria && pasaMetafora && pasaMecanismo && pasaCanal && pasaTexto;
    });
  }
);

// ---------- CONTEOS GLOBALES Y FILTRADOS ----------

const conteoGlobalCategorias = contarPorClave(atlas, "categoria");
const conteoGlobalMetaforas  = contarPorClave(atlas, "metafora_dominante");
const conteoGlobalMecanismos = contarPorClave(atlas, "mecanismo");
const conteoGlobalCanales    = contarPorClave(atlas, "canal");

export const conteosFiltrados = derived(
  [filtrados],
  ([$filtrados]) => ({
    categorias: contarPorClave($filtrados, "categoria"),
    metaforas:  contarPorClave($filtrados, "metafora_dominante"),
    mecanismos: contarPorClave($filtrados, "mecanismo"),
    canales:    contarPorClave($filtrados, "canal")
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
    const catId  = addNode(d.categoria,          "cat");
    const metaId = addNode(d.metafora_dominante, "meta");
    const mecId  = addNode(d.mecanismo,          "mec");
    const canId  = addNode(d.canal,              "canal");

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

function coincideConPerfil(ejemplo, perfil) {
  const { match } = perfil;
  if (!match) return false;

  return Object.entries(match).every(([campo, valores]) => {
    const valorEj = (ejemplo[campo] || "").toString().toLowerCase();
    return valores
      .map((v) => v.toString().toLowerCase())
      .includes(valorEj);
  });
}

export const ataquesPerfil = derived(
  [filtrados, perfilActivo],
  ([$filtrados, $perfilActivo]) => {
    if (!$perfilActivo) {
      return { perfil: null, ataques: [], total: 0 };
    }

    const perfil = perfilesPersonaje.find((p) => p.id === $perfilActivo);
    if (!perfil) {
      return { perfil: null, ataques: [], total: 0 };
    }

    const ataques = $filtrados.filter((e) => coincideConPerfil(e, perfil));
    const total = ataques.length;

    return { perfil, ataques, total };
  }
);

// ratio de supervivencia basado en vidas y número de ataques
export const ratioSupervivencia = derived(
  ataquesPerfil,
  ($ataquesPerfil) => {
    const { perfil, total } = $ataquesPerfil;
    if (!perfil) return null;        // sin perfil, sin barra
    const vidas = perfil.vidas ?? 3; // por si falta el campo

    if (!total) return null;         // 0 ataques => SIN DATOS, NO 100%

    const dano = total;              // cada ataque vale 1 por ahora
    const ratio = Math.max(0, 1 - dano / vidas);
    return ratio; // 1 = sano, 0 = devorado
  }
);

// estado textual del perfil según el ratio
export const estadoPerfil = derived(
  [ataquesPerfil, ratioSupervivencia],
  ([$ataquesPerfil, $ratio]) => {
    if (!$ataquesPerfil.perfil) return null;
    if (!$ataquesPerfil.total) return "sin_datos";
    if ($ratio === null) return "sin_datos";

    if ($ratio > 0.66) return "resiste";
    if ($ratio > 0.33) return "tocado";
    if ($ratio > 0)    return "critico";
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
