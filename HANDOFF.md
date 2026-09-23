# Handoff — Cartera IBKR

**Para quien retome esto sin haber estado en las conversaciones anteriores** (otra persona, u
otro agente de IA trabajando desde Antigravity, Claude Code, o donde sea). Felipe decidió mover
el trabajo de este proyecto desde Cowork a Antigravity con la extensión de Claude, operando
directo sobre esta carpeta. Este documento existe para que ese cambio de herramienta no cueste
contexto.

Fecha de este documento: **2026-09-15**. Todo lo que dice "hoy" o "al día de la fecha" se refiere
a ese día, verificado contra producción y contra la base en vivo, no contra memoria de
conversación.

No repite lo que ya está bien documentado en `README.md` y en `docs/` (cómo correr la app, cómo
testearla, cómo deployarla, el mapa de módulos, el shape exacto del snapshot). Este documento es
la otra mitad: **qué se decidió, en qué orden, por qué, qué se construyó en la sesión más
reciente de trabajo, qué quedó sin hacer y por qué, y qué hay que verificar antes de seguir.**

---

## Qué es esta app, en una frase

Un dashboard de cartera de inversión para clientes de Interactive Brokers (IBKR): se conecta al
Flex Web Service de cada usuario, sincroniza solo, y muestra posiciones, rendimiento y algunas
ideas educativas. Nació como herramienta personal de Felipe y hoy está en el umbral de sumar a
los primeros amigos como usuarios de prueba, sin cobrar todavía. En producción:
**`https://eve-chat-template-chi-dusky.vercel.app`**.

## Los dos principios que gobiernan cualquier decisión acá — no son negociables

Son palabras textuales de Felipe, y valen como filtro para cualquier cambio futuro, lo pida quien
lo pida:

> *"yo no quiero ni por asomo saber el dinero o las tenencias de la gente. cada usuario su
> mundo."*

> *"si 100% lo más más más importante es la seguridad, la app puede fallar, crashearse, que sea
> horrible, pero JAMÁS JAMÁS tener un fallo de seguridad que mis clientes o yo mismo perdamos
> nuestro dinero."*

Ante la duda entre algo más cómodo/lindo y algo más seguro, gana seguro, sin excepción — y esto
no se relaja porque la app hoy no cobre. Todo lo que sigue en este documento es, en el fondo, la
implementación de estos dos párrafos.

---

## Estado general al 2026-09-15

- **Diseño:** "Glass" (fotografía real de fondo — toro de bronce en oscuro, balanza antigua en
  claro — vidrio esmerilado, tipografía Archivo + IBM Plex Mono), migrado a producción de forma
  incremental durante agosto y completado el 21/08 junto con el refactor a módulos. No es un
  mockup: es lo que corre hoy. El historial completo de iteraciones de diseño (por qué se
  descartó glassmorphism candy, por qué se descartó el primer intento de Glass sin foto real,
  etc.) está en `cartera/plan-dashboard.md` del proyecto de Claude — no hace falta repetirlo acá,
  pero vale saber que existe por si se vuelve a tocar el diseño, para no repetir pasos ya
  descartados.
- **Navegación:** 4 pestañas — Resumen, Posiciones, Simulador, Ideas. Configuración todavía no
  existe como pantalla real (hay prototipos sueltos, ver `producto/infraestructura.md`).
- **Auth:** Supabase, email+password y Google, RLS por usuario desde el día uno.
- **Datos:** sincronización diaria automática por `pg_cron` contra IBKR Flex — sin intervención
  manual. Perfil de inversor persistente (nombre preferido, riesgo, horizonte, temáticas) ya
  integrado: el onboarding y el test de personalización por instrumentos concretos
  (`assets/js/onboarding.js`, `assets/js/profile.js`) están construidos y en el repo. *Nota: el
  doc de proyecto `cartera/asesor-ia-perfil.md` todavía dice "esperando aprobación de Felipe para
  escribirlo a la carpeta" — quedó desactualizado, el código ya está ahí y correspondía a la
  versión v3 (test por instrumentos, progressive disclosure) descripta en ese mismo doc. Confirmado
  leyendo el código, no solo el doc.*
- **La pieza que cambió en la sesión de trabajo más reciente** (y el motivo de que este handoff
  haga falta ahora): el servidor dejó de guardar qué tenencias tiene cada usuario. Es el cambio
  más importante de arquitectura desde que existe la app. El resto de este documento lo explica
  en detalle.

---

