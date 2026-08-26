/**
 * Perfil de inversor persistente: leer, guardar y aplicar. Habla con la tabla profiles.
 */
import { CURRENT_USER_ID, quizState } from './state.js';
import { sb } from './supabase.js';

export async function saveProfileAnswers(partial) {
  if (!sb || !CURRENT_USER_ID) return;
  try {
    const { error } = await sb.from('profiles').update(partial).eq('id', CURRENT_USER_ID);
    if (error) console.error('No se pudo guardar el perfil:', error);
  } catch (err) {
    console.error('No se pudo guardar el perfil:', err);
  }
}

// Marca en el DOM los chips que ya vienen guardados en el perfil (no dispara el click
// handler a propósito, para no volver a escribir en Supabase lo que ya vino de ahí).
export function hydrateChipRow(key, val) {
  if (!val) return;
  document.querySelectorAll('.chip-row[data-quiz="' + key + '"] .chip').forEach(function(chip) {
    if (chip.getAttribute('data-value') === val) chip.classList.add('selected');
  });
}

// Aplica el perfil guardado (si existe) al estado del quiz de Ideas y al saludo del header.
export function applyProfileToState(profile) {
  if (!profile) return;
  if (profile.risk_tolerance) quizState.risk = profile.risk_tolerance;
  if (profile.horizon) quizState.horizon = profile.horizon;
  if (profile.themes && profile.themes.length) quizState.themes = profile.themes.slice();
  hydrateChipRow('risk', quizState.risk);
  hydrateChipRow('horizon', quizState.horizon);
  (quizState.themes || []).forEach(function(t) { hydrateChipRow('themes', t); });
  if (profile.preferred_name) {
    const title = document.getElementById('brand-title');
    if (title) title.textContent = 'Cartera IBKR — ' + profile.preferred_name;
    const onbName = document.getElementById('onb-name');
    if (onbName) onbName.value = profile.preferred_name;
  }
}
