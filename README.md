# Pizarra

Web privada del equipo para ver las jugadas. Pensada para el móvil.

## Acceso

- Una contraseña común para los jugadores y otra para el entrenador.
- Todo está protegido: sin sesión, cualquier página redirige a `/login` y cualquier
  llamada a la API devuelve 401.
- La sesión dura 30 días y se guarda en una cookie firmada (httpOnly).
- La web no se indexa: `noindex` en las páginas, en la cabecera `X-Robots-Tag` y en `robots.txt`.

## Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Para qué sirve |
|---|---|
| `TEAM_PASSWORD` | Contraseña del equipo (rol jugador) |
| `COACH_PASSWORD` | Contraseña del entrenador (rol admin) |
| `SESSION_SECRET` | Cadena aleatoria de 32 caracteres o más para firmar la sesión |
| `NEXT_PUBLIC_SUPABASE_URL` | Dirección del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública de Supabase (hoy no se usa para leer datos) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servidor de Supabase. **Secreta**: nunca con `NEXT_PUBLIC_` |

Cambiar `SESSION_SECRET` cierra la sesión de todo el mundo. Cambiar una contraseña no
cierra las sesiones ya abiertas (para eso, cambia también `SESSION_SECRET`).

## Datos (Supabase)

Las jugadas viven en la tabla `plays` (`supabase/plays.sql`) y el calendario en `events` (`supabase/events.sql`). Las jugadas se agrupan por equipo (`lib/teams.js`; columna `team`, migración en `supabase/equipos.sql`). El calendario es único para todo el club. Tiene RLS activado y **sin
políticas**: la clave pública no puede leer ni escribir nada. Solo el servidor de la web,
con `SUPABASE_SERVICE_ROLE_KEY`, accede a los datos, y únicamente después de comprobar la
sesión. `lib/supabaseServer.js` usa `server-only`, así que si alguien lo importa desde un
componente de cliente el build falla en vez de filtrar la clave.

Cada jugada guarda sus pasos como JSON (formato explicado al principio de `supabase/plays.sql`).
Las coordenadas van de 0 a 100 sobre la media pista y el visor dibuja los movimientos desde
la posición del paso anterior a la del paso actual.

## Estructura

```
app/
  login/            pantalla de contraseña
  page.js           menú principal
  jugadas/          listado con filtro por categoría
  jugadas/[id]/     visor de una jugada
  calendario/       lista de entrenos y partidos; nuevo/ y [id]/editar/ solo entrenador
  jugadas/nueva/    editor: crear jugada (solo entrenador)
  jugadas/[id]/editar/  editor: modificar jugada (solo entrenador)
  api/events/       crear, guardar y borrar eventos (solo entrenador)
  api/plays/        crear, guardar, borrar y duplicar jugadas (solo entrenador)
  api/auth/         entrar (POST) y salir (DELETE)
  robots.js         robots.txt
components/
  Court.js          suelo y líneas de la media pista
  BoardSvg.js       dibuja la pizarra en un instante (sin estado)
  PlayBoard.js      reproductor: Play, flechas, pasos y animación
  EventForm.js      formulario de evento del calendario
  PlayEditor.js     editor: arrastrar jugadores, pasos, pases, bloqueos, defensores
lib/
  token.js          crear y comprobar la sesión
  session.js        leer la sesión en el servidor
  supabaseServer.js cliente de Supabase con clave de servidor
  playGeometry.js   normalizar pasos, interpolar y construir flechas/pases/bloqueos
  editorModel.js    operaciones del editor sobre un paso (funciones puras)
  playInput.js      validación de lo que llega al guardar
  dates.js          fechas en hora de Madrid
  events.js         tipos de evento y validación
  categories.js     categorías de jugadas
  sections.js       secciones del menú (activar una nueva = ready: true)
middleware.js       bloquea todo lo que no tenga sesión
supabase/plays.sql  tabla de jugadas y jugada de ejemplo
supabase/events.sql tabla del calendario
```

## Desarrollo

```bash
npm install
TEAM_PASSWORD=equipo COACH_PASSWORD=entrenador \
SESSION_SECRET=una-cadena-de-32-o-mas-caracteres \
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=tu-clave-de-servidor \
npm run dev
```
