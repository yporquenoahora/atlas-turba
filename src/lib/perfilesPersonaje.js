export const perfilesPersonaje = [
  {
    id: "estrella_pop_caida",
    nombre: "Estrella pop en caída libre",
    descripcion:
      "Una Britney mutante: idolatrada y devorada por la misma maquinaria que la hizo famosa.",
    vidas: 3,
    // Filtros automáticos al seleccionar este perfil
    presetFiltros: {
      categoria: "celebridades",   // p.ej. valor en d.categoria
      metafora: "muñeco_rotor",    // ajusta o deja 'todas'
      mecanismo: "escarnecimiento_publico",
      canal: "television",         // p.ej. 'television', 'magazine_tv'
      texto: "britney;pop;cantante;diva"
    },
    // Coincidencia fina dentro de los filtrados
    match: {
      categoria: ["celebridades", "telebasura", "programa_corazon"],
      canal: ["television", "magazine_tv"],
      tipo_victima: ["cantante", "celebridad", "estrella_pop", "idol"],
      metafora_dominante: ["muñeca_rota", "princesa_caida"],
      textoIncluye: ["britney", "pop", "famosa", "idolo", "ídolo"]
    }
  },

  {
    id: "cientifica_prime_time",
    nombre: "Científica en prime time",
    descripcion:
      "Investigadora convertida en tertuliana, oráculo televisivo o chivo expiatorio.",
    vidas: 4,
    presetFiltros: {
      categoria: "ciencia",
      metafora: "experto_contra_la_gente",
      mecanismo: "cuestionamiento_autoridad",
      canal: "television",
      texto: "científico;científica;epidemiólogo;epidemióloga;experto;experta"
    },
    match: {
      categoria: ["ciencia", "salud_publica", "pandemias"],
      canal: ["television", "informativo", "tertulia"],
      tipo_victima: ["científico", "científica", "investigador", "experta"],
      metafora_dominante: ["experto_frio", "tecnico_desconectado"],
      textoIncluye: [
        "científico",
        "científica",
        "epidemiólogo",
        "epidemióloga",
        "virólogo",
        "experto",
        "experta"
      ]
    }
  },

  {
    id: "presentador_cronicas",
    nombre: "Presentador de late-night canalla",
    descripcion:
      "Heredero espiritual de Crónicas Marcianas y Tómbola, alimentado por excesos y burlas.",
    vidas: 5,
    presetFiltros: {
      categoria: "telebasura",
      metafora: "bufon_del_rey",
      mecanismo: "ridiculizacion",
      canal: "television",
      texto: "crónicas;cronicas;tómbola;tombola;sálvame;salvame"
    },
    match: {
      categoria: ["telebasura", "humor_tv", "magazine_tv"],
      canal: ["television"],
      tipo_victima: ["presentador", "tertuliano", "showman"],
      metafora_dominante: ["bufon", "payaso", "provocador"],
      textoIncluye: [
        "crónicas marcianas",
        "cronicas marcianas",
        "tómbola",
        "tombola",
        "sálvame",
        "salvame"
      ]
    }
  },

  {
    id: "tuitera_cancelada",
    nombre: "Tuitera cancelada",
    descripcion:
      "Figura que encarna el linchamiento digital, la captura de pantalla eterna y el trending topic fugaz.",
    vidas: 3,
    presetFiltros: {
      categoria: "redes_sociales",
      metafora: "caza_de_brujas",
      mecanismo: "linchamiento_digital",
      canal: "redes_sociales",
      texto: "twitter;x;redes;cancel;boicot;hashtag"
    },
    match: {
      categoria: ["redes_sociales", "cancelacion"],
      canal: ["twitter", "x", "redes_sociales"],
      tipo_victima: ["usuario_redes", "influencer", "periodista", "creador"],
      metafora_dominante: ["caza_de_brujas", "linchamiento_digital"],
      textoIncluye: [
        "cancel",
        "cancelar",
        "boicot",
        "linchamiento",
        "trending topic",
        "hashtag"
      ]
    }
  },

  {
    id: "refugiado_sospechoso",
    nombre: "Refugiado siempre en el punto de mira",
    descripcion:
      "Figura comodín para las metáforas de ola, invasión o manada, según convenga al relato.",
    vidas: 4,
    presetFiltros: {
      categoria: "refugiados",
      metafora: "ola_invasiva",
      mecanismo: "deshumanizacion",
      canal: "informativo",
      texto: "refugiado;migrante;frontera;avalanch;ola;invasión;invasion"
    },
    match: {
      categoria: ["refugiados", "migracion", "politica"],
      canal: ["informativo", "reportaje", "opinion"],
      tipo_victima: ["refugiado", "migrante", "solicitante_asilo"],
      metafora_dominante: [
        "ola",
        "riada",
        "invasion",
        "invasión",
        "manada",
        "enjambre"
      ],
      textoIncluye: [
        "refugiado",
        "refugiados",
        "migrante",
        "migrantes",
        "frontera",
        "avalanch",
        "invasión",
        "invasion"
      ]
    }
  },

  {
    id: "funcionario_parasito",
    nombre: "Funcionario parásito",
    descripcion:
      "Personaje construido como símbolo de pereza, burocracia infinita y vivir del cuento.",
    vidas: 5,
    presetFiltros: {
      categoria: "economia",
      metafora: "parasitismo",
      mecanismo: "estigmatizacion_colectiva",
      canal: "opinion",
      texto: "funcionario;funcionarios;empleado público;empleado publico"
    },
    match: {
      categoria: ["economia", "funcionarios", "trabajo"],
      canal: ["opinion", "columna", "tertulia"],
      tipo_victima: ["funcionario", "empleado_publico"],
      metafora_dominante: ["parásito", "parasito", "lastre", "sanguijuela"],
      textoIncluye: [
        "funcionario",
        "funcionarios",
        "empleado público",
        "empleado publico",
        "chupando del bote",
        "vivir del cuento"
      ]
    }
  },

  {
    id: "monstruo_mediatico",
    nombre: "Monstruo mediático ejemplarizante",
    descripcion:
      "Figura extrema de la crónica negra: concentra miedos y justifica medidas ejemplares.",
    vidas: 2,
    presetFiltros: {
      categoria: "cronica_negra",
      metafora: "monstruo",
      mecanismo: "ejemplarizacion",
      canal: "informativo",
      texto: "asesino;monstruo;depredador;caso;crimen"
    },
    match: {
      categoria: ["cronica_negra", "sucesos", "crimen"],
      canal: ["informativo", "magazine_tv"],
      metafora_dominante: ["monstruo", "bestia", "depredador"],
      tipo_victima: ["acusado", "condenado", "criminal"],
      textoIncluye: [
        "monstruo",
        "asesino",
        "depredador",
        "pederasta",
        "caso",
        "crimen"
      ]
    }
  },

  {
    id: "tiburones_y_bestias",
    nombre: "Tiburones y bestias varias",
    descripcion:
      "Animales convertidos en metáfora de amenaza, castigo moral o turba descontrolada.",
    vidas: 4,
    presetFiltros: {
      categoria: "animales",
      metafora: "depredador_natural",
      mecanismo: "sobredimension_medios",
      canal: "documental",
      texto: "tiburón;tiburon;manada;lobos;bestias;plaga"
    },
    match: {
      categoria: ["animales", "tiburones", "plagas", "bestiario"],
      canal: ["documental", "informativo", "magazine_tv"],
      metafora_dominante: ["depredador", "peligro_natural", "bestia"],
      textoIncluye: [
        "tiburón",
        "tiburon",
        "ataque de tiburón",
        "manada",
        "lobos",
        "plaga",
        "horda",
        "enjambre"
      ]
    }
  },

  {
    id: "magnate_tecnologico",
    nombre: "Magnate tecnológico omnipresente",
    descripcion:
      "Figura de CEO genio-villano, responsable de todo lo bueno y todo lo malo a la vez.",
    vidas: 3,
    presetFiltros: {
      categoria: "tecnologia",
      metafora: "dios_del_algoritmo",
      mecanismo: "personalizacion_excesiva",
      canal: "opinion",
      texto: "millonario;multimillonario;tecnológica;tecnológica;ceo"
    },
    match: {
      categoria: ["tecnologia", "economia"],
      canal: ["opinion", "reportaje", "entrevista"],
      tipo_victima: ["ceo", "empresario", "millonario", "multimillonario"],
      metafora_dominante: ["dios", "titán", "amo_del_algoritmo"],
      textoIncluye: [
        "millonario",
        "multimillonario",
        "ceo",
        "dueño de la red",
        "plataforma",
        "big tech"
      ]
    }
  },

  {
    id: "madre_del_suceso",
    nombre: "Madre del suceso ejemplarizante",
    descripcion:
      "La madre convertida en símbolo moral y objeto de juicio público permanente.",
    vidas: 4,
    presetFiltros: {
      categoria: "cronica_social",
      metafora: "mala_madre",
      mecanismo: "culpabilizacion_victima",
      canal: "magazine_tv",
      texto: "madre;niño;suceso;desaparición;desaparicion"
    },
    match: {
      categoria: ["cronica_social", "cronica_negra", "sucesos"],
      canal: ["magazine_tv", "television"],
      tipo_victima: ["madre", "progenitora"],
      metafora_dominante: ["mala_madre", "negligente"],
      textoIncluye: [
        "mala madre",
        "niño",
        "niña",
        "desaparición",
        "desaparicion",
        "caso mediático",
        "caso mediatico"
      ]
    }
  }
];
