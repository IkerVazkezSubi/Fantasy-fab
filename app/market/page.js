"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const POSITION_LABEL = {
  base: "Base",
  escolta: "Escolta",
  alero: "Alero",
  "ala-pivot": "Ala-Pívot",
  pivot: "Pívot",
};

export default function MarketPage() {
  const [players, setPlayers] = useState([]);
  const [ownedIds, setOwnedIds] = useState(new Set());
  const [session, setSession] = useState(null);
  const [budget, setBudget] = useState(null);
  const [filterPos, setFilterPos] = useState("todas");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    const { data: playerRows } = await supabase
      .from("players")
      .select("id, full_name, position, current_price, active, teams(name)")
      .eq("active", true)
      .order("current_price", { ascending: false });
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

  const filtered =
    filterPos === "todas" ? players : players.filter((p) => p.position === filterPos);

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

      <div className="flex gap-2 mb-6 flex-wrap">
        {["todas", "base", "escolta", "alero", "ala-pivot", "pivot"].map((pos) => (
          <button
            key={pos}
            onClick={() => setFilterPos(pos)}
            className={`px-3 py-1 text-sm font-display border ${
              filterPos === pos
                ? "bg-ink text-paper border-ink"
                : "border-line hover:border-ink"
            }`}
          >
            {pos === "todas" ? "Todas" : POSITION_LABEL[pos]}
          </button>
        ))}
      </div>

      {message && <p className="mb-4 text-sm text-rio">{message}</p>}

      {!session && (
        <p className="mb-6 text-sm text-ink/70">
          Necesitas una cuenta para fichar jugadores. Puedes mirar el mercado
          sin registrarte.
        </p>
      )}

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
                <span className="badge-position">{POSITION_LABEL[p.position]}</span>
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