## La arquitectura de datos — qué cambió y por qué

### De dónde viene esto

Con la migración a Glass ya en producción, Felipe planteó armar una versión de esto que otros
usuarios de IBKR paguen (ver `cartera/estrategia-producto-pago.md` del proyecto). Ahí quedaron
sobre la mesa tres formas posibles de resolver "cada usuario su mundo" sin cerrar cuál elegir —
la número 2 ("versión intermedia": el servidor sigue sincronizando solo como hasta ahora, pero
nunca guarda tenencias ni montos crudos, solo números ya calculados) quedó anotada como la
recomendada para arrancar, con dos preguntas técnicas sin responder: si el Flex Web Service de
IBKR admite llamarse directo desde el navegador del usuario (CORS), y qué hacer con las pantallas
que sí necesitan el detalle por ticker (Posiciones, el "Tu ganancia real" del Simulador).

Antes de sumar amigos reales a la app, Felipe decidió explícitamente resolver esto primero (no
después). Esta sesión de trabajo respondió las dos preguntas pendientes y construyó la versión 2
completa:

- **CORS: confirmado que no.** Se probó en vivo, en el navegador, contra el endpoint real del
  Flex Web Service de IBKR. Una llamada `no-cors` devuelve una respuesta opaca (status 0) aunque
  el pedido efectivamente le llegue a IBKR y devuelva un status real (se vio 503 en la prueba,
  visible en el inspector de red pero no para JavaScript). Conclusión: un servidor intermedio no
  es opcional, es la única forma de que el navegador del usuario hable con IBKR.
- **El detalle por ticker: se calcula al momento, nunca se guarda.** Es la pieza que la versión 2
  del doc de estrategia no había resuelto todavía — ver abajo.

### Cómo funciona hoy, en dos capas

**Capa 1 — sincronización diaria (lo único que se guarda, y son agregados).**
`pg_cron` dispara la Edge Function `sync-ibkr` todos los días a las 10:00 UTC (07:00 Argentina).
Adentro, la función sigue necesitando el detalle completo del Flex Statement para poder calcular
cosas como la variación diaria contra el snapshot anterior — pero justo antes de escribir en
`portfolio_snapshots.data`, pasa el resultado por `computeDerivedShape()`, que se queda solo con:

```
generated_at, summary, performance, performance_series, allocation,
positions_count (un número, no la lista), real_gain: { total_cost, total_value,
total_gain, total_gain_pct }, _sync_meta
```

Ni un ticker, ni una cantidad, ni un precio de compra, ni una operación individual llegan a la
base. Esto es distinto de "está encriptado" o "solo Felipe con acceso admin lo vería" — directamente
**no existe** en ningún lado del lado del servidor. Ver `docs/DATOS.md` (actualizado en esta
misma sesión) para el shape exacto campo por campo.

**Capa 2 — detalle por posición (se pide en el momento, se devuelve, y se olvida).**
Nueva Edge Function `fetch-positions`, autenticada con el JWT del propio usuario que hace el
pedido (no con la publishable key, no con un secret compartido — cada quien solo puede pedir el
detalle de su propia cuenta, verificado con `auth.getUser()` contra el token). Cuando el usuario
abre una pestaña que necesita detalle por ticker (Posiciones, Simulador, Ideas), el frontend le
pide a esta función el Flex Statement, la función lo arma desde IBKR en el momento y lo devuelve
en la respuesta HTTP. No escribe nada en ninguna tabla. Del lado del navegador,
`assets/js/positions-detail.js` guarda ese detalle en una variable en memoria (nunca en
`localStorage`, nunca en ningún storage persistente) — se pierde solo con recargar la página, a
propósito.

### Lo que esto logra y lo que cuesta

Logra cumplir "cada usuario su mundo" al pie de la letra: ni Felipe revisando la base de datos, ni
alguien que se filtrara la base, puede ver qué tiene cada usuario — ni hoy ni en el historial,
porque el historial ya no lo tiene tampoco (ver limpieza de datos viejos, más abajo). Cuesta que
Posiciones, Simulador e Ideas ahora tardan un poco más en mostrar contenido la primera vez que se
abren en cada sesión de navegación (piden a IBKR en el momento en vez de leer algo ya guardado), y
que si IBKR está lento o no responde, esas pestañas se degradan mientras el hero y los tiles de
Resumen (que solo dependen de los agregados ya guardados) siguen andando. Es un costo aceptado a
propósito, no un efecto secundario no visto — con una excepción real que sí es un efecto
secundario no visto: el gráfico de asignación por clase de activo de Resumen. Ver el hallazgo
concreto más abajo.

