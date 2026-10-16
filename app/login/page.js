"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CourtLines from "../../components/CourtLines";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace("/");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se ha podido entrar. Inténtalo otra vez.");
    } catch {
      setError("Sin conexión. Comprueba tu internet y vuelve a probar.");
    }
    setLoading(false);
  };

  return (
    <main className="relative min-h-dvh overflow-hidden flex flex-col justify-end px-6 pb-10 pt-28">
      <CourtLines className="pointer-events-none absolute -top-16 -right-28 w-[36rem] max-w-none text-linea opacity-[0.16]" />

      <div className="relative w-full max-w-sm">
        <h1 className="font-display font-extrabold text-7xl leading-[0.85]">Pizarra</h1>
        <p className="mt-4 text-lg text-linea/80">
          Zona privada del equipo. Escribe la contraseña que os han pasado.
        </p>

        <form onSubmit={handleSubmit} className="mt-8" noValidate>
          <label htmlFor="password" className="block font-medium mb-2">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? "true" : "false"}
              aria-describedby={error ? "login-error" : undefined}
              className="w-full h-14 rounded-md bg-linea text-tinta text-lg pl-4 pr-24"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-pressed={visible}
              className="absolute right-1 top-1 h-12 px-3 rounded text-pintura font-semibold"
            >
              {visible ? "Ocultar" : "Mostrar"}
            </button>
          </div>

          {error && (
            <p
              id="login-error"
              role="alert"
              className="mt-3 rounded-md bg-linea text-tinta px-3 py-2 font-medium border-l-4 border-balon"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || password.trim() === ""}
            className="mt-5 w-full h-14 rounded-md bg-balon text-tinta font-display font-bold text-2xl active:translate-y-px disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
