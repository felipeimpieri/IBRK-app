/**
 * Pestana Ideas: perfil inferido, ajustes sugeridos y quiz.
 */
import { fmtPct, fmtShare } from './../format.js';
import { saveProfileAnswers } from './../profile.js';
import { DATA, quizState } from './../state.js';

// ===== Recomendaciones: ideas por temática =====
export const THEME_IDEAS = {
  tech: {tag: 'Tecnología', title: 'Diversificar dentro de tech', desc: 'Ya tenés SPY, QQQ, GOOGL y MSFT — todos con peso grande en tech de EE.UU. Para sumar algo distinto en vez de duplicar, se suele mirar ETFs sectoriales más angostos (semis, software, ciberseguridad) en lugar de más large-caps que QQQ ya cubre.'},
  dividends: {tag: 'Dividendos / income', title: 'Ampliar el bloque de dividendos', desc: 'Ya tenés KO, PG, JNJ y O — un núcleo clásico de dividend aristocrats. Para profundizar sin duplicar, se suele mirar ETFs de dividend growth o REITs de otros sectores además de real estate.'},
  crypto: {tag: 'Cripto', title: 'Exposición cripto', desc: 'Hoy tenés 0% de exposición cripto directa. Es el activo más volátil de los que podrías sumar — conviene definir primero qué tamaño de posición estás dispuesto a arriesgar, antes que el activo puntual.'},
  smallcaps: {tag: 'Small caps', title: 'Small / mid caps', desc: 'RKLB y SYM ya son tu sleeve de small-caps de alto riesgo, y ambas están en pérdida hoy. Antes de sumar más, conviene revisar si el tamaño combinado de esa porción sigue siendo el que buscás.'},
  intl: {tag: 'Internacional', title: 'Diversificación geográfica', desc: '91% de tu cartera está en EE.UU.; MELI suma algo de exposición a Latam. Un ETF ex-US amplio (mercados desarrollados o emergentes) es la forma más simple de bajar esa concentración geográfica.'},
  value: {tag: 'Value', title: 'Sesgo value', desc: 'Tu cartera hoy está más orientada a growth / large-cap (SPY, QQQ, MSFT, GOOGL). Un screener o ETF de value te da el otro lado del estilo de inversión, como contrapeso.'},
  esg: {tag: 'Sustentabilidad / ESG', title: 'Screening ESG', desc: 'Si te interesa el filtro ESG, conviene aplicarlo primero sobre lo que ya tenés — varios de tus ETFs amplios (SPY/QQQ) tienen versiones ESG equivalentes.'},
  bonds: {tag: 'Renta fija', title: 'Sumar renta fija', desc: 'Hoy tenés 0% en bonos. Un ETF de bonos agregados o T-Bills de corto plazo es la forma más simple de bajarle volatilidad general a la cartera.'},
};

export const DEFAULT_GAP_THEMES = ['bonds', 'intl'];

// ===== Recomendaciones: perfil inferido =====
export function computeProfileInsights() {
  const alloc = DATA.allocation, pos = DATA.positions;
  const insights = [];

  const sectors = alloc.sector.filter(s => s.name !== 'Cash').slice().sort((a, b) => b.weight - a.weight);
  if (sectors.length) {
    insights.push('Tu sector con mayor peso es <b>' + sectors[0].name + '</b>, con ' + fmtShare(sectors[0].weight, 1) + ' de la cartera.');
  }

  const topCountry = alloc.country.slice().sort((a, b) => b.weight - a.weight)[0];
  if (topCountry) {
    insights.push('<b>' + fmtShare(topCountry.weight, 1) + '</b> de tu cartera está en ' + topCountry.name +
      (topCountry.weight > 0.85 ? ' — concentración geográfica alta.' : '.'));
  }

  const hasBonds = alloc.asset_class.some(a => /bond|renta fija/i.test(a.name));
  insights.push(hasBonds ? 'Tenés exposición a renta fija dentro de la cartera.' :
    'No tenés exposición a renta fija / bonos — toda la cartera está en acciones, ETFs y cash.');

  const etf = alloc.instrument.find(i => i.name === 'ETFs');
  if (etf) insights.push(fmtShare(etf.weight, 1) + ' de la cartera está en ETFs (diversificación instantánea) y el resto en acciones individuales.');

  const losers = pos.filter(p => p.unrealized_pnl_pct < -0.1).sort((a, b) => a.unrealized_pnl_pct - b.unrealized_pnl_pct);
  if (losers.length) {
    insights.push('Las posiciones con mayor pérdida no realizada hoy son ' +
      losers.slice(0, 3).map(p => p.ticker + ' (' + fmtPct(p.unrealized_pnl_pct, 1) + ')').join(', ') + '.');
  }
  return insights;
}

