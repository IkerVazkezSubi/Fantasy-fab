"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const POSITION_LABEL = {
  base: "Base",
  escolta: "Escolta",
  alero: "Alero",
  "ala-pivot": "Ala-Pívot",
  pivot: "Pívot",
  "sin-posicion": "Sin posición",
};

export default function MarketPage() {
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [statsRows, setStatsRows] = useState([]);
  const [ownedIds, setOwnedIds] = useState(new Set());
  const [session, setSession] = useState(null);
  const [budget, setBudget] = useState(null);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("todos");
  const [sortOrder, setSortOrder] = useState("desc"); // "desc" = caro a barato
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    const { data: playerRows } = await supabase
      .from("players")
      .select("id, full_name, position, current_price, active, team_id, teams(name)")
      .eq("active", true)
      .order("full_name");
    setPlayers(playerRows || []);

    const { data: matchRows } = await supabase
      .from("matches")
      .select("id, jornada, home_team_id, away_team_id")
      .order("jornada");
    setMatches(matchRows || []);

    const { data: statRows } = await supabase
      .from("player_match_stats")
      .select("player_id, match_id, minutes, pir, fantasy_points");
    setStatsRows(statRows || []);

    const { data: rosterRows } = await supabase.from("roster").select("player_id");
    setOwnedIds(new Set((rosterRows || []).map((r) => r.player_id)));

    const { data: sessionData } = await supabase.auth.getSession();
    setSession(sessionData.session);
    if (sessionData.session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("budget_remaining")
        .eq("id", sessionData.session.user.id)
        .single();
      setBudget(profile?.budget_remaining ?? null);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleBuy = async (player) => {
    const confirmed = window.confirm(
      `¿Seguro que quieres fichar a ${player.full_name} por ${player.current_price}M?`
    );
    if (!confirmed) return;

    setMessage("");
    setBusyId(player.id);
    const { error } = await supabase.rpc("buy_player", { p_player_id: player.id });
    setBusyId(null);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Fichaje hecho.");
    load();
  };

  const teamOptions = useMemo(() => {
    const names = new Set(players.map((p) => p.teams?.name).filter(Boolean));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [players]);

  // Puntos totales de la temporada por jugador, a partir de todas las
  // estadísticas guardadas hasta ahora.
  const totalPointsByPlayer = useMemo(() => {
    const totals = {};
    statsRows.forEach((s) => {
      totals[s.player_id] = (totals[s.player_id] || 0) + Number(s.fantasy_points || 0);
    });
    return totals;
  }, [statsRows]);

  // Desglose jornada a jornada de un jugador: recorre todos los partidos de
  // SU equipo real (no solo donde tiene estadística) para poder distinguir
  // "no jugó" de "todavía no se ha jugado esa jornada".
  const getJornadaBreakdown = (player) => {
    const teamMatches = matches
      .filter((m) => m.home_team_id === player.team_id || m.away_team_id === player.team_id)
      .sort((a, b) => a.jornada - b.jornada);

    return teamMatches.map((m) => {
      const stat = statsRows.find((s) => s.match_id === m.id && s.player_id === player.id);
      return {
        jornada: m.jornada,
        played: !!stat,
        minutes: stat?.minutes,
        pir: stat?.pir,
        points: stat?.fantasy_points,
      };
    });
  };

  const filtered = useMemo(() => {
    let list = players;

    if (teamFilter !== "todos") {
      list = list.filter((p) => p.teams?.name === teamFilter);
    }

    if (search.trim() !== "") {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.full_name.toLowerCase().includes(q));
    }

    list = [...list].sort((a, b) =>
      sortOrder === "desc"
        ? b.current_price - a.current_price
        : a.current_price - b.current_price
    );

    return list;
  }, [players, teamFilter, search, sortOrder]);

  return (
    <div>
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
        <h1 className="text-3xl">Mercado</h1>
        {session && budget !== null && (
          <p className="font-display text-lg">
            Presupuesto: <span className="text-rio">{budget}M</span>
          </p>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <input
          type="text"
          className="input"
          placeholder="Buscar jugador por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="input"
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
        >
          <option value="todos">Todos los equipos</option>
          {teamOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          className="input"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        >
          <option value="desc">Precio: caro → barato</option>
          <option value="asc">Precio: barato → caro</option>
        </select>
      </div>

      {message && <p className="mb-4 text-sm text-rio">{message}</p>}

      {!session && (
        <p className="mb-6 text-sm text-ink/70">
          Necesitas una cuenta para fichar jugadores. Puedes mirar el mercado
          sin registrarte.
        </p>
      )}

      <p className="text-xs text-ink/50 mb-3">
        {filtered.length} jugador{filtered.length === 1 ? "" : "es"}
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => {
          const owned = ownedIds.has(p.id);
          const totalPoints = totalPointsByPlayer[p.id] || 0;
          const expanded = expandedId === p.id;
          const breakdown = expanded ? getJornadaBreakdown(p) : [];

          return (
            <div key={p.id} className="card flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-lg leading-tight">{p.full_name}</p>
                  <p className="text-xs text-ink/60">{p.teams?.name}</p>
                </div>
                <span className="badge-position">
                  {POSITION_LABEL[p.position] || p.position}
                </span>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div>
                  <span className="font-display text-xl">{p.current_price}M</span>
                  <span className="ml-2 text-xs text-ink/60 font-display">
                    {totalPoints} pts temporada
                  </span>
                </div>
                {owned ? (
                  <span className="text-xs text-ink/50 font-display">FICHADO</span>
                ) : (
                  <button
                    onClick={() => handleBuy(p)}
                    disabled={!session || busyId === p.id}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    {busyId === p.id ? "..." : "Fichar"}
                  </button>
                )}
              </div>

              <button
                onClick={() => setExpandedId(expanded ? null : p.id)}
                className="text-xs text-ink/50 hover:text-rio underline self-start"
              >
                {expanded ? "Ocultar jornadas ▲" : "Ver jornadas ▾"}
              </button>

              {expanded && (
                <div className="border-t border-line pt-2 mt-1">
                  {breakdown.length === 0 ? (
                    <p className="text-xs text-ink/50">
                      Su equipo todavía no tiene partidos registrados.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {breakdown.map((g) => (
                        <li
                          key={g.jornada}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-ink/60">J{g.jornada}</span>
                          {g.played ? (
                            <span>
                              {g.points} pts{" "}
                              <span className="text-ink/40">
                                ({g.minutes}′ · PIR {g.pir})
                              </span>
                            </span>
                          ) : (
                            <span className="text-ink/40">No jugó / sin datos</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
