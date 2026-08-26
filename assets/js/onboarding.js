/**
 * Pantalla de bienvenida: recoge el perfil inicial y entra a la app.
 */
import { INSTRUMENT_THEME_MAP } from './config.js';
import { hydrateChipRow, saveProfileAnswers } from './profile.js';
import { renderAll } from './render.js';
import { quizState } from './state.js';
import { showApp } from './ui/screens.js';

document.getElementById('onb-deepen-btn').addEventListener('click', function() {
  document.getElementById('onb-deepen-prompt').style.display = 'none';
  document.getElementById('onb-deep-test').style.display = 'block';
});

document.getElementById('onb-submit').addEventListener('click', async function() {
  const name = document.getElementById('onb-name').value.trim();
  const risk = quizState['onb-risk'] || null;
  const horizon = quizState['onb-horizon'] || null;
  // El test de personalización (instrumentos concretos + países/cripto) es opcional y
  // está oculto hasta que el usuario lo abre a propósito. Cada instrumento elegido suma
  // su tema correspondiente a los que ya se hayan tildado arriba, sin pisar nada.
  const instrumentPicks = (quizState['onb-instruments'] || []).concat(quizState['onb-countries'] || []);
  const derivedThemes = instrumentPicks.map(function(v) { return INSTRUMENT_THEME_MAP[v]; }).filter(Boolean);
  const themes = Array.from(new Set((quizState['onb-themes'] || []).concat(derivedThemes)));
  quizState.risk = risk;
  quizState.horizon = horizon;
  quizState.themes = themes;
  hydrateChipRow('risk', risk);
  hydrateChipRow('horizon', horizon);
  themes.forEach(function(t) { hydrateChipRow('themes', t); });
  if (name) {
    const title = document.getElementById('brand-title');
    if (title) title.textContent = 'Cartera IBKR — ' + name;
  }
  await saveProfileAnswers({
    preferred_name: name || null,
    risk_tolerance: risk,
    horizon: horizon,
    themes: themes,
    onboarded_at: new Date().toISOString()
  });
  showApp();
  renderAll();
});

document.getElementById('onb-skip').addEventListener('click', async function() {
  await saveProfileAnswers({ onboarded_at: new Date().toISOString() });
  showApp();
  renderAll();
});