---

## Qué se construyó, archivo por archivo

### Backend (Supabase, proyecto `cartera`, ref `udttbufjeznrfpwfbzzz`, región `sa-east-1`)

- **`sync-ibkr`** (Edge Function existente, ahora en **v5**, desplegada el **2026-08-28**): se le
  agregó `computeDerivedShape()`, descripta arriba. El gate de autenticación que ya tenía (header
  `x-sync-secret`, validado contra la función `get_sync_shared_secret()`) no cambió.
- **`fetch-positions`** (Edge Function **nueva**, desplegada el **2026-08-28**, en **v2** desde
  ese mismo día): autenticación por JWT de usuario, arma el detalle desde IBKR y lo devuelve sin
  persistir nada. La v1 tenía un bug real de CORS (ver abajo) — la v2 ya lo tiene corregido y es
  la que está activa.
- Nada nuevo se agregó al schema de tablas para este cambio — es puramente una cuestión de qué se
  escribe en `portfolio_snapshots.data`, no de qué tablas existen.

**El bug de CORS que se encontró y se corrigió en el camino:** la primera versión de
`fetch-positions` no manejaba explícitamente el método `OPTIONS`. Un navegador que llama a una
Edge Function con headers custom (`Authorization`, `Content-Type`) manda primero un preflight
`OPTIONS` — y como esa versión no lo distinguía del resto de la lógica, caía en la validación de
auth y devolvía 401 sin headers de CORS. El navegador, al ver eso, ni siquiera llegaba a mandar el
POST real (`TypeError: Failed to fetch`, confirmado viendo que la única llamada en la pestaña de
red era el OPTIONS, con status 401). Se corrigió agregando un manejo explícito de `OPTIONS` antes
de cualquier otra lógica (devuelve 204 con los headers de CORS) y centralizando todas las
respuestas por una función `jsonResponse()` que siempre los incluye. Redesplegado como v2 y
reverificado end-to-end contra una sesión real ya logueada de Felipe (token leído del
`localStorage` de su propia pestaña ya autenticada — nunca se tipeó ninguna contraseña).

### Frontend (repo `felipeimpieri/IBRK-app`, carpeta local `IBRK`)

- **`assets/js/positions-detail.js`** (archivo nuevo) — el loader on-demand: `ensurePositionsDetail()`
  pide el detalle a `fetch-positions` la primera vez que hace falta y lo cachea en memoria durante
  esa sesión de navegación; `getPositionsDetailCache()` y `getPositionsDetailError()` exponen el
  resultado o el error al resto de la app.
- **`assets/js/state.js`** — se agregó `setPositionsDetail()`. Mutando `DATA` en el lugar (no
  reasignando), cualquier módulo que ya haya importado `DATA` ve el detalle apenas llega, sin
  necesitar re-exportar nada — es el mismo patrón de binding vivo que ya usaba el resto del
  estado (ver `docs/DECISIONES.md`, "El estado mutable vive en un solo lugar").
- **`assets/js/render.js`** — reescrito. `renderAll()` se partió en dos: la parte que no depende
  de detalle por ticker se dibuja siempre (hero y tiles de Resumen), y una nueva
  `renderPositionsDependentSections()` pide el detalle de forma perezosa, muestra un estado de
  carga mientras espera, y si llega bien dibuja Posiciones + Operaciones + Simulador + Ideas
  juntos desde el mismo pedido compartido (un solo llamado a `fetch-positions` alcanza para las
  cuatro). **Ojo:** el gráfico de "Asignación por clase de activo" de Resumen quedó afuera de esta
  separación y no es tan inofensivo como parece — ver el hallazgo concreto más abajo, en "Un bug
  encontrado al verificar esta arquitectura".
- **`assets/js/views/posiciones.js`** — `renderPositions()` / `renderTrades()` ahora usan
  `DATA.positions || []` / `DATA.trades || []`: si el detalle todavía no llegó (o falló), la
  pantalla no explota, muestra vacío o el estado de carga/error que puso `render.js`.
- **`assets/js/views/ideas.js`** — mismo patrón defensivo en `computeProfileInsights()` y
  `computeAdjustmentInsights()`.
- **`assets/js/views/simulador.js`** — acá había que tomar una decisión de producto además de la
  técnica, ver la sección siguiente sobre benchmarks.

