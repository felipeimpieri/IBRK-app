/**
 * Orquestador: llama a cada render en orden. Punto unico para saber que se dibuja.
 */
import { assetClassAllocation, markPerfAsOf, markStaleAllocation } from './finance.js';
import { DATA, quizState } from './state.js';
import { renderBarChart, renderPerfChart } from './ui/charts.js';
import { renderIdeas, renderProfileInsights } from './views/ideas.js';
import { renderPositions, renderTrades } from './views/posiciones.js';
import { renderHero, renderTiles } from './views/resumen.js';
import { renderSimulator } from './views/simulador.js';

export function renderAll() {
  renderHero();
  renderTiles();
  renderPerfChart();
  renderBarChart('chart-asset-class', assetClassAllocation());
  renderBarChart('chart-country', DATA.allocation.country);
  renderBarChart('chart-sector', DATA.allocation.sector);
  markStaleAllocation();
  markPerfAsOf();
  renderPositions();
  renderTrades();
  renderSimulator();
  renderProfileInsights();
  renderIdeas(quizState);
}
