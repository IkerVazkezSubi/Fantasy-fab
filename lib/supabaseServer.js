// Cliente de Supabase con la clave de servidor (service_role).
// Esa clave se salta toda la seguridad de la base de datos, así que este
// archivo SOLO puede usarse desde código de servidor. Si alguien lo importa
// desde un componente de cliente, el build falla gracias a "server-only".
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
