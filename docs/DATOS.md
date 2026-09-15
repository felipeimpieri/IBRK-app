# Datos

Todo lo que dibuja la app sale de **una sola fila** de `portfolio_snapshots`: la más reciente
del usuario logueado. `samples/data.json` es un ejemplo real de ese shape — **desactualizado
desde el 2026-08-28** (todavía muestra `positions`/`trades` crudos; ver el aviso más abajo antes
de guiarte por él).

```sql
select data from portfolio_snapshots
where user_id = auth.uid()
order by captured_at desc limit 1;
```

## ⚠ Cambio importante (2026-08-28): el snapshot ya NO trae `positions` ni `trades`

Por decisión de producto ("cada usuario su mundo", ver `docs/DECISIONES.md`), `sync-ibkr` dejó de
guardar el detalle crudo por ticker y por operación en `portfolio_snapshots.data`. Lo que antes
eran los arrays `positions` y `trades` ahora es un `positions_count` (un número) y un `real_gain`
agregado (costo total / valor total / ganancia total / ganancia %). Quien necesite el detalle real
—Posiciones, Simulador, Ideas— lo pide en el momento a la Edge Function `fetch-positions`
(autenticada con el JWT del propio usuario) y lo recibe solo en la respuesta HTTP, nunca guardado
en ninguna tabla. Del lado del front, `assets/js/positions-detail.js` lo cachea en memoria durante
esa sesión de navegación, nada más.

**Consecuencia práctica para cualquiera que lea o escriba código acá:** `DATA.positions` y
`DATA.trades` ya no vienen poblados por default al cargar el snapshot — solo existen después de
que `ensurePositionsDetail()` resuelve. Cualquier función que los use tiene que asumir que pueden
venir `undefined` (patrón ya aplicado: `(DATA.positions || [])`). El detalle completo de esta
arquitectura, incluida la razón (CORS de IBKR no admite llamarse directo desde el navegador, así
que hace falta un servidor intermedio) y un bug real que produjo esto en Resumen, está en
`HANDOFF.md` en la raíz del repo.

## Lo más importante de este documento

**No todos los campos del snapshot se actualizan, y algunos ya ni existen ahí.** La Edge Function
refresca algunos en cada sync, otros quedaron congelados en la última carga manual, y dos
(`positions`/`trades`) se sacaron a propósito y viven ahora solo del lado on-demand. El propio
snapshot declara lo congelado en `_sync_meta.note`. Mezclar todo esto es lo que produjo los peores
bugs del proyecto.

| Campo | ¿Se actualiza? | Notas |
|---|---|---|
| `summary` | ✅ cada sync | NAV, efectivo, valor de posiciones, dividendos devengados |
| `positions_count` | ✅ cada sync | Reemplaza a `positions` desde el 2026-08-28. Es solo un número. |
| `real_gain` | ✅ cada sync | `{ total_cost, total_value, total_gain, total_gain_pct }` — agregado, sin desglose por ticker. Reemplaza el cálculo que antes se hacía en el front desde `positions` crudo. |
| `allocation.asset_class` | ⚠️ se recalcula en el front | `finance.js → assetClassAllocation()`, ahora sobre `DATA.positions` **on-demand** (ver arriba) — no sobre nada que venga en el snapshot |
| `allocation.sector` | ❌ congelado | Se avisa en pantalla |
| `allocation.country` | ❌ congelado | Se avisa en pantalla |
| `performance` | ❌ **congelado** | 1D/7D/MTD/1M/YTD/1Y — ver abajo |
| `performance_series` | ❌ congelado | Último punto: 2026-07-28 |
| `positions` / `trades` | ⛔ **ya no vienen en el snapshot** | Se piden on-demand a `fetch-positions`, nunca se guardan. Ver aviso arriba. |
| `simulator` | ⛔ **ya no existe, para ningún snapshot nuevo** | Ya venía congelado (contaba posiciones vendidas); ahora directamente no hay de dónde recalcularlo del lado del servidor. La app muestra "no disponible" en vez de intentarlo — ver `HANDOFF.md`. |

### El caso de `performance` (importante)

Al 2026-08-20 la app mostraba **+11,21% a 1 año** cuando el retorno real de la cuenta era
**+14,87%**. Casi cuatro puntos de diferencia, en contra del usuario.

**No usar `DATA.performance` para ningún número nuevo destacado.** La fuente correcta es el
TWR de Portfolio Analyst de IBKR, que además neutraliza depósitos y retiros correctamente.
El plan está en el doc `cartera/motor-retorno-real.md` del proyecto.

Excepción: `performance['1D']` sí se refresca hoy, y es lo que usa `dailyChange()`. Si algún
día deja de hacerlo, el hero vuelve a mostrar mal la variación diaria sin ningún aviso.

## Shape del snapshot (desde el 2026-08-28)

