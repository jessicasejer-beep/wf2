export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export const RESOURCE_TYPES = [
  { value: "SUPPORT", label: "Support de jeu", color: "#005a70", bg: "#e0f2f0" },
  { value: "JEU", label: "Jeux", color: "#854d0e", bg: "#fefce8" },
  { value: "FICHE", label: "Fiche", color: "#166534", bg: "#f0fdf4" },
  { value: "CALCUL_MENTAL", label: "Calcul mental", color: "#1e40af", bg: "#eff6ff" },
  { value: "CORRIGE", label: "Corrigés", color: "#6b21a8", bg: "#faf5ff" },
  { value: "A_LA_MAISON", label: "À la maison", color: "#9a3412", bg: "#fff7ed" },
  { value: "AUTRE", label: "Autre", color: "#555", bg: "#f4f6f8" },
] as const;

export const ACCESS_LEVELS = [
  { value: "LIBRE", label: "Libre", color: "#005a70", bg: "#e0f2f0" },
  { value: "ENSEIGNANT", label: "Enseignant", color: "#9d174d", bg: "#fdf2f8" },
  { value: "PRESCRIPTEUR", label: "Prescripteur", color: "#6b21a8", bg: "#faf5ff" },
] as const;

export const DISCIPLINES = [
  "Mathématiques",
  "Français",
  "Sciences",
  "Histoire-Géographie",
  "Arts plastiques",
  "Éducation physique",
  "Langues vivantes",
  "Musique",
  "Autre",
];

export function getResourceType(value: string) {
  return RESOURCE_TYPES.find((t) => t.value === value) ?? RESOURCE_TYPES[RESOURCE_TYPES.length - 1];
}

export function getAccessLevel(value: string) {
  return ACCESS_LEVELS.find((l) => l.value === value) ?? ACCESS_LEVELS[0];
}
