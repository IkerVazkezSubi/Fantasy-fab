"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const POSITIONS = ["base", "escolta", "alero", "ala-pivot", "pivot"];

export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);

  const [teamName, setTeamName] = useState("");
  const [playerForm, setPlayerForm] = useState({
    team_id: "",
    full_name: "",
    position: "base",
    initial_price: 10,
  });
  const [matchForm, setMatchForm] = useState({
    jornada: 1,
    home_team_id: "",
    away_team_id: "",
    home_score: "",
    away_score: "",
    match_date: "",
  });

  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [statRows, setStatRows] = useState([]); // { player_id, full_name, minutes, pir }
  const [msg, setMsg] = useState("");

  const loadAll = async () => {
    const { data: teamRows } = await supabase.from("teams").select("*").order("name");
    setTeams(teamRows || []);
    const { data: playerRows } = await supabase
      .from("players")
      .select("*, teams(name)")
      .order("full_name");
    setPlayers(playerRows || []);
    const { data: matchRows } = await supabase
      .from("matches")
      .select("*, home:home_team_id(name), away:away_team_id(name)")
      .order("jornada", { ascending: false });
    setMatches(matchRows || []);
  };

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", sessionData.session.user.id)
        .single();
      if (!profile?.is_admin) {
        setAllowed(false);
        setChecking(false);
        return;
      }
      setAllowed(true);
      setChecking(false);
      loadAll();
    })();
  }, []);

  const addTeam = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("teams").insert({ name: teamName });
    if (error) return setMsg(error.message);
    setTeamName("");
    loadAll();
  };

  const addPlayer = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("players").insert({
      team_id: playerForm.team_id,
      full_name: playerForm.full_name,
      position: playerForm.position,
      initial_price: playerForm.initial_price,
      current_price: playerForm.initial_price,
    });
    if (error) return setMsg(error.message);
    setPlayerForm({ team_id: "", full_name: "", position: "base", initial_price: 10 });
    loadAll();
  };

  const saveMatch = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("matches").insert({
      jornada: matchForm.jornada,
      home_team_id: matchForm.home_team_id,
      away_team_id: matchForm.away_team_id,
      home_score: matchForm.home_score || null,
      away_score: matchForm.away_score || null,
      match_date: matchForm.match_date || null,
    });
    if (error) return setMsg(error.message);
    setMatchForm({
      jornada: matchForm.jornada,
      home_team_id: "",
      away_team_id: "",
      home_score: "",
      away_score: "",
      match_date: "",
    });
    loadAll();
  };

  const openMatchForStats = (matchId) => {
    setSelectedMatchId(matchId);
    const match = matches.find((m) => String(m.id) === String(matchId));
    if (!match) return;
    const squad = players.filter(
      (p) => p.team_id === match.home_team_id || p.team_id === match.away_team_id
    );
    setStatRows(
      squad.map((p) => ({
        player_id: p.id,
        full_name: p.full_name,
        team: p.teams?.name,
        minutes: "",
        pir: "",
      }))
    );
  };

  const updateStatRow = (playerId, field, value) => {
    setStatRows((rows) =>
      rows.map((r) => (r.player_id === playerId ? { ...r, [field]: value } : r))
    );
  };

  const saveStats = async () => {
    setMsg("");
    const rowsToSave = statRows.filter((r) => r.minutes !== "" && r.pir !== "");
    if (rowsToSave.length === 0) {
      setMsg("Rellena al menos minutos y valoración de un jugador.");
      return;
    }
    const { error } = await supabase.from("player_match_stats").upsert(
      rowsToSave.map((r) => ({
        match_id: selectedMatchId,
        player_id: r.player_id,
        minutes: Number(r.minutes),
        pir: Number(r.pir),
      })),
      { onConflict: "match_id,player_id" }
    );
    if (error) return setMsg(error.message);
    setMsg(`Guardadas las estadísticas de ${rowsToSave.length} jugadores.`);
  };

  if (checking) return <p>Comprobando permisos...</p>;
  if (!allowed) {
    return (
      <div>
        <h1 className="text-3xl mb-4">Acceso restringido</h1>
        <p>
          Esta sección es solo para administradores de la liga. Si crees que
          deberías tener acceso, pide que te marquen como admin en la base de
          datos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <h1 className="text-3xl">Panel de administración</h1>
      {msg && <p className="text-sm text-rio">{msg}</p>}

      {/* Equipos */}
      <section>
        <h2 className="text-xl mb-3">Equipos</h2>
        <form onSubmit={addTeam} className="flex gap-2 mb-4 max-w-md">
          <input
            className="input"
            placeholder="Nombre del equipo"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
          />
          <button className="btn-primary whitespace-nowrap">Añadir</button>
        </form>
        <p className="text-sm text-ink/60">{teams.map((t) => t.name).join(" · ")}</p>
      </section>

      {/* Jugadores */}
      <section>
        <h2 className="text-xl mb-3">Jugadores</h2>
        <form onSubmit={addPlayer} className="grid sm:grid-cols-2 gap-3 max-w-xl mb-2">
          <select
            className="input"
            value={playerForm.team_id}
            onChange={(e) => setPlayerForm({ ...playerForm, team_id: e.target.value })}
            required
          >
            <option value="">Equipo</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Nombre del jugador"
            value={playerForm.full_name}
            onChange={(e) => setPlayerForm({ ...playerForm, full_name: e.target.value })}
            required
          />
          <select
            className="input"
            value={playerForm.position}
            onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value })}
          >
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.5"
            className="input"
            placeholder="Precio inicial (M)"
            value={playerForm.initial_price}
            onChange={(e) =>
              setPlayerForm({ ...playerForm, initial_price: e.target.value })
            }
          />
          <button className="btn-primary sm:col-span-2">Añadir jugador</button>
        </form>
        <p className="text-sm text-ink/60">{players.length} jugadores en la base de datos.</p>
      </section>

      {/* Partidos */}
      <section>
        <h2 className="text-xl mb-3">Registrar partido / resultado</h2>
        <form onSubmit={saveMatch} className="grid sm:grid-cols-3 gap-3 max-w-2xl">
          <input
            type="number"
            className="input"
            placeholder="Jornada"
            value={matchForm.jornada}
            onChange={(e) => setMatchForm({ ...matchForm, jornada: e.target.value })}
            required
          />
          <input
            type="date"
            className="input"
            value={matchForm.match_date}
            onChange={(e) => setMatchForm({ ...matchForm, match_date: e.target.value })}
          />
          <div />
          <select
            className="input"
            value={matchForm.home_team_id}
            onChange={(e) => setMatchForm({ ...matchForm, home_team_id: e.target.value })}
            required
          >
            <option value="">Equipo local</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="input"
            placeholder="Pts local"
            value={matchForm.home_score}
            onChange={(e) => setMatchForm({ ...matchForm, home_score: e.target.value })}
          />
          <div />
          <select
            className="input"
            value={matchForm.away_team_id}
            onChange={(e) => setMatchForm({ ...matchForm, away_team_id: e.target.value })}
            required
          >
            <option value="">Equipo visitante</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="input"
            placeholder="Pts visitante"
            value={matchForm.away_score}
            onChange={(e) => setMatchForm({ ...matchForm, away_score: e.target.value })}
          />
          <button className="btn-primary">Guardar partido</button>
        </form>
      </section>

      {/* Estadísticas por jugador */}
      <section>
        <h2 className="text-xl mb-3">Introducir minutos y valoración (PIR)</h2>
        <select
          className="input max-w-md mb-4"
          value={selectedMatchId}
          onChange={(e) => openMatchForStats(e.target.value)}
        >
          <option value="">Elige un partido</option>
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              J{m.jornada} · {m.home?.name} {m.home_score ?? "-"} - {m.away_score ?? "-"}{" "}
              {m.away?.name}
            </option>
          ))}
        </select>

        {statRows.length > 0 && (
          <div>
            <table className="w-full border-collapse mb-4">
              <thead>
                <tr className="border-b-2 border-ink text-left text-sm font-display">
                  <th className="py-2">Jugador</th>
                  <th className="py-2">Equipo</th>
                  <th className="py-2">Minutos</th>
                  <th className="py-2">Valoración (PIR)</th>
                </tr>
              </thead>
              <tbody>
                {statRows.map((r) => (
                  <tr key={r.player_id} className="border-b border-line">
                    <td className="py-1.5">{r.full_name}</td>
                    <td className="py-1.5 text-ink/60">{r.team}</td>
                    <td className="py-1.5">
                      <input
                        type="number"
                        step="0.5"
                        className="input w-20"
                        value={r.minutes}
                        onChange={(e) =>
                          updateStatRow(r.player_id, "minutes", e.target.value)
                        }
                      />
                    </td>
                    <td className="py-1.5">
                      <input
                        type="number"
                        step="1"
                        className="input w-20"
                        value={r.pir}
                        onChange={(e) => updateStatRow(r.player_id, "pir", e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={saveStats} className="btn-primary">
              Guardar estadísticas de este partido
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
