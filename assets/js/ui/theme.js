/**
 * Tema claro/oscuro/sistema, persistido en localStorage.
 */
import { renderAll } from './../render.js';
import { DATA } from './../state.js';

export function setTheme(mode) {
  if (mode === 'system') {
    document.documentElement.removeAttribute('data-theme');
    try { localStorage.removeItem('theme'); } catch(e) {}
  } else {
    document.documentElement.setAttribute('data-theme', mode);
    try { localStorage.setItem('theme', mode); } catch(e) {}
  }
  // dark is the default look; only an explicit OS light-preference (or an explicit choice) flips it
  const isDark = mode === 'dark' || (mode === 'system' && !window.matchMedia('(prefers-color-scheme: light)').matches);
  document.getElementById('theme-toggle').textContent = isDark ? 'Modo claro' : 'Modo oscuro';
}

(function initTheme(){
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch(e) {}
  setTheme(saved || 'system');
})();

document.getElementById('theme-toggle').addEventListener('click', function(){
  const current = document.documentElement.getAttribute('data-theme') ||
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  setTheme(current === 'dark' ? 'light' : 'dark');
  renderAll();
});

window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function(){
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch(e) {}
  if (!saved && DATA) { setTheme('system'); renderAll(); }
});
