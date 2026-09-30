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
  const [ownedIds, setOwnedIds] = useState(new Set());
  const [session, setSession] = useState(null);
  const [budget, setBudget] = useState(null);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("todos");
  const [sortOrder, setSortOrder] = useState("desc"); // "desc" = caro a barato
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    const { data: playerRows } = await supabase
      .from("players")
      .select("id, full_name, position, current_price, active, teams(name)")
      .eq("active", true)
      .order("full_name");
    setPlayers(playerRows || []);

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

  const handleBuy = async (playerId) => {
    setMessage("");
    setBusyId(playerId);
    const { error } = await supabase.rpc("buy_player", { p_player_id: playerId });
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
                <span className="font-display text-xl">{p.current_price}M</span>
                {owned ? (
                  <span className="text-xs text-ink/50 font-display">FICHADO</span>
                ) : (
                  <button
                    onClick={() => handleBuy(p.id)}
                    disabled={!session || busyId === p.id}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    {busyId === p.id ? "..." : "Fichar"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
