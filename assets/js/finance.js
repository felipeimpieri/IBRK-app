/**
 * CALCULOS FINANCIEROS AUDITADOS - NO TOCAR SIN LEER docs/AUDITORIA.md
 * Estas cinco funciones arreglan bugs que mostraban numeros incorrectos al usuario.
 * Cualquier cambio aca necesita volver a verificar contra el snapshot real.
 */
import { DATA } from './state.js';

// El campo `daily_pnl` que manda IBKR Flex NO es la variación del día: es el P&L
// acumulado desde que se abrió la posición dentro del período del statement. Se nota
// porque para las posiciones compradas dentro de ese período (URA, RKLB, BRK.B, SYM)
// `daily_pnl` es exactamente igual a `unrealized_pnl`. Usarlo como "hoy" daba +7.0%
// en un día, mientras el bloque de performance del mismo snapshot decía +0.6%.
// La fuente correcta para la variación diaria es performance['1D'].
export function dailyChange() {
  const s = DATA.summary;
  const r = (DATA.performance && typeof DATA.performance['1D'] === 'number')
    ? DATA.performance['1D'] : null;
  if (r === null) return null;
  const prev = s.net_liquidation / (1 + r);
  return { pct: r, amount: s.net_liquidation - prev };
}

// El snapshot trae summary.realized_pnl = 0 aunque haya ventas cerradas (JNJ se vendió
// entero el 31/07). Lo recalculamos desde las operaciones: por cada ticker con ventas,
// costo prorrateado de las compras registradas contra el neto de las ventas.
// Si un ticker tiene ventas pero las compras quedan fuera de la ventana de historial
// que devuelve la API, no se puede calcular y se marca como incompleto en vez de
// inventar un número.
export function computeRealized() {
  const byTicker = {};
  (DATA.trades || []).forEach(function(t){
    const k = t.ticker;
    if (!byTicker[k]) byTicker[k] = { boughtQty:0, boughtNet:0, soldQty:0, soldNet:0 };
    const b = byTicker[k];
    if (t.qty > 0) { b.boughtQty += t.qty; b.boughtNet += t.net_amount; }
    else if (t.qty < 0) { b.soldQty += -t.qty; b.soldNet += t.net_amount; }
  });
  let total = 0, incomplete = [], closed = [];
  Object.keys(byTicker).forEach(function(k){
    const b = byTicker[k];
    if (b.soldQty <= 0) return;
    if (b.boughtQty < b.soldQty) { incomplete.push(k); return; }
    const costPerShare = b.boughtNet / b.boughtQty;
    const pnl = b.soldNet - (b.soldQty * costPerShare);
    total += pnl;
    closed.push({ ticker:k, pnl:pnl, qty:b.soldQty });
  });
  return { total: total, incomplete: incomplete, closed: closed, any: closed.length > 0 };
}

// La asignación por clase de activo venía del bloque `allocation`, que no se recalcula
// en la sincronización: mostraba "STK 100.0%" ignorando el efectivo. Se puede recalcular
// entera desde `positions` + `summary.cash`, que sí llegan frescos todos los días.
export function assetClassAllocation() {
  const s = DATA.summary;
  const nav = s.net_liquidation;
  if (!nav) return [];
  const LABELS = { STK: 'Acciones y ETFs', CASH: 'Efectivo', BOND: 'Bonos', OPT: 'Opciones', FUT: 'Futuros' };
  const byClass = {};
  (DATA.positions || []).forEach(function(p){
    const k = LABELS[p.asset_class] || p.asset_class || 'Otros';
    byClass[k] = (byClass[k] || 0) + p.market_value;
  });
  const out = Object.keys(byClass).map(function(k){ return { name: k, weight: byClass[k] / nav }; });
  if (s.cash > 0) out.push({ name: 'Efectivo', weight: s.cash / nav });
  // El NAV = posiciones + efectivo + dividendos devengados. Sin esta línea las barras
  // suman 99.97% y no 100%.
  if (s.dividends_accrued > 0) out.push({ name: 'Dividendos por cobrar', weight: s.dividends_accrued / nav });
  return out.sort(function(a, b){ return b.weight - a.weight; });
}

// Sector y país no se pueden recalcular en el front: `positions` no trae esos campos.
// Hasta que la sincronización los recalcule, se marcan como desactualizados en vez de
// mostrarse como si fueran de hoy.
export function markStaleAllocation() {
  const note = (DATA._sync_meta && DATA._sync_meta.note) ? DATA._sync_meta.note : '';
  const isStale = /allocation\.sector|allocation\.country/i.test(note);
  if (!isStale) return;
  const txt = '% del valor total — ⚠ no se recalcula en la sincronización diaria, refleja la última carga manual';
  const c = document.getElementById('country-sub');
  const sc = document.getElementById('sector-sub');
  if (c) c.textContent = txt;
  if (sc) sc.textContent = txt;
}

// La serie de rendimiento tampoco se recalcula: termina el 28/07 mientras el header
// dice "actualizado 14/08". Mostramos hasta qué día llega para que el gráfico no
// aparente ser de hoy.
export function markPerfAsOf() {
  const el = document.getElementById('perf-sub');
  const dates = DATA.performance_series && DATA.performance_series.dates;
  if (!el || !dates || !dates.length) return;
  const last = String(dates[dates.length - 1]);
  const pretty = last.length === 8
    ? last.slice(6,8) + '/' + last.slice(4,6) + '/' + last.slice(0,4)
    : last;
  const snap = DATA.generated_at ? new Date(DATA.generated_at) : null;
  const lastDate = last.length === 8
    ? new Date(+last.slice(0,4), +last.slice(4,6)-1, +last.slice(6,8))
    : null;
  const gapDays = (snap && lastDate) ? Math.round((snap - lastDate) / 86400000) : 0;
  el.textContent = 'Retorno TWR (time-weighted), ajustado por depósitos/retiros · datos hasta ' + pretty +
    (gapDays > 2 ? ' — ⚠ la serie no se recalcula en la sincronización, faltan ' + gapDays + ' días' : '');
}
