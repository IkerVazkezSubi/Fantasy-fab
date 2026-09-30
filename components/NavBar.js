"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

export default function NavBar() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setIsAdmin(!!data?.is_admin));
  }, [session]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="border-b-2 border-ink bg-paper">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
        <Link href="/" className="no-underline">
          <span className="font-display text-2xl tracking-tight text-ink">
            FANTASY <span className="text-rio">FAB</span>
          </span>
          <span className="block text-xs text-ink/60 font-body -mt-1">
            Liga Nacional N1 Masc. · Grupo A
          </span>
        </Link>

        <nav className="flex items-center gap-5 text-sm font-display">
          <Link href="/market" className="no-underline hover:text-rio">
            Mercado
          </Link>
          {session && (
            <Link href="/my-team" className="no-underline hover:text-rio">
              Mi equipo
            </Link>
          )}
          <Link href="/standings" className="no-underline hover:text-rio">
            Clasificación
          </Link>
          {isAdmin && (
            <Link href="/admin" className="no-underline hover:text-rio">
              Admin
            </Link>
          )}
          {session ? (
            <button onClick={signOut} className="btn-secondary no-underline">
              Salir
            </button>
          ) : (
            <Link href="/login" className="btn-primary no-underline">
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
