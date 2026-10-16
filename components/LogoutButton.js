"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="h-11 px-4 rounded-md border-2 border-linea/70 font-display font-semibold text-lg active:bg-linea active:text-pintura disabled:opacity-50"
    >
      {busy ? "Saliendo…" : "Salir"}
    </button>
  );
}
