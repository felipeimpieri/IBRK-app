# Arquitectura

## En una frase

Una página estática que se autentica contra Supabase, se trae la última fila de
`portfolio_snapshots` del usuario logueado, y la dibuja en cuatro pestañas. No hay servidor
propio, no hay build, no hay framework.

## Flujo de datos

```
IBKR Flex Web Service
        │  (una vez por día, pg_cron)
        ▼
Supabase Edge Function  ──►  portfolio_snapshots.data  (JSONB, una fila por sync)
                                       │
                                       │  select ... order by captured_at desc limit 1
                                       ▼
                             auth.js → setData(...) → state.js
                                       │
                                       ▼
                             render.js → views/* → DOM
```

La app **solo lee**. Nunca escribe en `portfolio_snapshots`. Lo único que escribe es el perfil
del inversor, en la tabla `profiles` (ver `profile.js`).

## Mapa de módulos

```mermaid
graph TD
  main[main.js] --> auth[auth.js]
  main --> supabase[supabase.js]
  main --> onboarding[onboarding.js]
  main --> ui_theme[ui/theme.js]
  main --> ui_tabs[ui/tabs.js]
  auth --> profile[profile.js]
  auth --> render[render.js]
  auth --> state[state.js]
  auth --> supabase
  auth --> ui_screens[ui/screens.js]
  onboarding --> config[config.js]
  onboarding --> profile
  onboarding --> render
  onboarding --> state
  onboarding --> ui_screens
  profile --> state
  profile --> supabase
  render --> finance[finance.js]
  render --> state
  render --> ui_charts[ui/charts.js]
  render --> v_resumen[views/resumen.js]
  render --> v_posiciones[views/posiciones.js]
  render --> v_simulador[views/simulador.js]
  render --> v_ideas[views/ideas.js]
  finance --> state
  supabase --> config
  ui_charts --> config
  ui_charts --> format[format.js]
  ui_charts --> state
  ui_tabs --> config
  ui_theme --> render
  ui_theme --> state
  v_resumen --> finance
  v_resumen --> format
  v_resumen --> state
  v_posiciones --> format
  v_posiciones --> state
  v_simulador --> format
  v_simulador --> state
  v_ideas --> format
  v_ideas --> profile
  v_ideas --> state
```

**El grafo no tiene ciclos** y todos los módulos son alcanzables desde `main.js`.
Si agregás un módulo, mantené las dos propiedades.

## Qué hace cada módulo

| Módulo | Líneas | Responsabilidad |
|---|---:|---|
| `main.js` | 16 | Arranca. Si no hay cliente de Supabase, avisa en pantalla. |
| `supabase.js` | 13 | Crea el cliente. Aislado para que nadie más dependa del arranque. |
| `config.js` | 19 | Constantes: URL y key de Supabase, pestañas, paleta, mapa de instrumentos. |
| `state.js` | 18 | `DATA` y el id de usuario. **Se mutan solo desde acá**, vía `setData` / `setCurrentUserId`. |
| `format.js` | 25 | `fmtUSD`, `fmtPct`, `deltaClass`, etc. Sin lógica de negocio. |
| `finance.js` | 105 | ⚠ Las cinco funciones auditadas. Ver `AUDITORIA.md`. |
| `auth.js` | 135 | Login, registro, y la carga del snapshot desde Supabase. |
| `profile.js` | 42 | Lee, guarda y aplica el perfil de inversor (tabla `profiles`). |
| `onboarding.js` | 51 | Pantalla de bienvenida. Solo efectos: registra sus listeners al importarse. |
| `render.js` | 27 | El orquestador. **Si querés saber qué se dibuja, empezá acá.** |
| `ui/theme.js` | 38 | Claro / oscuro / sistema, persistido en `localStorage`. |
| `ui/tabs.js` | 23 | Pestañas y deep-link por `#hash`. |
| `ui/screens.js` | 21 | Alterna entre login, onboarding y app. |
| `ui/charts.js` | 112 | SVG a mano: línea de rendimiento y barras. Sin librerías. |
| `views/resumen.js` | 50 | Hero y tiles. |
| `views/posiciones.js` | 40 | Tabla de tenencias y de operaciones. |
| `views/simulador.js` | 198 | Ganancia real (exacta) + comparación contra benchmarks (parcial). |
| `views/ideas.js` | 140 | Perfil inferido, ajustes sugeridos y quiz. |

Total: **1.073 líneas de JS** repartidas en 18 archivos, más 390 de CSS y 386 de markup.
Antes de este refactor era **un solo archivo de 1.689 líneas**.

## Convenciones

**Estado mutable.** `export let DATA` da un binding vivo: quien importa `DATA` ve siempre el
valor actual. Pero reasignarlo solo se puede desde su propio módulo — por eso existen
`setData()` y `setCurrentUserId()`. No agregues estado mutable fuera de `state.js`.

**Módulos de solo efecto.** `onboarding.js`, `ui/theme.js` y `ui/tabs.js` no exportan nada útil:
registran sus listeners al importarse. `main.js` los importa explícitamente por eso. Si alguna
vez desaparecen esos imports, la app carga pero el tema, las pestañas y el onboarding dejan de
responder, **sin ningún error en consola**. Es la clase de bug más difícil de encontrar acá.

**Nada de handlers inline.** Cero `onclick=` en el markup: con módulos ES no funcionarían,
porque las funciones ya no son globales.

**El orden importa en `render.js`.** `markStaleAllocation()` y `markPerfAsOf()` se llaman
*después* de dibujar, porque marcan lo ya dibujado como desactualizado.

## Por qué módulos ES y no un bundler

La app no tiene dependencias más allá del cliente de Supabase por CDN. Un bundler agregaría un
paso de build que se puede romper, un `node_modules`, y una diferencia entre "lo que está en el
repo" y "lo que corre". Los módulos nativos dan lo que hacía falta — dependencias explícitas y
nada de variables globales — a costo cero.

El precio: **no se puede abrir `index.html` con doble clic**. Hay que servirlo por HTTP
(ver README). Si algún día eso molesta más de lo que ayuda, la salida es volver a scripts
clásicos, no meter un bundler.
