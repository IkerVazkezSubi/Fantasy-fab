"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const POSITION_LABEL = {
  base: "Base",
  escolta: "Escolta",
  alero: "Alero",
  "ala-pivot": "Ala-Pívot",
  pivot: "Pívot",
};

export default function MyTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [roster, setRoster] = useState([]);
  const [jornada, setJornada] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push("/login");
      return;
    }
    const userId = sessionData.session.user.id;

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(profileRow);

    const { data: rosterRows } = await supabase
      .from("roster")
      .select("player_id, purchase_price, players(id, full_name, position, current_price, teams(name))")
      .eq("manager_id", userId);
    setRoster(rosterRows || []);

    const { data: matchRows } = await supabase
      .from("matches")
      .select("jornada")
      .order("jornada", { ascending: false })
      .limit(1);
    const nextJornada = matchRows && matchRows.length ? matchRows[0].jornada + 1 : 1;
    setJornada(nextJornada);

    const { data: lineupRows } = await supabase
      .from("lineups")
      .select("player_id")
      .eq("manager_id", userId)
      .eq("jornada", nextJornada);
    setSelected(new Set((lineupRows || []).map((l) => l.player_id)));

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleSelect = (playerId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else if (next.size < 5) {
        next.add(playerId);
      }
      return next;
    });
  };

  const handleSell = async (playerId) => {
    setMessage("");
    const { error } = await supabase.rpc("sell_player", { p_player_id: playerId });
    if (error) {
      setMessage(error.message);
      return;
    }
    load();
  };

  const handleSaveLineup = async () => {
    setMessage("");
    if (selected.size !== 5) {
      setMessage("Selecciona exactamente 5 jugadores para el quinteto titular.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("set_lineup", {
      p_jornada: jornada,
      p_player_ids: Array.from(selected),
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(`Quinteto de la jornada ${jornada} guardado.`);
  };

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-2">
        <h1 className="text-3xl">Mi equipo</h1>
        <p className="font-display text-lg">
          Presupuesto: <span className="text-rio">{profile?.budget_remaining}M</span>
        </p>
      </div>
      <p className="text-sm text-ink/60 mb-6">
        {roster.length}/10 jugadores en plantilla
      </p>

      {roster.length === 0 ? (
        <p className="text-ink/70">
          Todavía no tienes jugadores. Ve al <a href="/market">mercado</a> para
          fichar tu primer quinteto.
        </p>
      ) : (
        <>
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-xl">
                Titulares jornada {jornada}{" "}
                <span className="text-sm text-ink/50 font-body">
                  ({selected.size}/5 elegidos)
                </span>
              </h2>
              <button
                onClick={handleSaveLineup}
                disabled={busy}
                className="btn-primary text-sm"
              >
                {busy ? "Guardando..." : "Guardar quinteto"}
              </button>
            </div>
            {message && <p className="text-sm text-rio mb-3">{message}</p>}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {roster.map(({ players: p, purchase_price }) => (
                <label
                  key={p.id}
                  className={`card flex items-center gap-3 cursor-pointer ${
                    selected.has(p.id) ? "border-rio bg-rio/5" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    className="accent-rio"
                  />
                  <div className="flex-1">
                    <p className="font-display leading-tight">{p.full_name}</p>
                    <p className="text-xs text-ink/60">
                      {POSITION_LABEL[p.position]} · {p.teams?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display">{p.current_price}M</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleSell(p.id);
                      }}
                      className="text-xs text-ink/50 hover:text-rio underline"
                    >
                      vender
                    </button>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
