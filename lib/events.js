// Tipos de evento y comprobación de lo que llega al guardar (solo servidor).
import { madridLocalToIso } from "./dates";
import { teamBySlug } from "./teams";

export const EVENT_KINDS = ["Entreno", "Partido", "Otro"];

const str = (v) => (typeof v === "string" ? v.trim() : "");

// Marcador: entero de 0 a 300. Vacío = sin resultado (null). Algo raro = NaN.
const score = (v) => {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 300 ? n : NaN;
};

// Para los partidos antiguos, creados cuando solo había título ("Palos vs Valverde").
export function splitVersus(title) {
  const m = /^(.+?)\s+(?:vs\.?|v\.?|-)\s+(.+)$/i.exec(str(title));
  return m ? { home: m[1].trim(), away: m[2].trim() } : { home: "", away: "" };
}

export function sanitizeEvent(body) {
  if (!body || typeof body !== "object") return { error: "Datos no válidos." };

  const kind = str(body.kind);
  const location = str(body.location);
  const notes = str(body.notes);
  const starts_at = madridLocalToIso(body.starts_local);

  if (!EVENT_KINDS.includes(kind)) return { error: "El tipo no es válido." };
  if (!starts_at) return { error: "La fecha y la hora no son válidas." };
  if (location.length > 120) return { error: "El lugar es demasiado largo (máximo 120)." };
  if (notes.length > 600) return { error: "Las notas son demasiado largas (máximo 600)." };

  const common = { kind, starts_at, location: location || null, notes: notes || null };

  if (kind === "Partido") {
    const home = str(body.home_team);
    const away = str(body.away_team);
    const club = str(body.club_team);
    const competition = str(body.competition);
    if (!teamBySlug(club)) return { error: "Elige el equipo del club que juega." };
    if (!home || !away) return { error: "Escribe los dos equipos que juegan." };
    if (home.length > 60 || away.length > 60) return { error: "El nombre de un equipo es demasiado largo (máximo 60)." };
    if (competition.length > 60) return { error: "El nombre de la competición es demasiado largo (máximo 60)." };
    const home_score = score(body.home_score);
    const away_score = score(body.away_score);
    if (Number.isNaN(home_score) || Number.isNaN(away_score)) {
      return { error: "El resultado no es válido (números enteros, de 0 a 300)." };
    }
    if ((home_score === null) !== (away_score === null)) {
      return { error: "Escribe los dos marcadores, o deja los dos vacíos." };
    }
    return {
      value: {
        ...common,
        // El título se genera solo, para que el partido se vea bien en cualquier sitio.
        title: `${home} vs ${away}`,
        home_team: home,
        away_team: away,
        club_team: club,
        competition: competition || null,
        home_score,
        away_score,
      },
    };
  }

  const title = str(body.title);
  if (!title) return { error: "Falta el título." };
  if (title.length > 80) return { error: "El título es demasiado largo (máximo 80)." };
  // Si un partido se cambia a entreno u otro, se borran los datos de partido.
  return { value: { ...common, title, home_team: null, away_team: null, club_team: null, competition: null, home_score: null, away_score: null } };
}
