export const perfilesPersonaje = [
  {
    id: "cientifica_prime_time",
    nombre: "Científica en prime time",
    descripcion:
      "Investigadora convertida en tertuliana, usada como oráculo, chivo expiatorio o excusa para el pánico.",
    vidas: 4,
    match: {
      tipo_victima: ["científico", "científica", "investigador", "experta"],
      categoria: ["ciencia", "salud_publica", "pandemias"]
    }
  },
  {
    id: "estrella_pop_caida",
    nombre: "Estrella pop en caída libre",
    descripcion:
      "Una Britney mutante: idolatrada y devorada por la misma maquinaria que la hizo famosa.",
    vidas: 3,
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
    vidas: 5,
    match: {
      canal: ["cronicas_marcianas", "videos_de_primera", "tombola", "salvame"],
      categoria: ["telebasura", "humor_tv", "magazine_tv"]
    }
  },
  // ... resto igual, con un vidas razonable (3–5)
];
