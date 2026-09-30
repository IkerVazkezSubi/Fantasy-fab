"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const POSITION_LABEL = {
  base: "Base",
  escolta: "Escolta",
  alero: "Alero",
  "ala-pivot": "Ala-Pívot",
  pivot: "Pívot",
  "sin-posicion": "Sin posición",
};

// Coordenadas (en %) de cada hueco sobre la cancha cuadrada, en formación de
// quinteto clásica (base arriba llevando el balón, escolta/alero como alas a
// la misma altura, ala-pívot/pívot abajo cerca del aro, también a la misma
// altura). Son solo una guía visual: cualquier jugador de tu plantilla puede
// ocupar cualquier hueco.
const SLOTS = [
  { key: "base", label: "Base", top: "9%", left: "50%" },
  { key: "escolta", label: "Escolta", top: "40%", left: "17%" },
  { key: "alero", label: "Alero", top: "40%", left: "83%" },
  { key: "ala-pivot", label: "Ala-Pívot", top: "76%", left: "27%" },
  { key: "pivot", label: "Pívot", top: "76%", left: "73%" },
];

function HalfCourt() {
  return (
    <svg
      viewBox="0 0 400 400"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="none"
    >
      <rect x="0" y="0" width="400" height="400" fill="#C48A4A" />
      <rect
        x="8"
        y="8"
        width="384"
        height="384"
        fill="none"
        stroke="#F1E9DA"
        strokeWidth="3"
      />
      {/* Línea de triple, arco abierto hacia el aro (abajo) */}
      <path
        d="M 20 392 L 20 160 A 180 180 0 0 1 380 160 L 380 392"
        fill="none"
        stroke="#F1E9DA"
        strokeWidth="3"
      />
      {/* Zona (la pintura), pegada a la línea de fondo inferior */}
      <rect
        x="130"
        y="232"
        width="140"
        height="160"
        fill="none"
        stroke="#F1E9DA"
        strokeWidth="3"
      />
      {/* Círculo de tiros libres, discontinuo en la mitad alejada del aro */}
      <circle
        cx="200"
        cy="232"
        r="60"
        fill="none"
        stroke="#F1E9DA"
        strokeWidth="3"
        strokeDasharray="10 8"
      />
      {/* Tablero y aro */}
      <rect x="170" y="392" width="60" height="4" fill="#F1E9DA" />
      <circle cx="200" cy="400" r="8" fill="none" stroke="#F1E9DA" strokeWidth="3" />
    </svg>
  );
}

