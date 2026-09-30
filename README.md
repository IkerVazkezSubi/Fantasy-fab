# Fantasy FAB Huelva

Fantasy de aficionados para la **Liga Nacional N1 Masculina, Grupo A**
(Federación Andaluza de Baloncesto). No oficial. Los datos de cada partido
(minutos y Valoración/PIR) se introducen a mano desde el panel `/admin`,
copiándolos de la app o web oficial tras cada jornada.

## Cómo funciona

- Cada manager se registra y recibe **100M** de presupuesto virtual.
- Ficha una plantilla de hasta **10 jugadores** en `/market`.
- Cada jornada, elige un **quinteto titular de 5** en `/my-team`.
- Un admin registra el resultado del partido y, por cada jugador, sus
  **minutos** y su **Valoración/PIR** en `/admin`.
- Los puntos Fantasy de cada jugador = **PIR + 2 si su equipo ganó ese partido**.
- El precio de mercado del jugador sube o baja automáticamente según su PIR.
- La clasificación (`/standings`) suma los puntos de los titulares de cada
  manager, jornada a jornada.

Toda esta lógica (puntos, precios, límites de presupuesto/plantilla) vive en
la base de datos (`supabase/schema.sql`), no en el código de la web — así es
más difícil hacer trampas y más fácil de auditar.

## 1. Crear el proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → **New project**.
2. Cuando esté listo, abre **SQL Editor** → pega el contenido completo de
   `supabase/schema.sql` → **Run**.
3. (Opcional) Pega también `supabase/seed_teams_optional.sql` para
   precargar los equipos del Grupo A — revisa antes que los nombres estén
   bien y añade los que falten.
4. Ve a **Project Settings → API** y copia:
   - `Project URL`
   - `anon public key`

## 2. Configurar el proyecto local

```bash
cp .env.example .env.local
# Pega tu Project URL y anon key en .env.local

npm install
npm run dev
```

Abre `http://localhost:3000`.

## 3. Crear tu usuario admin

1. Regístrate normalmente desde `/signup` con tu propio email.
2. En Supabase → **Table Editor → profiles**, busca tu fila y copia tu `id`.
3. En **SQL Editor**, ejecuta:
   ```sql
   update profiles set is_admin = true where id = 'TU-UUID-AQUI';
   ```
4. Recarga la web — ahora verás el enlace **Admin** en el menú.

## 4. Subir a GitHub

```bash
git init
git add .
git commit -m "Fantasy FAB Huelva"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/fantasy-fab-huelva.git
git push -u origin main
```

## 5. Desplegar en Vercel

1. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el
   repo de GitHub que acabas de crear.
2. En **Environment Variables**, añade las dos mismas variables de tu
   `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Deploy**. En 1-2 minutos tienes la URL pública (tipo
   `fantasy-fab-huelva.vercel.app`) para compartir con los managers.

Cada vez que hagas `git push`, Vercel vuelve a desplegar solo.

## 6. Flujo de cada jornada (tu trabajo semanal)

1. En `/admin`, si es la primera vez que ves a ese rival, añade el equipo y
   sus jugadores (una vez; luego ya quedan guardados).
2. Registra el partido con el resultado (esto fija quién ganó).
3. Elige ese partido en el desplegable de estadísticas y copia, jugador a
   jugador, sus **minutos** y **Valoración/PIR** desde la app oficial.
4. Guardar. Los puntos y precios se recalculan solos.

## Notas honestas

- El plan gratis de Supabase pausa el proyecto tras una semana sin actividad
  (se reactiva solo entrando al panel de Supabase).
- El plan Hobby de Vercel es para uso no comercial — encaja con esto porque
  es una liga de aficionados sin cobrar entrada ni publicidad.
- Si un jugador cambia de equipo real a mitad de temporada, edítalo
  directamente en Supabase (`Table Editor → players`) — no hay UI para eso
  todavía.