Todo esto quedó en un solo commit: **`0726271`**, sobre `cf15e2c` (el refactor a módulos del
26/08), autor y fecha **2026-08-31 19:53 UTC**. Mensaje: *"feat: cargar detalle de posiciones bajo
demanda (fetch-positions), no crashear sin positions/trades en el snapshot"*. 6 archivos, 155
inserciones, 11 borrados.

---

## La brecha de 18 días entre "está hecho" y "está andando" — por qué vale la pena entenderla

Esto no es una anécdota, es la razón concreta por la que hizo falta esta sesión de verificación
antes de seguir a cualquier otra cosa, y vale dejarla escrita para que no se repita.

Cronología verificada (no recordada — contra los timestamps reales de Supabase y GitHub):

1. **2026-08-28**, backend: `sync-ibkr` pasa a v5 (deja de guardar detalle crudo) y `fetch-positions`
   se crea. Desde ese mismo día, cada snapshot nuevo en `portfolio_snapshots` ya tiene el shape
   minimizado — confirmado hoy contra la base: los 15 snapshots que existen van del 2026-08-28 al
   2026-09-15, y ninguno de los 15 tiene la clave `positions` cruda.
2. **2026-08-31**, frontend: se escribe y se commitea localmente el fix que hace que la app sepa
   leer el shape nuevo (commit `0726271`). El commit queda guardado en el repo local de la carpeta
   `IBRK`, pero **no se pushea todavía**.
3. **2026-08-28 → 2026-09-15**, producción: durante estos 18 días, el sitio en vivo seguía
   sirviendo el frontend viejo, que esperaba `DATA.positions` y `DATA.trades` con contenido real.
   Al no estar más esas claves en el snapshot, `renderPositions()`, `renderTrades()` y
   `renderBenchmarks()` tiraban una excepción sin capturar — y como `renderAll()` dibuja las
   cuatro pestañas en una sola función síncrona sin aislar errores por sección, una excepción en
   Posiciones cortaba también Simulador e Ideas. **Resumen seguía andando bien** (no toca detalle
   por ticker), lo cual probablemente ocultó el problema — quien abriera la app y solo mirara
   Resumen no veía nada raro.
4. **2026-09-15** (hoy, esta sesión): se le pidió a Felipe que corriera `git push` desde su propia
   terminal (ver por qué tiene que ser así en la sección de infraestructura más abajo), y recién
   ahí Vercel desplegó el commit `0726271` a producción.

**La causa raíz de la brecha no es técnica, es de proceso:** este entorno en la nube no tiene
credenciales de GitHub de Felipe por diseño de seguridad, así que el paso final (`git push`)
depende siempre de que alguien lo corra desde una terminal real en la máquina de Felipe. Ese paso
específico no se hizo hasta que se lo pidieron explícitamente esta sesión. La lección operativa
(ya escrita en `docs/DECISIONES.md` y en `README.md`, y que vale repetir acá porque esta vez
además hubo un cambio de servidor de por medio) es: **un commit local no es un deploy, y un deploy
no está confirmado hasta que se compara lo que sirve producción (ETag / contenido real) contra el
archivo revisado.** No alcanza con "ya lo pusheé" — hay que verificarlo pidiéndole el archivo
servido a producción directamente.

---

## Limpieza de datos históricos — 29 snapshots viejos, borrados a propósito

Antes de este cambio, `portfolio_snapshots` tenía filas viejas con el shape anterior completo
(detalle crudo por ticker y por operación) — 29 filas, todas de la propia cuenta de Felipe (no
había otros usuarios todavía). Se le preguntó explícitamente a Felipe qué hacer con ellas
(guardarlas aparte, exportarlas, o borrarlas) y eligió **borrarlas ahora**, sin exportar. El
borrado se hizo con una condición sobre la presencia del campo (filas que todavía tenían la clave
`positions` con el shape viejo), no con IDs a mano, para no depender de una lista armada por
memoria.

**Verificado hoy contra la base, no asumido:** `portfolio_snapshots` tiene 15 filas en total, cero
de ellas con la clave `positions` cruda, la más vieja del 2026-08-28 y la más nueva de hoy — lo
que confirma dos cosas a la vez: que el borrado se sostuvo (no quedó ninguna fila vieja) y que el
cron diario viene produciendo el shape nuevo consistentemente desde el primer día.

---

## Qué se probó y qué falta probar

