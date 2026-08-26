/**
 * Pestana Resumen: hero y tiles.
 */
import { computeRealized, dailyChange } from './../finance.js';
import { deltaClass, fmtPct, fmtUSD2 } from './../format.js';
import { DATA } from './../state.js';

export function renderHero() {
  const s = DATA.summary;
  document.getElementById('hero-value').textContent = fmtUSD2(s.net_liquidation);
  const dEl = document.getElementById('hero-delta');
  const d = dailyChange();
  if (d) {
    dEl.className = 'delta ' + deltaClass(d.amount);
    dEl.innerHTML = (d.amount >= 0 ? '▲ ' : '▼ ') + fmtUSD2(Math.abs(d.amount)) + ' (' + fmtPct(d.pct) + ') hoy' +
      '<span class="muted">Cash disponible: ' + fmtUSD2(s.cash) + '</span>';
  } else {
    dEl.className = 'delta';
    dEl.innerHTML = 'Variación del día no disponible' +
      '<span class="muted">Cash disponible: ' + fmtUSD2(s.cash) + '</span>';
  }
  document.getElementById('hero-meta').textContent = 'Cuenta IBKR — inversión de largo plazo';
  const updatedStr = new Date(DATA.generated_at).toLocaleString('es-AR', {dateStyle:'medium', timeStyle:'short'});
  document.getElementById('updated-sub').textContent = 'Actualizado ' + updatedStr;
  document.getElementById('footer-updated').textContent = updatedStr;
}

export function renderTiles() {
  const s = DATA.summary, p = DATA.performance;
  const rz = computeRealized();
  const realizedValue = rz.any ? rz.total : s.realized_pnl;
  const realizedSub = rz.any
    ? ('cerrado: ' + rz.closed.map(function(c){ return c.ticker; }).join(', ') +
       (rz.incomplete.length ? ' · ' + rz.incomplete.join(', ') + ' sin costo en la ventana' : ''))
    : 'histórico (ventas)';
  const tiles = [
    {label: 'P&L no realizado', value: fmtUSD2(s.unrealized_pnl), sub: fmtPct(s.unrealized_pnl_pct) + ' sobre costo', cls: deltaClass(s.unrealized_pnl)},
    {label: 'Retorno YTD', value: fmtPct(p.YTD), sub: 'time-weighted', cls: deltaClass(p.YTD)},
    {label: 'Retorno 1 año', value: fmtPct(p['1Y']), sub: 'time-weighted', cls: deltaClass(p['1Y'])},
    {label: 'Retorno 1 mes', value: fmtPct(p['1M']), sub: 'time-weighted', cls: deltaClass(p['1M'])},
    {label: 'Dividendos acumulados', value: fmtUSD2(s.dividends_accrued), sub: 'pendientes de cobro', cls: ''},
    {label: 'P&L realizado', value: fmtUSD2(realizedValue), sub: realizedSub, cls: deltaClass(realizedValue)},
  ];
  document.getElementById('tiles').innerHTML = tiles.map(t =>
    '<div class="tile"><div class="t-label">' + t.label + '</div>' +
    '<div class="t-value ' + t.cls + '">' + t.value + '</div>' +
    '<div class="t-sub">' + t.sub + '</div></div>'
  ).join('');
}
