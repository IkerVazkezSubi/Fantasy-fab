"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function StandingsPage() {
  const [standings, setStandings] = useState([]);

  useEffect(() => {
    supabase
      .from("manager_standings")
      .select("*")
      .order("total_points", { ascending: false })
      .then(({ data }) => setStandings(data || []));
  }, []);

  return (
    <div>
      <h1 className="text-3xl mb-6">Clasificación general</h1>
      {standings.length === 0 ? (
        <p className="text-ink/60">Todavía no hay jornadas puntuadas.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-ink text-left font-display text-sm">
              <th className="py-2 w-12">#</th>
              <th className="py-2">Manager</th>
              <th className="py-2 text-right">Puntos</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((m, i) => (
              <tr key={m.manager_id} className="border-b border-line">
                <td className="py-2 text-rio font-display">{i + 1}</td>
                <td className="py-2">{m.display_name}</td>
                <td className="py-2 text-right font-display">{m.total_points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
