// src/lib/turbaData.ts
const modules = import.meta.glob("/src/data/json/*.json", { eager: true });

export type TurbaPayload = {
  case_id: string;
  ejemplo?: string;
  meta?: {
    categoria?: string;
    tipo_victima?: string;
    metafora_dominante?: string;
    mecanismo_de_distorsion?: string;
    canal_difusion?: string;
    breve_descripcion?: string;
  };
  series: Array<{
    date: string;
    engagement: number;
    contagio: number;
    pluralidad: number;
    resistencia: number;
    contra_flujo: number;
  }>;
};

function modToPayload(mod: any): TurbaPayload {
  return (mod?.default ?? mod) as TurbaPayload;
}

export const turbaCases = Object.entries(modules)
  .map(([path, mod]) => {
    const p = modToPayload(mod);
    const file = path.split("/").pop()?.replace(".json", "") ?? p.case_id;
    return {
      id: p.case_id || file,
      label: p.ejemplo || file.replaceAll("_", " "),
      categoria: p.meta?.categoria ?? ""
    };
  })
  .sort((a, b) => a.label.localeCompare(b.label, "es"));

export function getTurbaPayload(caseId: string): TurbaPayload | null {
  for (const mod of Object.values(modules)) {
    const p = modToPayload(mod);
    if (p.case_id === caseId) return p;
  }
  return null;
}
