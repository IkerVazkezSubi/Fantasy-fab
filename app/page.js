"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

export default function HomePage() {
  const [top, setTop] = useState([]);

  useEffect(() => {
    supabase
      .from("manager_standings")
      .select("*")
      .order("total_points", { ascending: false })
      .limit(5)
      .then(({ data }) => setTop(data || []));
  }, []);

  return (
    <div>
      <section className="border-b-2 border-ink pb-10 mb-10">
        <p className="font-display tracking-wide text-rio mb-2">
          Temporada 2026/2027
        </p>
        <h1 className="text-4xl md:text-5xl leading-tight mb-4 max-w-2xl">
          Ficha tu quinteto de la Liga Nacional N1, Grupo A, y compite cada
          jornada.
        </h1>
        <p className="max-w-xl text-ink/80 mb-6">
          Compra jugadores de Gibraleón, Bonares, Lepe, Coria, Palos, Aljaraque
          y el resto del grupo con 100M de presupuesto virtual. Puntúan según
          su Valoración/PIR real de cada partido.
        </p>
        <div className="flex gap-3">
          <Link href="/market" className="btn-primary no-underline">
            Ver mercado
          </Link>
          <Link href="/standings" className="btn-secondary no-underline">
            Ver clasificación
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-xl mb-4">Top 5 managers</h2>
        {top.length === 0 ? (
          <p className="text-ink/60 text-sm">
            Todavía no hay puntos registrados esta temporada.
          </p>
        ) : (
          <ol className="card divide-y divide-line">
            {top.map((m, i) => (
              <li
                key={m.manager_id}
                className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
              >
                <span>
                  <span className="text-rio font-display mr-3">{i + 1}</span>
                  {m.display_name}
                </span>
                <span className="font-display">{m.total_points} pts</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