**Confirmado, con evidencia directa contra producción (no por lectura de código ni por memoria):**
- El JavaScript que sirve `https://eve-chat-template-chi-dusky.vercel.app` hoy contiene
  `renderPositionsDependentSections` (o sea, es el `render.js` nuevo, no el viejo).
- El archivo `assets/js/positions-detail.js` responde 200 desde producción — no puede estar ahí
  si no es exactamente este commit el que está desplegado.
- Cargar la página de login (sin sesión) no tira errores de consola, en dos verificaciones
  separadas.
- `fetch-positions` fue probada de punta a punta contra una sesión real ya logueada (200, con
  posiciones y operaciones reales devueltas; un JWT inválido da 401 como corresponde) — esto se
  verificó antes de que existiera todavía el wiring del frontend, así que prueba que la función en
  sí funciona, no que la integración completa funciona.

**Sin confirmar todavía, y es lo primero que hay que cerrar:** el ciclo completo logueado — que
al entrar con una cuenta real, Posiciones/Simulador/Ideas efectivamente pasen de estado de carga a
mostrar datos reales, usando exactamente esta combinación de código ya desplegada. No se pudo
verificar en esta sesión por una razón simple y permanente: no está permitido loguearse como
Felipe ni entrar ninguna contraseña suya, así que la única forma de confirmarlo es que Felipe lo
mire él mismo, o que una sesión futura lo verifique contra una pestaña donde Felipe ya esté
logueado (como se hizo para probar `fetch-positions` en aislado).

---

## Un bug encontrado al verificar esta arquitectura — concreto, sin arreglar todavía

Esto no es una sospecha ni algo "por confirmar" — es una lectura directa del código tal como está
desplegado hoy (`assets/js/render.js`, `assets/js/finance.js`), hecha al escribir este documento
para no dejar pasar algo que las pruebas de "no hay errores de consola" no iban a detectar.

En `render.js`, `renderAll()` llama a `renderBarChart('chart-asset-class', assetClassAllocation())`
de forma síncrona, **antes** de que `renderPositionsDependentSections()` le pida el detalle a
`fetch-positions`. En ese primer instante `DATA.positions` todavía no existe — el snapshot
minimizado nunca lo trae — y `assetClassAllocation()` (en `finance.js`) ya es defensiva
(`(DATA.positions || [])`), así que no tira una excepción, pero calcula la asignación por clase de
activo sobre una lista vacía. Resultado: el gráfico **"Asignación por clase de activo" de Resumen
se dibuja mostrando solo Efectivo y Dividendos por cobrar, sin la porción de Acciones y ETFs**, con
porcentajes que no suman 100%.

Nada vuelve a llamar a `renderBarChart('chart-asset-class', ...)` después de que el detalle
finalmente llega: `renderPositionsDependentSections()` solo re-dibuja Posiciones, Operaciones,
Simulador e Ideas, nunca Resumen. Revisando los tres disparadores posibles de un nuevo `renderAll()`
completo (`main.js`, `auth.js`, `ui/tabs.js`, `ui/theme.js`): cambiar de pestaña no alcanza
(`ui/tabs.js` solo alterna clases CSS), y el único que sí fuerza un `renderAll()` de nuevo es tocar
el botón de tema claro/oscuro o un cambio de esquema de color del sistema operativo — ninguno de
los dos es algo que un usuario haga por rutina al entrar.

**Efecto práctico:** todo usuario que entre hoy a la app va a ver, en Resumen, el gráfico de
asignación por clase de activo incompleto — no roto, no crasheado, pero mostrando menos de lo que
realmente tiene — a menos que toque el botón de tema. No se detectó en la verificación de
producción de esta sesión porque esa verificación se hizo contra la pantalla de login sin sesión
iniciada, donde este gráfico ni se dibuja — otra razón más para el punto anterior: falta confirmar
el ciclo logueado completo.

**Arreglo probable, a confirmar antes de aplicar (no se aplicó en esta sesión, a propósito — ver
la nota al final del documento sobre por qué):** mover el cálculo y dibujo de `chart-asset-class`
adentro de `renderPositionsDependentSections()`, junto con Posiciones/Simulador/Ideas, que ya
dependen del mismo detalle, en vez de dejarlo en la parte de `renderAll()` que corre siempre. Es un
cambio chico, pero como cualquier cambio a `render.js`, conviene pasarlo por `tests/smoke_test.py`
y verificar contra producción por ETag antes de pushear — el mismo protocolo que ya está escrito en
`README.md` y `docs/DECISIONES.md`.

---

