# Cartera (nombre de trabajo)

Dashboard personal de cartera de Interactive Brokers (IBKR), en camino a convertirse en un producto multi-usuario. Ver `spec-cartera-app.md` para el spec completo (fases, arquitectura, modelo de seguridad).

## Estado actual (2026-07-31)

**Login real funcionando de punta a punta** — Supabase Auth (email+password con confirmación obligatoria, login con Google), RLS por usuario desde el día uno. El dashboard completo queda detrás del login.

- `index.html` — la app: HTML+CSS+JS plano (sin framework de build). Pantalla de login/registro + gate de autenticación, carga los datos de la cartera desde Supabase (`portfolio_snapshots`, la última fila del usuario logueado) en vez de `data.json`. Diseño visual deliberadamente neutro/mínimo — funcional, no es el diseño final (eso lo define Design, ver más abajo).
- `data.json` — snapshot de referencia de la cartera de Felipe (posiciones, rendimiento, simulador, recomendaciones). Ya no lo carga `index.html` directamente, pero sirve como referencia/fixture del shape de datos que espera `portfolio_snapshots.data`.
- `compute_data.py` — script que genera/actualiza ese shape de datos a partir de los datos crudos de IBKR.
- `BRIEF_para_design.md` — brief usado con Claude Design para la dirección visual (en curso, todavía no hay una versión final aprobada).
- `spec-cartera-app.md` — spec de producto: fases (personal → multi-usuario IBKR → futuro), arquitectura, seguridad, preguntas abiertas.
- `inject_standalone.py` — **desactualizado**, daba por sentado el loader viejo (`fetch('./data.json')`) que ya no existe. Servía para compartir un HTML standalone con datos embebidos (se usó para el brief de Design); no es compatible con la app multi-usuario real. Se deja en el repo como referencia histórica, no se usa más.

Backend: Supabase project `cartera` (ref `udttbufjeznrfpwfbzzz`), tablas `profiles` + `portfolio_snapshots`, RLS activado. Detalle completo de infraestructura y decisiones en el doc del proyecto de Claude (`producto/infraestructura.md`).

## Próximo

Sincronización automática (hoy la carga de datos es manual), pantalla de cuenta básica, y la nueva dirección visual una vez que Design la defina. Detalle completo en el spec.

## Deploy

Se deploya a Vercel (`eve-chat-template-chi-dusky.vercel.app`). El diseño visual final está en discusión — el HTML actual es una base funcional, no el diseño definitivo.
