// Los tres equipos del club. `league` es la competición que se propone al crear un partido
// (se puede cambiar a mano en cada partido).
// En la base de datos se guarda el "slug" (el texto corto
// sin tildes ni espacios), así que se puede cambiar el nombre aquí sin tocar Supabase.
export const TEAMS = [
  { slug: "nacional-masculino", name: "Nacional masculino", league: "Liga Nacional Masculina" },
  { slug: "provincial-masculino", name: "Provincial masculino", league: "Liga Provincial Masculina" },
  { slug: "provincial-femenino", name: "Provincial femenino", league: "Liga Provincial Femenina" },
];

export const DEFAULT_TEAM = TEAMS[0].slug;

export const teamBySlug = (slug) => TEAMS.find((t) => t.slug === slug) ?? null;
