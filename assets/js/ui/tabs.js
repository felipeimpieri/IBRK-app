/**
 * Navegacion por pestanas y deep-link por hash.
 */
import { TABS } from './../config.js';

export function setTab(tab) {
  if (TABS.indexOf(tab) === -1) tab = 'resumen';
  document.querySelectorAll('.tab-panel').forEach(function(el){
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  document.querySelectorAll('.nav-btn').forEach(function(btn){
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  window.scrollTo(0, 0);
  try { history.replaceState(null, '', '#' + tab); } catch(e) {}
}

document.querySelectorAll('.nav-btn').forEach(function(btn){
  btn.addEventListener('click', function(){ setTab(btn.dataset.tab); });
});

setTab((location.hash || '').replace('#', ''));