export default function MyTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [roster, setRoster] = useState([]);
  const [jornada, setJornada] = useState(1);
  const [slotAssignments, setSlotAssignments] = useState({}); // { slotKey: playerId }
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickerSlot, setPickerSlot] = useState(null); // qué hueco está eligiendo jugador

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
      .select(
        "player_id, purchase_price, players(id, full_name, position, current_price, teams(name))"
      )
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

    const savedIds = (lineupRows || []).map((l) => l.player_id);
    const assignments = {};
    SLOTS.forEach((slot, i) => {
      if (savedIds[i]) assignments[slot.key] = savedIds[i];
    });
    setSlotAssignments(assignments);

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const assignedIds = useMemo(
    () => new Set(Object.values(slotAssignments)),
    [slotAssignments]
  );

  const bench = roster.filter(({ player_id }) => !assignedIds.has(player_id));

  const assignPlayer = (slotKey, playerId) => {
    setSlotAssignments((prev) => ({ ...prev, [slotKey]: playerId }));
    setPickerSlot(null);
  };

  const removeFromSlot = (slotKey) => {
    setSlotAssignments((prev) => {
      const next = { ...prev };
      delete next[slotKey];
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
    const ids = Object.values(slotAssignments);
    if (ids.length !== 5) {
      setMessage("Coloca 5 jugadores en la cancha antes de guardar.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("set_lineup", {
      p_jornada: jornada,
      p_player_ids: ids,
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(`Quinteto de la jornada ${jornada} guardado.`);
  };

  const playerById = (id) => {
    const row = roster.find((r) => r.player_id === id);
    return row?.players;
  };

  if (loading) return <p>Cargando...</p>;

  if (roster.length === 0) {
    return (
      <div>
        <h1 className="text-3xl mb-4">Mi equipo</h1>
        <p className="text-ink/70">
          Todavía no tienes jugadores. Ve al <a href="/market">mercado</a> para
          fichar tu primer quinteto.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-2">
        <h1 className="text-3xl">Mi equipo</h1>
        <p className="font-display text-lg">
          Presupuesto: <span className="text-rio">{profile?.budget_remaining}M</span>
        </p>
      </div>
      <p className="text-sm text-ink/60 mb-6">
        {roster.length}/10 jugadores en plantilla · {assignedIds.size}/5 en el quinteto
      </p>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl">Titulares jornada {jornada}</h2>
        <button onClick={handleSaveLineup} disabled={busy} className="btn-primary text-sm">
          {busy ? "Guardando..." : "Guardar quinteto"}
        </button>
      </div>
      {message && <p className="text-sm text-rio mb-3">{message}</p>}

      {/* CANCHA */}
      <div className="relative w-full max-w-md mx-auto mb-10" style={{ aspectRatio: "1 / 1" }}>
        <HalfCourt />
        {SLOTS.map((slot) => {
          const playerId = slotAssignments[slot.key];
          const player = playerId ? playerById(playerId) : null;
          return (
            <div
              key={slot.key}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-24"
              style={{ top: slot.top, left: slot.left }}
            >
              {player ? (
                <div className="bg-paper border-2 border-ink px-2 py-1 text-center shadow-md">
                  <p className="text-[10px] text-ink/50 font-display leading-none mb-0.5">
                    {slot.label}
                  </p>
                  <p className="text-xs font-display leading-tight truncate">
                    {player.full_name.split(",")[0]}
                  </p>
                  <p className="text-xs text-rio font-display">{player.current_price}M</p>
                  <button
                    onClick={() => removeFromSlot(slot.key)}
                    className="text-[10px] text-ink/40 hover:text-rio underline"
                  >
                    quitar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setPickerSlot(slot.key)}
                  className="w-full bg-paper/90 border-2 border-dashed border-ink/40 px-2 py-2 text-center hover:border-rio"
                >
                  <p className="text-[10px] text-ink/50 font-display leading-none mb-1">
                    {slot.label}
                  </p>
                  <p className="text-xs font-display">+ Añadir</p>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* SELECTOR DE JUGADOR para un hueco */}
      {pickerSlot && (
        <div className="card max-w-md mx-auto mb-10">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display">
              Elige jugador para: {SLOTS.find((s) => s.key === pickerSlot)?.label}
            </p>
            <button onClick={() => setPickerSlot(null)} className="text-sm text-ink/50">
              cerrar
            </button>
          </div>
          {bench.length === 0 ? (
            <p className="text-sm text-ink/60">
              No te queda banquillo libre — quita a alguien de la cancha primero.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {bench.map(({ player_id, players: p }) => (
                <li key={player_id} className="py-2 flex items-center justify-between">
                  <span>
                    {p.full_name} <span className="text-ink/50 text-xs">· {p.teams?.name}</span>
                  </span>
                  <button
                    onClick={() => assignPlayer(pickerSlot, player_id)}
                    className="btn-secondary text-xs px-2 py-1"
                  >
                    Poner aquí
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* BANQUILLO / PLANTILLA COMPLETA */}
      <section>
        <h2 className="text-xl mb-3">Banquillo y plantilla</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bench.map(({ player_id, players: p }) => (
            <div key={player_id} className="card flex items-center gap-3">
              <div className="flex-1">
                <p className="font-display leading-tight">{p.full_name}</p>
                <p className="text-xs text-ink/60">
                  {POSITION_LABEL[p.position] || p.position} · {p.teams?.name}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display">{p.current_price}M</p>
                <button
                  onClick={() => handleSell(player_id)}
                  className="text-xs text-ink/50 hover:text-rio underline"
                >
                  vender
                </button>
              </div>
            </div>
          ))}
        </div>
        {bench.length === 0 && (
          <p className="text-sm text-ink/60">
            Toda tu plantilla está puesta en la cancha ahora mismo.
          </p>
        )}
      </section>
    </div>
  );
}
