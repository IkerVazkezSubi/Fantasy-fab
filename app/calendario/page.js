import Link from "next/link";
import { supabaseAdmin } from "../../lib/supabaseServer";
import { isCoach } from "../../lib/session";
import { dayKey, formatDay, formatTime } from "../../lib/dates";
import { TEAMS, teamBySlug } from "../../lib/teams";
import { isMonth, monthLabel, monthWeeks, shiftMonth } from "../../lib/monthGrid";

export const dynamic = "force-dynamic";

// Un evento sigue contando como "próximo" hasta 3 horas después de empezar.
const GRACE_MS = 3 * 60 * 60 * 1000;
const PAST_LIMIT = 30;

async function loadEvents() {
  try {
    const { data, error } = await supabaseAdmin()
      .from("events")
      .select("id, title, kind, starts_at, location, notes, home_team, away_team, club_team, competition, home_score, away_score")
      .order("starts_at", { ascending: true });
    if (error) throw error;
    return { events: data ?? [], failed: false };
  } catch (e) {
    console.error("Error cargando el calendario:", e);
    return { events: [], failed: true };
  }
}

function EventRow({ ev, coach }) {
  const isMatch = ev.kind === "Partido";
  const versus = isMatch && ev.home_team && ev.away_team;
  const hasScore = versus && ev.home_score != null && ev.away_score != null;
  const team = teamBySlug(ev.club_team);
  // La liga de siempre ya se entiende por el equipo del club; solo se muestra la competición
  // si es otra (una copa, un torneo…).
  const extraCompetition = isMatch && ev.competition && ev.competition !== team?.league;
  return (
    <li className="py-4 border-b border-linea/25">
      <p className="font-display font-extrabold text-2xl text-arce leading-none">
        {formatDay(ev.starts_at)}, {formatTime(ev.starts_at)}
      </p>
      <div className="mt-2 min-w-0">
        {versus ? (
          <p className="font-display font-bold text-3xl leading-tight break-words">
            {ev.home_team}{" "}
            {hasScore ? (
              <span className="text-arce">
                {ev.home_score} – {ev.away_score}
              </span>
            ) : (
              <span className="text-arce text-2xl">vs</span>
            )}{" "}
            {ev.away_team}
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

function EventList({ events, coach }) {
  return (
    <ul className="mt-2">
      {events.map((ev) => (
        <EventRow key={ev.id} ev={ev} coach={coach} />
      ))}
    </ul>
  );
}

// Enlace de la página con sus opciones; lo que está por defecto no se escribe.
function href({ vista, ver, eq, mes, dia }) {
  const p = new URLSearchParams();
  if (vista === "mes") p.set("vista", "mes");
  if (ver === "resultados") p.set("ver", "resultados");
  if (eq) p.set("eq", eq);
  if (mes) p.set("mes", mes);
  if (dia) p.set("dia", dia);
  const q = p.toString();
  return q ? `/calendario?${q}` : "/calendario";
}

const DOT = { "nacional-masculino": "bg-arce", "provincial-masculino": "bg-balon", "provincial-femenino": "bg-linea" };

function Chip({ to, active, children, className = "" }) {
  return (
    <Link
      href={to}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center h-11 px-4 rounded-md border-2 font-semibold ${
        active ? "bg-linea text-pintura border-linea" : "border-linea/50 text-linea"
      } ${className}`}
    >
      {children}
    </Link>
  );
}

function MonthView({ ym, events, dia, eq, coach }) {
  const byDay = new Map();
  for (const ev of events) {
    const k = dayKey(ev.starts_at);
    if (k.startsWith(ym)) byDay.set(k, [...(byDay.get(k) ?? []), ev]);
  }
  const today = dayKey(new Date().toISOString());
  const shown = dia && dia.startsWith(ym) ? byDay.get(dia) ?? [] : [...byDay.values()].flat().sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const nav = (to, label) => (
    <Link href={href({ vista: "mes", eq, mes: to })} className="inline-flex items-center justify-center h-11 w-11 rounded-md border-2 border-linea/50 text-2xl" aria-label={label}>
      {label === "Mes anterior" ? "‹" : "›"}
    </Link>
  );
  return (
    <section className="mt-5">
      <div className="flex items-center justify-between gap-2">
        {nav(shiftMonth(ym, -1), "Mes anterior")}
        <h2 className="font-display font-extrabold text-3xl leading-none capitalize">{monthLabel(ym)}</h2>
        {nav(shiftMonth(ym, 1), "Mes siguiente")}
      </div>
      <div className="mt-3 grid grid-cols-7 text-center text-sm text-linea/70" aria-hidden="true">
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {monthWeeks(ym).flat().map((k, i) => {
          if (!k) return <span key={i} />;
          const evs = byDay.get(k) ?? [];
          const selected = k === dia;
          return (
            <Link
              key={k}
              href={href({ vista: "mes", eq, mes: ym, dia: selected ? null : k })}
              aria-label={`${Number(k.slice(8))}${evs.length ? `, ${evs.length} evento${evs.length > 1 ? "s" : ""}` : ""}`}
              className={`h-14 rounded-md flex flex-col items-center justify-center border-2 ${
                selected ? "border-arce bg-linea/15" : k === today ? "border-linea/60" : "border-transparent bg-linea/5"
              }`}
            >
              <span className="font-display font-bold text-xl leading-none">{Number(k.slice(8))}</span>
              <span className="mt-1 flex gap-0.5 h-2">
                {evs.slice(0, 3).map((ev) => (
                  <span key={ev.id} className={`w-2 h-2 rounded-full ${DOT[ev.club_team] ?? "border border-linea/70"}`} />
                ))}
              </span>
            </Link>
          );
        })}
      </div>
      {shown.length === 0 ? (
        <p className="mt-5 text-lg text-linea/80">{dia ? "Nada ese día." : "Nada este mes."}</p>
      ) : (
        <EventList events={shown} coach={coach} />
      )}
    </section>
  );
}

function Tabs({ active, eq }) {
  const base = "flex-1 inline-flex items-center justify-center h-12 font-display font-bold text-2xl border-b-4";
  return (
    <nav aria-label="Calendario" className="mt-6 flex">
      <Link
        href={href({ eq })}
        aria-current={active === "proximos" ? "page" : undefined}
        className={`${base} ${active === "proximos" ? "border-arce text-linea" : "border-linea/20 text-linea/60"}`}
      >
        Próximos
      </Link>
      <Link
        href={href({ ver: "resultados", eq })}
        aria-current={active === "resultados" ? "page" : undefined}
        className={`${base} ${active === "resultados" ? "border-arce text-linea" : "border-linea/20 text-linea/60"}`}
      >
        Resultados
      </Link>
    </nav>
  );
}

export default async function CalendarioPage({ searchParams }) {
  const vista = searchParams?.vista === "mes" ? "mes" : "lista";
  const tab = searchParams?.ver === "resultados" || searchParams?.pasados === "1" ? "resultados" : "proximos";
  const eq = teamBySlug(searchParams?.eq) ? searchParams.eq : null;
  const ym = isMonth(searchParams?.mes) ? searchParams.mes : dayKey(new Date().toISOString()).slice(0, 7);
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(searchParams?.dia ?? "") ? searchParams.dia : null;
  const [{ events: all, failed }, coach] = await Promise.all([loadEvents(), isCoach()]);
  // Con un equipo elegido solo salen sus partidos (los entrenos y otros eventos no son de un equipo).
  const events = eq ? all.filter((e) => e.club_team === eq) : all;

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

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Vista">
        <Chip to={href({ eq })} active={vista === "lista"}>Lista</Chip>
        <Chip to={href({ vista: "mes", eq })} active={vista === "mes"}>Mes</Chip>
      </div>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Equipo">
        <Chip to={href({ vista, ver: tab, eq: null, mes: vista === "mes" ? ym : null })} active={!eq}>Todos</Chip>
        {TEAMS.map((t) => (
          <Chip key={t.slug} to={href({ vista, ver: tab, eq: t.slug, mes: vista === "mes" ? ym : null })} active={eq === t.slug}>
            {t.name}
          </Chip>
        ))}
      </div>

      {vista === "lista" && <Tabs active={tab} eq={eq} />}

      {failed ? (
        <p className="mt-8 text-lg">
          No se ha podido cargar el calendario. Prueba otra vez en un momento; si sigue igual,
          avisa al entrenador.
        </p>
      ) : vista === "mes" ? (
        <MonthView ym={ym} events={events} dia={dia} eq={eq} coach={coach} />
      ) : tab === "proximos" ? (
        upcoming.length === 0 ? (
          <p className="mt-8 text-lg text-linea/80">
            {eq ? "No hay partidos próximos de este equipo." : "No hay nada próximo. El entrenador irá añadiendo entrenos y partidos."}
          </p>
        ) : (
          <EventList events={upcoming} coach={coach} />
        )
      ) : past.length === 0 ? (
        <p className="mt-8 text-lg text-linea/80">Todavía no hay partidos terminados.</p>
      ) : (
        <ul className="mt-4">
{past.map((ev) => {
                      const versus = ev.kind === "Partido" && ev.home_team && ev.away_team;
                      const hasScore = versus && ev.home_score != null && ev.away_score != null;
                      return (
                        <li key={ev.id} className="py-3 border-b border-linea/25">
                          <p className="text-sm text-linea/70">
                            {formatDay(ev.starts_at)}, {formatTime(ev.starts_at)}
                          </p>
                          <p className="font-display font-bold text-2xl leading-tight break-words">
                            {versus ? (
                              <>
                                {ev.home_team}{" "}
                                {hasScore ? (
                                  <span className="text-arce">
                                    {ev.home_score} – {ev.away_score}
                                  </span>
                                ) : (
                                  <span className="text-arce text-xl">vs</span>
                                )}{" "}
                                {ev.away_team}
                              </>
                            ) : (
                              ev.title
                            )}
                          </p>
                          {coach && (
                            <Link
                              href={`/calendario/${ev.id}/editar`}
                              className="inline-flex items-center h-11 underline underline-offset-4 font-semibold"
                            >
                              {versus && !hasScore ? "Añadir resultado" : "Editar"}
                            </Link>
                          )}
                        </li>
                      );
                    })}
        </ul>
      )}
    </main>
  );
}