export function computeAdjustmentInsights() {
  const pos = DATA.positions, alloc = DATA.allocation;
  const byTicker = {};
  pos.forEach(p => byTicker[p.ticker] = p.weight);
  const insights = [];

  const spyW = byTicker['SPY'] || 0, qqqW = byTicker['QQQ'] || 0;
  if (spyW && qqqW) {
    insights.push('<b>SPY + QQQ</b> suman ' + fmtShare(spyW + qqqW, 1) + ' de la cartera. Los dos ETFs tienen alta correlación entre sí (QQQ es básicamente el sector tech de large-caps que SPY ya incluye) — es exposición solapada, no diversificación adicional.');
  }

  const topPos = pos.slice().sort((a, b) => b.weight - a.weight)[0];
  if (topPos && topPos.weight > 0.15 && topPos.ticker !== 'SPY' && topPos.ticker !== 'QQQ') {
    insights.push('<b>' + topPos.ticker + '</b> es tu posición individual más grande (' + fmtShare(topPos.weight, 1) + '). Vale la pena confirmar que ese tamaño de posición sea intencional.');
  }

  const techSector = alloc.sector.find(s => s.name === 'Technology');
  if (techSector && techSector.weight > 0.1) {
    insights.push('Sumando el sector <b>Technology</b> directo (' + fmtShare(techSector.weight, 1) + ') más la parte tech dentro de SPY/QQQ, tu exposición real a tecnología es mayor a lo que muestra el desglose por sector.');
  }

  const specTickers = ['RKLB', 'SYM', 'URA', 'ONON'].filter(t => byTicker[t]);
  const specWeight = specTickers.reduce((a, t) => a + byTicker[t], 0);
  if (specWeight > 0) {
    insights.push('Tenés ' + fmtShare(specWeight, 1) + ' en posiciones más especulativas / de alta volatilidad (' + specTickers.join(', ') + '), varias con pérdida no realizada hoy — es la parte de la cartera para revisar primero si buscás bajar riesgo.');
  }

  const hasBonds = alloc.asset_class.some(a => /bond|renta fija/i.test(a.name));
  if (!hasBonds) {
    insights.push('No hay renta fija en la cartera. Si en algún momento buscás bajar la volatilidad general, es la pieza más simple que falta.');
  }
  return insights;
}

export function renderProfileInsights() {
  document.getElementById('profile-insights').innerHTML =
    computeProfileInsights().map(t => '<div class="insight-item">' + t + '</div>').join('');
  document.getElementById('adjustment-insights').innerHTML =
    computeAdjustmentInsights().map(t => '<div class="insight-item">' + t + '</div>').join('');
}

export function renderIdeas(answers) {
  const themes = (answers.themes && answers.themes.length) ? answers.themes : DEFAULT_GAP_THEMES;
  const usingDefault = !(answers.themes && answers.themes.length);
  const cards = themes.map(k => THEME_IDEAS[k]).filter(Boolean);

  const noteParts = [];
  if (usingDefault) {
    noteParts.push('No elegiste temáticas todavía — estos son los huecos más claros de tu cartera actual (renta fija y diversificación geográfica).');
  } else {
    const bits = [];
    if (answers.risk) bits.push('riesgo ' + answers.risk);
    if (answers.horizon) bits.push('horizonte ' + answers.horizon);
    noteParts.push('Ideas para tu perfil' + (bits.length ? ' (' + bits.join(', ') + ')' : '') + ', según las temáticas elegidas.');
  }
  document.getElementById('ideas-note').textContent = noteParts.join(' ');
  document.getElementById('idea-grid').innerHTML = cards.map(c =>
    '<div class="idea-card"><div class="idea-tag">' + c.tag + '</div>' +
    '<div class="idea-title">' + c.title + '</div>' +
    '<div class="idea-desc">' + c.desc + '</div></div>'
  ).join('');
}

document.querySelectorAll('.chip-row').forEach(function(row) {
  const key = row.getAttribute('data-quiz');
  const multi = row.getAttribute('data-multi') === 'true';
  row.querySelectorAll('.chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      const val = chip.getAttribute('data-value');
      if (multi) {
        const idx = quizState[key].indexOf(val);
        if (idx >= 0) { quizState[key].splice(idx, 1); chip.classList.remove('selected'); }
        else { quizState[key].push(val); chip.classList.add('selected'); }
      } else {
        quizState[key] = val;
        row.querySelectorAll('.chip').forEach(function(c) { c.classList.remove('selected'); });
        chip.classList.add('selected');
      }
    });
  });
});

document.getElementById('quiz-submit').addEventListener('click', function() {
  renderIdeas(quizState);
  document.getElementById('idea-grid').closest('section').scrollIntoView({behavior: 'smooth', block: 'start'});
  saveProfileAnswers({ risk_tolerance: quizState.risk, horizon: quizState.horizon, themes: quizState.themes });
});