```
data
├── generated_at            ISO8601, cuándo corrió la sync
├── _sync_meta              { source, note, trades_in_this_statement, data_minimization }
├── summary                 net_liquidation · cash · gross_position_value
│                           unrealized_pnl · daily_pnl · dividends_accrued · realized_pnl
├── performance             { "1D", "7D", "MTD", "1M", "YTD", "1Y" }   ← congelado
├── performance_series      { dates: [...], cps: [...] }               ← congelado
├── allocation
│   ├── asset_class         [ { name, weight } ]
│   ├── sector              [ { name, weight } ]   ← congelado
│   ├── country             [ { name, weight } ]   ← congelado
│   └── instrument          [ { name, weight } ]
├── positions_count         número. Antes era el array positions[] completo — ver aviso arriba.
└── real_gain                { total_cost, total_value, total_gain, total_gain_pct }
```

`positions`, `trades` y `simulator` **ya no son parte de este shape.** El detalle por ticker se
pide aparte, a demanda, a la Edge Function `fetch-positions` (ver `assets/js/positions-detail.js`)
y nunca se persiste. Esa respuesta (no el snapshot) tiene este shape:

```
{ positions: [ { ticker, name, qty, avg_price, price, market_value, cost_basis,
                 unrealized_pnl, unrealized_pnl_pct, daily_pnl, weight, asset_class } ],
  trades:    [ { ticker, side, qty, price, date, commission, net_amount } ],
  generated_at }
```

`samples/data.json` sigue teniendo el shape viejo completo (con `positions`/`trades`/`simulator`
crudos adentro del snapshot) — sirve para ver los *nombres de campo* de cada posición/operación,
pero ya no representa lo que trae `portfolio_snapshots.data` hoy. Pendiente: separarlo en dos
samples, uno por cada shape.

## Trampas conocidas

**`daily_pnl` no es diario.** Es el P&L acumulado desde que se abrió la posición dentro del
período del statement. Para las posiciones compradas dentro del período es *idéntico* a
`unrealized_pnl`. Por eso existe `dailyChange()`. La columna de la tabla se llama
"P&L del período", no "P&L diario", a propósito. (Esta función sigue viva sin cambios — usa
`DATA.performance`/`DATA.summary`, que sí siguen viniendo en el snapshot.)

**`realized_pnl` viene en cero** aunque haya ventas cerradas. Se recalcula en el front desde
`trades` (`computeRealized()`) — desde el 2026-08-28, `DATA.trades` viene del detalle on-demand,
no del snapshot, así que este número no está disponible hasta que `fetch-positions` resuelve.

**`NAV = posiciones + efectivo + dividendos devengados.** Sin la tercera línea las barras de
asignación suman 99,97% y no 100%. Y desde el 2026-08-28 hay una trampa nueva relacionada: la
barra de asignación por clase de activo (`assetClassAllocation()`) se dibuja una vez, de forma
síncrona, antes de que el detalle on-demand llegue — con `DATA.positions` todavía vacío. Es un bug
real, encontrado y documentado sin arreglar todavía en `HANDOFF.md` (raíz del repo).

**`simulator` ya no existe para ningún snapshot nuevo.** Antes era "no tu cartera completa,
solo cubre las posiciones con fecha de compra conocida" (al 2026-08-20: 9 de 14, sus totales en
dólares no cerraban con nada). Ahora directamente no hay de dónde recalcularlo del lado del
servidor — la app muestra "no disponible" en Simulador en vez de intentarlo. Ver `HANDOFF.md`
para por qué no se reconstruyó todavía y cuál sería el camino correcto.

## Por qué faltan fechas de compra

La API de IBKR solo devuelve operaciones dentro de la ventana configurada en la Flex Query del
cliente. Las posiciones más viejas no tienen fecha recuperable. Al 2026-08-20 son cinco:
**GOOGL, IBKR, MELI, ONON, QQQ**.

Se midió si la fecha se puede inferir desde el costo promedio usando precios históricos reales:
**no se puede**. Para GOOGL hay 4 grupos de fechas candidatas repartidos en 13 meses. Para IBKR
el resultado es directamente contradictorio, por el split 4-a-1 de junio 2025. El detalle está
en `cartera/motor-retorno-real.md`.

Lo que sí se puede afirmar sin inventar: cotas. GOOGL no antes del 2024-04-08, QQQ no antes del
2024-07-01 (nadie compra a un precio que nunca cotizó), y todas antes del 2025-07-01 (el log de
operaciones cubre desde esa fecha y no las contiene).

## Datos que no necesitan ninguna estimación

Vale repetirlo porque es contraintuitivo: **la ganancia real no necesita fecha de compra.**

```
costo    = suma de positions[].cost_basis
valor    = suma de positions[].market_value
ganancia = valor − costo
```

Esto se puede calcular de dos formas equivalentes hoy: agregado, con `DATA.real_gain` (viene
directo del snapshot, siempre disponible, sin depender de `fetch-positions`); o detallado por
ticker, con `DATA.positions` una vez que el detalle on-demand llegó (lo que arma la tabla de la
tarjeta principal del Simulador, no solo el total). La fecha de compra solo hace falta para la
pregunta aparte de "¿y si hubiera comprado SPY?" — ver más arriba por qué esa comparación ya no
tiene de dónde salir.
