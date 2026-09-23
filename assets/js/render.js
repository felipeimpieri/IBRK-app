/**
 * Orquestador: llama a cada render en orden. Punto unico para saber que se dibuja.
 */
import { assetClassAllocation, markPerfAsOf, markStaleAllocation } from './finance.js';
import { ensurePositionsDetail, getPositionsDetailError } from './positions-detail.js';
import { DATA, quizState, setPositionsDetail } from './state.js';
import { renderBarChart, renderPerfChart } from './ui/charts.js';
import { renderIdeas, renderProfileInsights } from './views/ideas.js';
import { renderPositions, renderTrades } from './views/posiciones.js';
import { renderHero, renderTiles } from './views/resumen.js';
import { renderSimulator } from './views/simulador.js';

export function renderAll() {
  renderHero();
  renderTiles();
  renderPerfChart();
  renderBarChart('chart-country', DATA.allocation.country);
  renderBarChart('chart-sector', DATA.allocation.sector);
  markStaleAllocation();
  markPerfAsOf();
  renderPositionsDependentSections();
}

// Posiciones, Operaciones, Simulador e Ideas necesitan el detalle por-ticker
// (ticker/cantidad/precio), que desde el cambio de minimizacion de datos ya
// no viaja en el snapshot que devuelve Supabase -- ver positions-detail.js.
// Se pide una vez aca (con estado de carga mientras tanto) y se renderizan
// las cuatro secciones juntas cuando llega, para no disparar cuatro pedidos
// en paralelo contra IBKR.
//
// El grafico de asignacion por clase de activo tambien depende de este
// detalle (assetClassAllocation() lee DATA.positions) asi que se dibuja aca
// adentro, no en renderAll(): dibujarlo antes de tener el detalle mostraba
// solo Efectivo y Dividendos por cobrar, con porcentajes que no sumaban 100%.
function renderPositionsDependentSections() {
  if (DATA.positions) {
    renderBarChart('chart-asset-class', assetClassAllocation());
    renderPositions();
    renderTrades();
    renderSimulator();
    renderProfileInsights();
    renderIdeas(quizState);
    return;
  }

  showPositionsLoading();

  ensurePositionsDetail()
    .then(function (detail) {
      setPositionsDetail(detail);
      renderPositionsDependentSections();
    })
    .catch(function () {
      showPositionsError(getPositionsDetailError());
    });
}

function showPositionsLoading() {
  setText('positions-sub', 'Cargando el detalle de tus posiciones…');
  clearTableBody('positions-table');
  clearTableBody('trades-table');
  clearTableBody('sim-real-table');
  setHTML('sim-real-tiles', '');
  setText('sim-real-foot', '');
  setHTML('profile-insights', '<div class="insight-item">Cargando…</div>');
  setHTML('adjustment-insights', '');
  setText('ideas-note', '');
  setHTML('idea-grid', '');
}

function showPositionsError(message) {
  const text = 'No se pudo cargar el detalle de posiciones' + (message ? ': ' + message : '.') +
    ' Probá recargar la página.';
  setText('positions-sub', text);
  setText('sim-real-foot', text);
}

function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function setHTML(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
function clearTableBody(tableId) {
  const el = document.querySelector('#' + tableId + ' tbody');
  if (el) el.innerHTML = '';
}
