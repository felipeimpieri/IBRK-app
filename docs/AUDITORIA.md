# Auditoría de datos

Revisión de la app en producción contra el snapshot real de Supabase, campo por campo, con
verificación aritmética independiente de cada número. Empezó el 2026-08-15.

**Siete problemas encontrados. Cuatro mostraban números incorrectos al usuario.**

---

## ⚠ Las cinco funciones protegidas

Viven en `assets/js/finance.js`. Cada una arregla un bug que le mostraba un número incorrecto
al usuario. **No las toques sin releer este documento y volver a verificar contra el snapshot.**

| Función | Arregla |
|---|---|
| `dailyChange()` | Que el hero mostrara +7,0% cuando el día real era +0,6% |
| `computeRealized()` | Que el P&L realizado diera $0 con ventas cerradas |
| `assetClassAllocation()` | Que la asignación ignorara el efectivo y diera "STK 100%" |
| `markStaleAllocation()` | Avisar que sector y país están congelados |
| `markPerfAsOf()` | Avisar hasta qué fecha llega la serie de rendimiento |

Salieron **byte por byte idénticas** del refactor a módulos del 2026-08-21 (verificado por
hash). Mantengamos esa propiedad en cada movimiento futuro.

---

## 1. `daily_pnl` no es diario — GRAVE · arreglado

El hero mostraba **+$1.722,41 (+7,0%) hoy**. La variación real era **+0,60%**.

`daily_pnl` del Flex no es la variación del día: es el P&L acumulado desde que se abrió la
posición dentro del período del statement. La prueba: para las posiciones compradas dentro del
período es *exactamente igual* a `unrealized_pnl`.

| Ticker | daily_pnl | unrealized_pnl | % diario implícito |
|---|---:|---:|---:|
| URA | −142,30 | −142,30 | −17,5% |
| RKLB | +57,92 | +57,92 | +11,5% |
| SPY | +986,67 | +1.619,88 | **+12,7%** |
| IBKR | +79,63 | +94,04 | **+29,8%** |

SPY no se mueve 12,7% en un día. Además la app se contradecía en la misma pantalla: el chip de
rango decía `1D +0.6%` mientras el hero decía +7,0%.

**Arreglo:** `dailyChange()` deriva el monto del NAV y el retorno 1D real:
`prev = NAV/(1+r)`, `monto = NAV − prev`. Da $147,40 (+0,60%), coincide con el chip.

**Colateral:** la columna de la tabla se renombró a "P&L del período". El dato no estaba mal,
el nombre sí.

## 2. `realized_pnl` en cero con ventas cerradas — GRAVE · arreglado

Mostraba $0,00 aunque JNJ se había vendido entero el 31/07.

```
2026-03-10  compra 4 @ 243,965  →  −976,86
2026-07-31  venta  3 @ 257,605  →  +772,80
2026-07-31  venta  1 @ 257,60   →  +256,59
                        realizado = +52,53
```

**Arreglo:** `computeRealized()` recalcula desde `trades`, prorrateando el costo de las compras
registradas. Si un ticker tiene ventas pero sus compras quedaron fuera de la ventana de la API,
**lo marca como incompleto en vez de inventar un número**. Ese patrón es la regla de la casa.

## 3. La asignación ignoraba el efectivo — arreglado

Mostraba "STK 100,0%" con 5,80% de la cartera en efectivo.

**Arreglo:** `assetClassAllocation()` recalcula desde `positions` + `summary.cash`.
Ojo con la tercera línea: `NAV = posiciones + efectivo + dividendos devengados`. Sin ella las
barras suman 99,97%.

## 4. Serie de rendimiento congelada — mitigado

El gráfico terminaba el 28 de julio mientras el header decía "Actualizado 14 ago". Nada lo
indicaba. `markPerfAsOf()` ahora dice hasta qué fecha llegan los datos y cuántos días faltan.

**Falta de fondo:** que la sync recalcule `performance_series`.

## 5. Sector y país congelados — mitigado

El sector listaba `Cash 1,73%` cuando el efectivo real era 5,80% — dos números del mismo
snapshot que no cerraban entre sí. No se pueden recalcular en el front: `positions` no trae
sector ni país. `markStaleAllocation()` avisa leyendo el flag de `_sync_meta.note`.

