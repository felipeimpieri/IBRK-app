# Datos

Todo lo que dibuja la app sale de **una sola fila** de `portfolio_snapshots`: la más reciente
del usuario logueado. `samples/data.json` es un ejemplo real de ese shape.

```sql
select data from portfolio_snapshots
where user_id = auth.uid()
order by captured_at desc limit 1;
```

## Lo más importante de este documento

**No todos los campos del snapshot se actualizan.** La Edge Function refresca algunos en cada
sync y otros quedaron congelados en la última carga manual. El propio snapshot lo declara en
`_sync_meta.note`. Mezclarlos es lo que produjo los peores bugs del proyecto.

| Campo | ¿Se actualiza? | Notas |
|---|---|---|
| `summary` | ✅ cada sync | NAV, efectivo, valor de posiciones, dividendos devengados |
| `positions` | ✅ cada sync | **La fuente confiable.** Ticker, cantidad, costo, valor de mercado, P&L |
| `trades` | ✅ cada sync | Solo dentro de la ventana de la Flex Query (~12 meses) |
| `allocation.asset_class` | ⚠️ se recalcula en el front | `finance.js → assetClassAllocation()` |
| `allocation.sector` | ❌ congelado | Se avisa en pantalla |
| `allocation.country` | ❌ congelado | Se avisa en pantalla |
| `performance` | ❌ **congelado** | 1D/7D/MTD/1M/YTD/1Y — ver abajo |
| `performance_series` | ❌ congelado | Último punto: 2026-07-28 |
| `simulator` | ❌ congelado | Sigue contando posiciones ya vendidas |

### El caso de `performance` (importante)

Al 2026-08-20 la app mostraba **+11,21% a 1 año** cuando el retorno real de la cuenta era
**+14,87%**. Casi cuatro puntos de diferencia, en contra del usuario.

**No usar `DATA.performance` para ningún número nuevo destacado.** La fuente correcta es el
TWR de Portfolio Analyst de IBKR, que además neutraliza depósitos y retiros correctamente.
El plan está en el doc `cartera/motor-retorno-real.md` del proyecto.

Excepción: `performance['1D']` sí se refresca hoy, y es lo que usa `dailyChange()`. Si algún
día deja de hacerlo, el hero vuelve a mostrar mal la variación diaria sin ningún aviso.

## Shape del snapshot

```
data
├── generated_at            ISO8601, cuándo corrió la sync
├── _sync_meta              { source, note, trades_in_this_statement }
├── summary                 net_liquidation · cash · gross_position_value
│                           unrealized_pnl · daily_pnl · dividends_accrued · realized_pnl
├── performance             { "1D", "7D", "MTD", "1M", "YTD", "1Y" }   ← congelado
├── performance_series      { dates: [...], cps: [...] }               ← congelado
├── allocation
│   ├── asset_class         [ { name, weight } ]
│   ├── sector              [ { name, weight } ]   ← congelado
│   ├── country             [ { name, weight } ]   ← congelado
│   └── instrument          [ { name, weight } ]
├── positions               [ { ticker, name, qty, avg_price, price, market_value,
│                              cost_basis, unrealized_pnl, unrealized_pnl_pct,
│                              daily_pnl, weight, asset_class } ]
├── trades                  [ { ticker, side, qty, price, date, commission, net_amount } ]
└── simulator                                                          ← congelado
    ├── rows                [ { ticker, invested, real_value, spy_value,
    │                           qqq_value, btc_value, dates: [...] } ]
    ├── totals              mismos campos, sumados
    ├── covered_tickers     los que tienen fecha de compra conocida
    ├── excluded_tickers    los que no la tienen
    └── date_range          [ primera, última ]
```

## Trampas conocidas

**`daily_pnl` no es diario.** Es el P&L acumulado desde que se abrió la posición dentro del
período del statement. Para las posiciones compradas dentro del período es *idéntico* a
`unrealized_pnl`. Por eso existe `dailyChange()`. La columna de la tabla se llama
"P&L del período", no "P&L diario", a propósito.

**`realized_pnl` viene en cero** aunque haya ventas cerradas. Se recalcula en el front desde
`trades` (`computeRealized()`).

**`NAV = posiciones + efectivo + dividendos devengados.** Sin la tercera línea las barras de
asignación suman 99,97% y no 100%.

**`simulator` no es tu cartera.** Solo cubre las posiciones con fecha de compra conocida.
Al 2026-08-20: 9 de 14. Sus totales en dólares no cierran con nada y por eso están en la
tarjeta secundaria, no en la principal.

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

Al 2026-08-20: $18.710,36 → $22.908,27 = **+$4.197,92 (+22,4%)**, que coincide al centavo con la
suma de `unrealized_pnl` que reporta IBKR. Eso es lo que muestra la tarjeta principal del
Simulador. La fecha solo hace falta para responder "¿y si hubiera comprado SPY?".
