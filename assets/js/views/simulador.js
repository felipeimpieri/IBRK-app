/**
 * Pestana Simulador: ganancia real (exacta) y comparacion contra benchmarks (parcial).
 */
import { cssVar, deltaClass, fmtPct, fmtUSD, fmtUSD2 } from './../format.js';
import { DATA } from './../state.js';

// ===== Simulador =====
export function simDeltaSpan(value, base) {
  const d = base ? (value - base) / base : 0;
  return fmtUSD2(value) + ' <span class="sim-delta ' + deltaClass(d) + '">(' + fmtPct(d, 0) + ')</span>';
}

// El bloque `simulator` no se recalcula en cada sync (ver auditoría 15/08): puede seguir
// contando posiciones ya vendidas como si siguieran en cartera. En vez de confiar en un
// flag fijo (que se puede desactualizar solo), lo detectamos comparando en vivo contra
// `positions` actuales — así el aviso es preciso incluso si cambia qué se vendió.
export function staleSimulatorTickers() {
  const sim = DATA.simulator;
  if (!sim) return [];
  const held = {};
  (DATA.positions || []).forEach(function(p){ held[p.ticker] = true; });
  return (sim.rows || []).map(function(r){ return r.ticker; }).filter(function(tk){ return !held[tk]; });
}

export function renderSimulator() {
  renderGananciaReal();
  renderBenchmarks();
}

/** Bloque principal: lo que pagaste contra lo que vale hoy. Exacto, sin estimar. */
function renderGananciaReal() {
  const allPos = (DATA.positions || []).slice();
  // ---------------------------------------------------------------
  // BLOQUE PRINCIPAL — ganancia real. Sale solo de `positions`, que se
  // refresca todos los días. No usa `simulator` (congelado) ni `performance`
  // (también congelado, ver _sync_meta). Es la cuenta simple: costó vs vale
  // hoy. No requiere fecha de compra, así que no hay ningún número estimado.
  // ---------------------------------------------------------------
  const costOf = function(p) { return p.cost_basis || 0; };
  const valOf  = function(p) { return p.market_value || 0; };
  const totalCost = allPos.reduce(function(a, p) { return a + costOf(p); }, 0);
  const totalVal  = allPos.reduce(function(a, p) { return a + valOf(p); }, 0);
  const totalGain = totalVal - totalCost;

  const realTiles = [
    {label: 'Costó', value: fmtUSD2(totalCost), sub: allPos.length + ' posiciones', cls: ''},
    {label: 'Vale hoy', value: fmtUSD2(totalVal), sub: 'valor de mercado', cls: ''},
    {label: 'Ganancia', value: fmtUSD2(totalGain), sub: totalCost ? fmtPct(totalGain / totalCost) : '', cls: deltaClass(totalGain)},
  ];
  const rtEl = document.getElementById('sim-real-tiles');
  if (rtEl) {
    rtEl.innerHTML = realTiles.map(function(x) {
      return '<div class="tile"><div class="t-label">' + x.label + '</div>' +
        '<div class="t-value ' + x.cls + '">' + x.value + '</div>' +
        '<div class="t-sub">' + x.sub + '</div></div>';
    }).join('');
  }

  const rtb = document.querySelector('#sim-real-table tbody');
  if (rtb) {
    const ordered = allPos.slice().sort(function(a, b) {
      return (valOf(b) - costOf(b)) - (valOf(a) - costOf(a));
    });
    rtb.innerHTML = ordered.map(function(p) {
      const c = costOf(p), v = valOf(p), g = v - c;
      return '<tr>' +
        '<td><span class="ticker-pill">' + p.ticker + '</span></td>' +
        '<td>' + fmtUSD2(c) + '</td>' +
        '<td>' + fmtUSD2(v) + '</td>' +
        '<td class="' + deltaClass(g) + '">' + fmtUSD2(g) + '</td>' +
        '<td class="' + deltaClass(g) + '">' + (c ? fmtPct(g / c) : '—') + '</td>' +
        '</tr>';
    }).join('');
  }

  const rfEl = document.getElementById('sim-real-foot');
  if (rfEl) {
    rfEl.innerHTML = 'Es la cuenta simple, posición por posición: lo que pagaste contra lo que vale hoy. ' +
      'Coincide con el resultado no realizado que reporta IBKR. ' +
      'Ojo: esto es la plusvalía de lo que tenés hoy — no es el rendimiento de la cuenta, ' +
      'que además depende de cuándo pusiste la plata y de los dividendos cobrados.';
  }

}