## 6. Simulador desactualizado — rediseñado

Contaba JNJ como si estuviera en cartera, y `Invertido $9.515,98 / Resultado real $9.534,32`
parecían ser toda la cartera cuando eran solo un subconjunto.

**Primer intento (falló como solución de producto).** Se agregó un aviso ⚠, el label "cobertura
parcial" y una línea de reconciliación. El usuario volvió a decir *"sigue apareciendo como
antes"* — porque las correcciones estaban en letra chica gris y **los números confusos seguían
siendo los más grandes de la pantalla**.

> **La lección, que vale para todo el proyecto:** anotar un número engañoso no lo arregla.
> Mientras siga siendo el protagonista visual, la pantalla sigue mintiendo por diseño.
> Si un número está mal encuadrado, se cambia la jerarquía — no se le agrega una nota al pie.

**Rediseño (el que quedó):**
- Tarjeta principal nueva, **"Tu ganancia real"**: lo que costó cada posición contra lo que vale
  hoy, más el total. Sale solo de `positions`. Exacto, sin estimar, sin fecha de compra.
- La comparación contra benchmarks bajó a tarjeta secundaria, con su alcance escrito
  ("comparación posible sobre 9 de tus 14 posiciones") y un punto de ayuda con el detalle.
- Cada tile lleva **monto y porcentaje juntos**: un % suelto no dice nada si no se ve sobre
  cuánta plata se calculó.

**Falta de fondo:** que la Edge Function recalcule `simulator` en cada sync.

## 7. El bloque `performance` congelado — detectado, SIN ARREGLAR

Mismo origen que el #4, pero no se había medido el impacto:

| Período | Lo que muestra la app | Real (TWR de IBKR) | Error |
|---|---:|---:|---:|
| 1 año | +11,21% | **+14,87%** | −3,66 pp |
| YTD | +1,06% | **+4,82%** | −3,76 pp |

Casi cuatro puntos menos que el rendimiento real. **Es el único bug abierto que muestra un
número equivocado hoy.**

La fuente correcta ya existe: Portfolio Analyst de IBKR devuelve TWR, que además neutraliza
depósitos y retiros. Mientras tanto: **no usar `DATA.performance` para ningún número nuevo.**

---

## Estado

| # | Problema | Estado |
|---|---|---|
| 1 | `daily_pnl` no es diario | ✅ arreglado (`68f0b0e`) |
| 2 | `realized_pnl` en cero | ✅ arreglado (`68f0b0e`) |
| 3 | Asignación sin efectivo | ✅ arreglado (`68f0b0e`) |
| 4 | `performance_series` congelada | ⚠️ mitigado · falta Edge Function |
| 5 | Sector/país congelados | ⚠️ mitigado · falta Edge Function |
| 6 | Simulador desactualizado | ✅ rediseñado (`83f69cb`) · falta Edge Function |
| 7 | `performance` congelado | ❌ **sin arreglar** |

## Pendientes de fondo (todos requieren Edge Function)

1. Recalcular `performance_series` **y `performance`** — o mejor, tomarlos de Portfolio Analyst.
2. Recalcular `allocation.sector` / `allocation.country`.
3. Recalcular `simulator`.
4. Calcular `realized_pnl` en el backend en vez de derivarlo en el front.
5. Ampliar la ventana de operaciones: `get_account_trades` acepta cinco períodos
   (`YEAR_TO_DATE`, `LAST_QUARTER`, `TWO/THREE/FOUR_QUARTERS_AGO`) y la app hoy pide solo el
   primero. Unidos cubren desde 2025-07-01 sin huecos. Son cuatro llamadas más y cero números
   inventados — es lo más barato de la lista.

## Protocolo de verificación

Después de cada cambio en el front:

1. `diff` contra la versión anterior y grep de las cinco funciones protegidas → cero toques.
2. `python3 tests/smoke_test.py` → los 16 asserts en verde.
3. Después del push, **ETag de producción contra md5 local**. Es lo único que prueba que lo que
   está online es lo que revisaste.

Un preview de Vercel **no** sirve como canal de revisión: el usuario abre siempre su URL de
producción. Ya pasó dos veces que un arreglo parecía no funcionar y en realidad no había llegado.
