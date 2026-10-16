import Link from "next/link";
import { supabaseAdmin } from "../../lib/supabaseServer";
import { isCoach } from "../../lib/session";
import { dayKey, formatDay, formatTime } from "../../lib/dates";
import { teamBySlug } from "../../lib/teams";

export const dynamic = "force-dynamic";

// Un evento sigue contando como "próximo" hasta 3 horas después de empezar.
const GRACE_MS = 3 * 60 * 60 * 1000;
const PAST_LIMIT = 30;

async function loadEvents() {
  try {
    const { data, error } = await supabaseAdmin()
      .from("events")
      .select("id, title, kind, starts_at, location, notes, home_team, away_team, club_team, competition")
      .order("starts_at", { ascending: true });
    if (error) throw error;
    return { events: data ?? [], failed: false };
  } catch (e) {
    console.error("Error cargando el calendario:", e);
    return { events: [], failed: true };
  }
}

function groupByDay(events) {
  const groups = [];
  for (const ev of events) {
    const key = dayKey(ev.starts_at);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.events.push(ev);
    else groups.push({ key, label: formatDay(ev.starts_at), events: [ev] });
  }
  return groups;
}

function EventRow({ ev, coach }) {
  const isMatch = ev.kind === "Partido";
  const versus = isMatch && ev.home_team && ev.away_team;
  const team = teamBySlug(ev.club_team);
  // La liga de siempre ya se entiende por el equipo del club; solo se muestra la competición
  // si es otra (una copa, un torneo…).
  const extraCompetition = isMatch && ev.competition && ev.competition !== team?.league;
  return (
    <li className="py-4 border-b border-linea/25 flex gap-4">
      <p className="font-display font-bold text-4xl leading-none w-[4.5rem] shrink-0 tabular-nums">
        {formatTime(ev.starts_at)}
      </p>
      <div className="min-w-0 flex-1">
        {versus ? (
          <p className="font-display font-bold text-3xl leading-tight break-words">
            {ev.home_team} <span className="text-arce text-2xl">vs</span> {ev.away_team}
          </p>
        ) : (
          <p className="font-display font-bold text-3xl leading-tight break-words">{ev.title}</p>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-block rounded px-2 py-0.5 text-sm font-semibold border border-linea/40 text-linea/80">
            {ev.kind}
          </span>
          {isMatch && team && (
            <span className="inline-block rounded px-2 py-0.5 text-sm font-semibold border border-arce text-arce">
              {team.name}
            </span>
          )}
          {extraCompetition && <span className="text-linea/90">{ev.competition}</span>}
          {ev.location && <span className="text-linea/90">{ev.location}</span>}
        </p>
        {ev.notes && <p className="mt-1 text-linea/80 whitespace-pre-line">{ev.notes}</p>}
        {coach && (
          <Link
            href={`/calendario/${ev.id}/editar`}
            className="mt-2 inline-flex items-center h-11 px-4 rounded-md border-2 border-linea/70 font-semibold"
          >
            Editar
          </Link>
        )}
      </div>
    </li>
  );
}

function Groups({ groups, coach }) {
  return groups.map((g) => (
    <section key={g.key} aria-label={g.label} className="mt-6">
      <h2 className="font-display font-extrabold text-2xl text-arce leading-none">{g.label}</h2>
      <ul>
        {g.events.map((ev) => (
          <EventRow key={ev.id} ev={ev} coach={coach} />
        ))}
      </ul>
    </section>
  ));
}

export default async function CalendarioPage({ searchParams }) {
  const showPast = searchParams?.pasados === "1";
  const [{ events, failed }, coach] = await Promise.all([loadEvents(), isCoach()]);

  const limit = Date.now() - GRACE_MS;
  const upcoming = events.filter((e) => Date.parse(e.starts_at) >= limit);
  const past = events.filter((e) => Date.parse(e.starts_at) < limit).reverse().slice(0, PAST_LIMIT);

  return (
    <main className="min-h-dvh max-w-xl mx-auto px-5 pt-6 pb-12">
      <Link
        href="/"
        className="inline-flex items-center h-11 -ml-2 px-2 font-semibold underline underline-offset-4"
      >
        Volver al menú
      </Link>

      <h1 className="mt-2 font-display font-extrabold text-6xl leading-[0.85]">Calendario</h1>

      {coach && (
        <Link
          href="/calendario/nuevo"
          className="mt-4 inline-flex items-center h-12 px-5 rounded-md bg-balon text-tinta font-display font-bold text-2xl"
        >
          + Nuevo evento
        </Link>
      )}

      {failed ? (
        <p className="mt-8 text-lg">
          No se ha podido cargar el calendario. Prueba otra vez en un momento; si sigue igual,
          avisa al entrenador.
        </p>
      ) : (
        <>
          {upcoming.length === 0 ? (
            <p className="mt-8 text-lg text-linea/80">
              No hay nada próximo. El entrenador irá añadiendo entrenos y partidos.
            </p>
          ) : (
            <Groups groups={groupByDay(upcoming)} coach={coach} />
          )}

          {past.length > 0 && (
            <div className="mt-10">
              {showPast ? (
                <>
                  <h2 className="font-display font-bold text-3xl leading-none">Ya pasados</h2>
                  <ul className="mt-2">
                    {past.map((ev) => (
                      <li key={ev.id} className="py-3 border-b border-linea/25 text-linea/80">
                        <span className="font-semibold">
                          {formatDay(ev.starts_at)}, {formatTime(ev.starts_at)}
                        </span>
                        {" · "}
                        {ev.title}
                        {coach && (
                          <Link
                            href={`/calendario/${ev.id}/editar`}
                            className="ml-3 underline underline-offset-4 font-semibold"
                          >
                            Editar
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/calendario"
                    className="mt-3 inline-flex items-center h-11 font-semibold underline underline-offset-4"
                  >
                    Ocultar los pasados
                  </Link>
                </>
              ) : (
                <Link
                  href="/calendario?pasados=1"
                  className="inline-flex items-center h-11 font-semibold underline underline-offset-4"
                >
                  Ver los pasados
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