/** Bloque secundario: comparacion contra indices. Solo cubre las posiciones
 *  con fecha de compra conocida, por eso va debajo y con su alcance escrito. */
function renderBenchmarks() {
  const sim = DATA.simulator;

  // El bloque `simulator` (comparacion contra SPY/QQQ/Bitcoin) se armaba antes
  // con un script manual (compute_data.py) y nunca lo recalculaba la sync
  // automatica -- ya estaba marcado como pendiente de fondo (ver
  // cartera/motor-retorno-real.md). Con el cambio de minimizacion de datos
  // (agosto 2026) el snapshot que guarda el server dejo de incluirlo del
  // todo, asi que este bloque ya no tiene ninguna fuente de datos y no va a
  // llegar por ningun camino -- mostramos un estado honesto en vez de
  // intentar leer un campo que no existe.
  if (!sim || !sim.totals) {
    const scEl = document.getElementById('sim-scope');
    if (scEl) scEl.textContent = 'Comparación no disponible por ahora.';
    const popEl = document.getElementById('sim-pop');
    if (popEl) {
      popEl.innerHTML = 'Este bloque comparaba tu cartera contra SPY, QQQ y Bitcoin. Con el cambio para que el servidor ' +
        'no guarde el detalle de tus posiciones, esta comparación específica quedó pendiente de rehacerse de otra forma ' +
        '(el resto de la app no depende de esto — "Tu ganancia real", arriba, sigue siendo exacta).';
    }
    const tilesEl = document.getElementById('sim-tiles');
    if (tilesEl) tilesEl.innerHTML = '';
    const barEl = document.getElementById('sim-barchart');
    if (barEl) barEl.innerHTML = '';
    const exEl = document.getElementById('sim-excluded');
    if (exEl) exEl.textContent = '';
    const tbody = document.querySelector('#sim-table tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No disponible por ahora.</td></tr>';
    return;
  }

  const t = sim.totals;
  const soldButCounted = staleSimulatorTickers();
  const allPos = (DATA.positions || []).slice();
  // ---------------------------------------------------------------
  // BLOQUE SECUNDARIO — comparación contra benchmarks. Degradado a propósito:
  // solo cubre las posiciones con fecha de compra conocida, así que sus totales
  // en dólares no son la cartera. Se muestra en porcentaje sobre lo invertido
  // en ESE subconjunto, que sí es comparable entre sí.
  // ---------------------------------------------------------------
  const held = {};
  allPos.forEach(function(p) { held[p.ticker] = true; });
  const coveredHeld = (sim.rows || []).filter(function(r) { return held[r.ticker]; }).length;

  const scEl = document.getElementById('sim-scope');
  if (scEl) {
    scEl.textContent = 'Mismo monto, mismo día, puesto en SPY / QQQ / Bitcoin en vez de lo que compraste. ' +
      'Comparación posible sobre ' + coveredHeld + ' de tus ' + allPos.length + ' posiciones — ' +
      'las demás no tienen fecha de compra disponible.';
  }

  const popEl = document.getElementById('sim-pop');
  if (popEl) {
    const bits = [];
    bits.push('Para comparar contra un índice hace falta saber <b>cuándo</b> compraste, no solo a qué precio: ' +
      'el mismo monto puesto en SPY en 2024 o en 2025 da resultados muy distintos.');
    if (sim.excluded_tickers.length) {
      bits.push('Sin fecha de compra disponible vía la API de IBKR: <b>' + sim.excluded_tickers.join(', ') + '</b>. ' +
        'Quedan afuera de esta comparación (pero sí están en tu ganancia real, arriba).');
    }
    if (soldButCounted.length) {
      bits.push('Además este bloque no se recalcula en cada sync y todavía cuenta <b>' + soldButCounted.join(', ') + '</b>, que ya vendiste.');
    }
    bits.push('No incluye dividendos reinvertidos de los benchmarks, ni comisiones, ni impuestos. ' +
      'Los porcentajes son sobre lo invertido en las posiciones cubiertas, no sobre tu cartera.');
    popEl.innerHTML = bits.join('<br><br>');
  }

  if (!renderSimulator._dotWired) {
    const dot = document.getElementById('sim-dot');
    if (dot) {
      const toggle = function() {
        const pop = document.getElementById('sim-pop');
        if (pop) pop.hidden = !pop.hidden;
      };
      dot.addEventListener('click', toggle);
      dot.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
      renderSimulator._dotWired = true;
    }
  }

  // Monto Y porcentaje juntos: un % suelto no dice nada si no se ve sobre cuánta plata
  // se calculó. El riesgo de confundir estos dólares con la cartera ya está cubierto por
  // la tarjeta "Tu ganancia real" de arriba y por el alcance explícito en el subtítulo.
  const base = t.invested;
  const rel = function(v) { return base ? (v - base) / base : 0; };
  const tiles = [
    {label: 'Invertido en las cubiertas', value: fmtUSD2(base),
     sub: sim.date_range[0] + ' — ' + sim.date_range[1], cls: ''},
    {label: 'Tu resultado', value: fmtUSD2(t.real_value),
     sub: fmtPct(rel(t.real_value)), cls: deltaClass(t.real_value - base)},
    {label: 'Si hubiera sido SPY', value: fmtUSD2(t.spy_value),
     sub: fmtPct(rel(t.spy_value)), cls: deltaClass(t.spy_value - base)},
    {label: 'Si hubiera sido QQQ', value: fmtUSD2(t.qqq_value),
     sub: fmtPct(rel(t.qqq_value)), cls: deltaClass(t.qqq_value - base)},
    {label: 'Si hubiera sido Bitcoin', value: fmtUSD2(t.btc_value),
     sub: fmtPct(rel(t.btc_value)), cls: deltaClass(t.btc_value - base)},
  ];
  document.getElementById('sim-tiles').innerHTML = tiles.map(function(x) {
    return '<div class="tile"><div class="t-label">' + x.label + '</div>' +
      '<div class="t-value ' + x.cls + '">' + x.value + '</div>' +
      '<div class="t-sub">' + x.sub + '</div></div>';
  }).join('');

  const barItems = [
    {name: 'Invertido', value: base, color: cssVar('--text-muted')},
    {name: 'Tu resultado', value: t.real_value, color: cssVar('--s1')},
    {name: 'Si SPY', value: t.spy_value, color: cssVar('--s2')},
    {name: 'Si QQQ', value: t.qqq_value, color: cssVar('--s3')},
    {name: 'Si Bitcoin', value: t.btc_value, color: cssVar('--s4')},
  ];
  const maxVal = Math.max.apply(null, barItems.map(function(b) { return b.value; }));
  document.getElementById('sim-barchart').innerHTML = barItems.map(function(item) {
    const w = (item.value / maxVal) * 100;
    const isBase = item.name === 'Invertido';
    return '<div class="row">' +
      '<div class="name">' + item.name + '</div>' +
      '<div class="bar-bg"><div class="bar-fill" style="width:' + Math.max(w, 1.2) + '%;background:' + item.color + ';"></div></div>' +
      '<div class="pct">' + fmtUSD(item.value) +
        (isBase ? '' : ' <span class="' + deltaClass(item.value - base) + '">' + fmtPct(rel(item.value)) + '</span>') +
      '</div>' +
      '</div>';
  }).join('');

  const tbody = document.querySelector('#sim-table tbody');
  tbody.innerHTML = sim.rows.map(function(r) {
    return '<tr>' +
      '<td><span class="ticker-pill">' + r.ticker + '</span></td>' +
      '<td>' + fmtUSD2(r.invested) + '</td>' +
      '<td>' + fmtUSD2(r.real_value) + '</td>' +
      '<td>' + simDeltaSpan(r.spy_value, r.real_value) + '</td>' +
      '<td>' + simDeltaSpan(r.qqq_value, r.real_value) + '</td>' +
      '<td>' + simDeltaSpan(r.btc_value, r.real_value) + '</td>' +
      '</tr>';
  }).join('');

  document.getElementById('sim-excluded').textContent = sim.excluded_tickers.length ?
    'No incluye ' + sim.excluded_tickers.join(', ') + ' — sin fecha de compra disponible vía la API de IBKR (posiciones más antiguas que la ventana de historial de operaciones).' : '';
}