## Lo que quedó deliberadamente sin resolver — y por qué

### La comparación contra benchmarks (SPY/QQQ/BTC) ya no tiene de dónde salir

`views/simulador.js` ahora tiene una guarda temprana: si `DATA.simulator` no existe (que va a ser
siempre, de acá en más — ese bloque ya venía congelado desde antes, ver `docs/DATOS.md`), en vez
de intentar dibujar los tiles y el gráfico con datos que no están, muestra un mensaje honesto de
"no disponible" en lugar de crashear. Esto **no es una regresión nueva de esta sesión** — el
bloque `simulator` del snapshot ya estaba congelado desde antes (ver `cartera/auditoria-datos.md`
#6 y #7 del proyecto), y de hecho la comparación contra benchmarks es justo la única pieza que
depende de tener fecha de compra por ticker, algo que ya se había medido y confirmado que **no se
puede inferir de forma confiable** desde el precio promedio (ver `cartera/motor-retorno-real.md`).
Lo que sí cambió acá es que, al dejar de guardarse detalle crudo en el snapshot, desapareció
también cualquier posibilidad de que un día alguien "arregle" el bloque `simulator` recalculándolo
del lado del servidor con detalle guardado — ahora esa reconstrucción, si se hace, tiene que salir
también del lado on-demand (capa 2), igual que Posiciones.

No se reconstruyó esta sesión porque no era lo pedido y porque el camino correcto ya está
especificado en `cartera/motor-retorno-real.md` (arquitectura de tres capas: exacto / acotado por
rango / carga manual) — construirlo apurado, sin fecha de compra real, es exactamente el tipo de
"número que parece dato pero no lo es" que Felipe rechazó explícitamente más de una vez en este
proyecto. La tarjeta de "Tu ganancia real" (la que sí es exacta, `market_value − cost_basis`, sin
necesitar fecha de compra) sigue funcionando normal porque ahora sale del detalle on-demand de
`fetch-positions`, no del snapshot.

### El comportamiento logueado de punta a punta

Explicado arriba, en "Qué falta probar". Repetido acá porque es el pendiente más importante: sin
esto confirmado, no correspondería sumar amigos nuevos todavía, aunque la arquitectura de
privacidad ya esté resuelta.

### Actualizar `cartera/estrategia-producto-pago.md` y `cartera/asesor-ia-perfil.md`

Los dos quedaron con secciones desactualizadas por este trabajo (la pregunta de arquitectura que
el primero dejaba abierta ya está resuelta e implementada; el segundo dice "esperando aprobación"
de algo que ya está en el código). Se corrigieron con una nota al tope de cada uno en esta misma
sesión — ver esos documentos directamente en el proyecto de Claude ("Economia y Finanzas").

### Todo lo demás que ya estaba pendiente antes de esta sesión y sigue igual

Ninguno de estos se tocó ahora — se listan para que no se pierdan, con dónde está el detalle
completo de cada uno:

- `performance` y `performance_series` siguen congelados (el hero y el gráfico de rendimiento
  acumulado no reflejan el día real) — necesita que la Edge Function los recalcule, plan completo
  en `cartera/motor-retorno-real.md`.
- `allocation.sector` y `allocation.country` siguen congelados, mismo motivo.
- Historial largo con estimación por IA + carga manual (backlog #6 de `cartera/backlog-features.md`)
  — la decisión de producto ya la tomó Felipe (se estima y se muestra, con divulgación pegada al
  número, horquilla en vez de punto cuando la incertidumbre es grande), falta implementarlo.
- Dividendos en detalle (backlog #1), detalle por posición con histórico/noticias (backlog #2),
  scores de cartera + modo LIBERADA (backlog #3), definir qué significa "Ideas pro de verdad"
  (backlog #4 — pregunta abierta para Felipe, no resuelta), alertas configurables (backlog #5).
- La pregunta de segmento de producto (inversor de largo plazo vs. trader activo) y el
  competitive-brief real contra Sharesight/Kubera/Snowball Analytics — ambos abiertos en
  `cartera/estrategia-producto-pago.md`.
- El tema legal/compliance de onboardear terceros con datos financieros reales — planteado desde
  el 31/07, todavía sin resolver a nivel formal (para la etapa informal con amigos, alcanza con
  avisarles explícitamente qué es esto antes de que conecten su cuenta, que es lo que ya hace el
  tutorial).

---

## Infraestructura — referencia rápida

| Servicio | Detalle |
|---|---|
| **Frontend / hosting** | Vercel, proyecto `eve-chat-template` (id `prj_hIWqQtigsf2BxIoiV8aSvJNqdCyG`), team `felipes-projects-7719ea5f`. URL de producción: `eve-chat-template-chi-dusky.vercel.app`. `git push` a `main` dispara auto-deploy solo, confirmado repetidas veces — no hace falta promoción manual. |
| **Código fuente** | GitHub `felipeimpieri/IBRK-app`, rama `main`. Carpeta local de Felipe: `IBRK` (Windows, dentro de su OneDrive). |
| **Backend / base** | Supabase, proyecto `cartera`, ref `udttbufjeznrfpwfbzzz`, región `sa-east-1`, plan free. |
| **Tablas** | `public.profiles` (perfil de inversor, una fila por usuario), `public.portfolio_snapshots` (jsonb `data`, sin schema forzado — el shape es puramente convención de aplicación, documentado en `docs/DATOS.md`), `public.ibkr_connections` (referencia al token de Flex de cada usuario, nunca el token en texto plano). |
| **RPCs `security definer`** | `get_ibkr_flex_credentials(p_user_id)` y `get_sync_shared_secret()` — ambas otorgadas solo a `service_role`, confirmado que un usuario autenticado normal no puede llamarlas ni para su propio `user_id`. |
| **Edge Functions** | `sync-ibkr` (v5, cron diario) y `fetch-positions` (v2, on-demand por usuario) — ver detalle arriba. |
| **Sincronización** | `pg_cron`, job `sync-ibkr-daily`, todos los días 10:00 UTC (07:00 Argentina) vía `pg_net`. |
| **IBKR** | Flex Query `Cartera_Sync_Daily` (Query ID `1589498`), Date Period "Year to Date" (limita el historial de operaciones a los últimos ~12 meses — es un ajuste de la cuenta de cada cliente, no algo que la app pueda cambiar sola). Token de Flex con vigencia de 1 año, guardado en Supabase Vault. |

Para el detalle completo de cómo se llegó a cada una de estas decisiones de infraestructura
(por qué un proyecto de Supabase nuevo y no el existente, por qué Vercel y no otra cosa, el
historial de bloqueos de deploy, etc.), ver `producto/infraestructura.md` en el proyecto de
Claude — no se repite acá.

---

## Cómo se trabaja acá — protocolos que evitan repetir errores ya cometidos

Esto importa tanto como la arquitectura misma, porque varios de estos protocolos existen
*porque* algo salió mal una vez sin ellos:

**`git push` lo corre siempre Felipe, desde una terminal real en su máquina — nunca una sesión en
la nube, nunca el puente de dispositivo.** No es una limitación de producto de una herramienta en
particular: cualquier terminal que corra nativamente en la PC de Felipe tiene su git, sus
credenciales guardadas y su red sin restricciones; lo que nunca puede pushear es algo corriendo en
un sandbox en la nube, sin importar qué asistente de IA sea. El puente de dispositivo
(`mcp__remote-devices__*` en Cowork) sirve bien para leer y escribir archivos directo en la
carpeta `IBRK`, pero no para operaciones de git con red — se probó explícitamente y falla por
motivos de red/credenciales, no por falta de permiso.

**Verificar producción, no confiar en "ya lo pusheé".** Comparar el ETag que sirve el dominio de
producción (`curl -sI <url> | grep etag`) contra el md5 del archivo local, o directamente pedirle
a producción el archivo servido y buscar un string que solo esté en la versión nueva. Un preview
de Vercel no sirve como canal de revisión con Felipe — él siempre abre su URL de producción de
siempre.

**Nunca inventar un número.** Si un dato no está disponible, la app lo dice — no se rellena con
una estimación disfrazada de dato real. Cuando sí hace falta estimar (ver el plan de historial
largo en `cartera/motor-retorno-real.md`), la estimación se muestra igual, pero con la marca
pegada al número mismo, no escondida en una esquina.

**Las cinco funciones de `finance.js` son intocables sin leer `docs/AUDITORIA.md` primero.**
Corrigen bugs reales que le mostraban números incorrectos al usuario (variación diaria mal
calculada, P&L realizado en cero, asignación de activos ignorando el efectivo). Cualquier cambio
al frontend que las toque tiene que poder mostrarse por diff que no cambió su cuerpo.

**El trabajo de diseño visual pasa por Claude Design operado por Claude, no por Claude diseñando
directo en el chat.** Pedido explícito de Felipe (mandó de ejemplo un proyecto anterior donde no
le gustó el resultado). Si hace falta tocar el diseño, el flujo es controlar Claude Design vía
automatización de navegador, no generar HTML/CSS de diseño a mano en una conversación.

**Nada se implementa "apurado" a costa de la integridad del dato.** El patrón que se repite en
todo el proyecto (ver `docs/DECISIONES.md`) es: si un número está mal encuadrado, se cambia la
jerarquía visual, no se le agrega una nota al pie: una aclaración chica y gris debajo de un número
grande y confuso no arregla nada, porque el número grande sigue siendo lo único que se lee.

---

## Problema de plataforma conocido, no relacionado con el código de esta app

Una actualización de Windows del **8 de septiembre de 2026** rompió la capacidad del puente de
dispositivo de montar la carpeta `IBRK` como filesystem para correr comandos de shell
(`device_bash`) — da un error de "no Plan9 drive shares mounted". Es un problema de la plataforma,
reconocido y en seguimiento, no algo que Felipe ni ninguna sesión de trabajo haya causado.
**Confirmado que sigue presente hoy 2026-09-15** (se volvió a probar en esta misma sesión antes de
escribir este documento). Lo que sigue funcionando bien, verificado hoy: listar directorios, leer
archivos y escribir archivos por su ruta en el dispositivo (`device_list_dir`, `device_stage_files`,
`device_commit_files`), que fue exactamente cómo se armó este documento. Si se retoma trabajo desde
Cowork con el puente de dispositivo en vez de desde Antigravity, tenerlo en cuenta: comandos de
shell directos sobre la carpeta van a fallar hasta que se resuelva del lado de la plataforma; las
otras tres vías no.

---

## Próximos pasos sugeridos, en orden

1. **Arreglar el gráfico de asignación por clase de activo de Resumen** (ver "Un bug encontrado al
   verificar esta arquitectura" arriba) — es chico, ya está diagnosticado a nivel de línea de
   código, y conviene resolverlo antes de que lo vea un amigo de Felipe y no solo él. Verificar con
   el smoke test y por ETag de producción antes de darlo por hecho, como todo lo demás acá.
2. **Confirmar el ciclo logueado completo** (Posiciones, Simulador, Ideas cargando datos reales
   sin errores, más allá del bug de arriba) — lo puede confirmar Felipe abriendo la app él mismo,
   es lo más simple y lo que más falta.
3. Si algo más se ve raro en ese chequeo, es prioridad inmediata antes de cualquier otra cosa — la
   arquitectura de privacidad no sirve de nada si la app no funciona.
4. Con eso confirmado, retomar el plan de sumar a los primeros amigos con el tutorial de
   onboarding ya publicado (ver `cartera/estrategia-producto-pago.md`).
5. Decidir si vale la pena reconstruir la comparación contra benchmarks bajo la arquitectura
   nueva (capa 2, on-demand) o retirarla formalmente del producto — hoy queda "no disponible" sin
   fecha definida.
6. De ahí en más, el trabajo pendiente más grande y con plan ya escrito es el motor de retorno
   real completo (`cartera/motor-retorno-real.md`) — reemplaza el bloque `performance` congelado
   por el TWR real de IBKR (que además ya está confirmado que no necesita estimarse), y resuelve
   de paso la ventana de historial de operaciones.

---

## Nota sobre cómo trabajar con Felipe en este proyecto puntual

Para trabajo de fondo (arquitectura, datos, seguridad): exige procesamiento real — cálculos,
datos y fuentes verificables, nunca una aproximación presentada como si fuera un dato real. Prefiere
que los cambios de diseño visual se aprueben de a una pantalla, no todo junto. Para cuestiones
técnicas que él mismo tenga que ejecutar (como correr `git push`), agradece guía paso a paso,
concreta, con los comandos exactos — no una descripción general de qué hacer.

## Por qué este documento no arregló el bug que encontró

A propósito. El pedido de esta sesión fue un handoff, no seguir programando — y Felipe está
moviendo el trabajo activo a otra herramienta (Antigravity) precisamente ahora, así que tocar
`render.js` de nuevo acá, sin poder verificarlo contra una sesión logueada real ni correr el smoke
test end-to-end antes de que él lo revise, sería exactamente el tipo de cambio "confío en que
funciona" que este mismo documento describe como el problema de fondo de la brecha de 18 días.
Mejor un diagnóstico preciso y verificable que otro parche sin confirmar.
