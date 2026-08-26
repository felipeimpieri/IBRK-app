/**
 * Pestana Posiciones: tabla de tenencias y de operaciones.
 */
import { deltaClass, fmtNum, fmtPct, fmtUSD2 } from './../format.js';
import { DATA } from './../state.js';

export function renderPositions() {
  const rows = DATA.positions;
  document.getElementById('positions-sub').textContent = rows.length + ' posiciones abiertas';
  const tbody = document.querySelector('#positions-table tbody');
  tbody.innerHTML = rows.map(p =>
    '<tr>' +
    '<td><span class="ticker-pill">'+p.ticker+'</span><span class="name-sub">'+p.name+'</span></td>' +
    '<td>'+fmtNum(p.qty)+'</td>' +
    '<td>'+fmtUSD2(p.avg_price)+'</td>' +
    '<td>'+fmtUSD2(p.price)+'</td>' +
    '<td>'+fmtUSD2(p.market_value)+'</td>' +
    '<td class="'+deltaClass(p.unrealized_pnl)+'">'+fmtUSD2(p.unrealized_pnl)+' <span style="color:inherit">('+fmtPct(p.unrealized_pnl_pct)+')</span></td>' +
    '<td class="'+deltaClass(p.daily_pnl)+'">'+fmtUSD2(p.daily_pnl)+'</td>' +
    '<td>'+(p.weight*100).toFixed(1)+'%</td>' +
    '</tr>'
  ).join('');
}

export function renderTrades() {
  const rows = DATA.trades;
  const tbody = document.querySelector('#trades-table tbody');
  tbody.innerHTML = rows.map(t =>
    '<tr>' +
    '<td>'+t.date+'</td>' +
    '<td>'+t.side+'</td>' +
    '<td><span class="ticker-pill">'+t.ticker+'</span></td>' +
    '<td>'+fmtNum(t.qty)+'</td>' +
    '<td>'+fmtUSD2(t.price)+'</td>' +
    '<td>'+fmtUSD2(t.commission)+'</td>' +
    '<td>'+fmtUSD2(t.net_amount)+'</td>' +
    '</tr>'
  ).join('');
}
