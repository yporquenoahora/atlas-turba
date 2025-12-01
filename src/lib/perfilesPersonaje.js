// src/lib/perfilesPersonaje.js

export const perfilesPersonaje = [
  {
    id: "cientifica_prime_time",
    nombre: "Científica en prime time",
    descripcion:
      "Investigadora convertida en tertuliana, usada como oráculo, chivo expiatorio o excusa para el pánico.",
    match: {
      // ajusta estos strings a los valores reales de tu CSV
      tipo_victima: ["científico", "científica", "investigador", "experta"],
      categoria: ["ciencia", "salud_publica", "pandemias"]
    }
  },
  {
    id: "estrella_pop_caida",
    nombre: "Estrella pop en caída libre",
    descripcion:
      "Una Britney mutante: idolatrada y devorada por la misma maquinaria que la hizo famosa.",
    match: {
      tipo_victima: ["cantante", "celebridad", "estrella_pop"],
      categoria: ["celebridades", "telebasura", "programa_corazon"]
    }
  },
  {
    id: "presentador_cronicas",
    nombre: "Presentador de late-night canalla",
    descripcion:
      "Heredero espiritual de Crónicas Marcianas y Tómbola: vive del exceso, la exageración y la burla.",
    match: {
      canal: ["cronicas_marcianas", "videos_de_primera", "tombola", "salvame"],
      categoria: ["telebasura", "humor_tv", "magazine_tv"]
    }
  },
  {
    id: "refugiado_sospechoso",
    nombre: "Refugiado siempre en el punto de mira",
    descripcion:
      "Figura comodín para la metáfora de 'ola', 'invasión' o 'manada', según convenga al relato.",
    match: {
      tipo_victima: ["refugiado", "migrante", "solicitante_asilo"],
      categoria: ["refugiados", "migracion", "politica"]
    }
  },
  {
    id: "tuitera_cancelada",
    nombre: "Tuitera cancelada",
    descripcion:
      "Figura que encarna la cancelación: trending topic del día, carne de captura de pantalla y meme.",
    match: {
      canal: ["twitter", "x", "redes_sociales"],
      categoria: ["redes_sociales", "cancelacion"],
      metafora_dominante: ["caza_de_brujas", "linchamiento_digital"]
    }
  },
  {
    id: "funcionario_parasito",
    nombre: "Funcionario parásito",
    descripcion:
      "Personaje construido como símbolo de pereza, burocracia y vivir del cuento.",
    match: {
      tipo_victima: ["funcionario", "empleado_publico"],
      categoria: ["economia", "funcionarios", "trabajo"]
    }
  },
  {
    id: "monstruo_mediatico",
    nombre: "Monstruo mediático ejemplarizante",
    descripcion:
      "Figura extrema de la crónica negra: sirve para canalizar miedo y justificar medidas duras.",
    match: {
      categoria: ["crónica_negra", "sucesos", "crimen"],
      metafora_dominante: ["monstruo", "bestia", "depredador"]
    }
  }
];
