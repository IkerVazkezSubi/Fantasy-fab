// Los tres equipos del club. En la base de datos se guarda el "slug" (el texto corto
// sin tildes ni espacios), así que se puede cambiar el nombre aquí sin tocar Supabase.
export const TEAMS = [
  { slug: "nacional-masculino", name: "Nacional masculino" },
  { slug: "provincial-masculino", name: "Provincial masculino" },
  { slug: "provincial-femenino", name: "Provincial femenino" },
];

export const DEFAULT_TEAM = TEAMS[0].slug;

export const teamBySlug = (slug) => TEAMS.find((t) => t.slug === slug) ?? null;
