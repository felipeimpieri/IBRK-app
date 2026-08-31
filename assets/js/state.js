/**
 * Estado compartido en memoria. Se muta SOLO desde aca (setData/setCurrentUserId).
 */
export let DATA = null;
export function setData(next) { DATA = next; }

// Popula el detalle por-posicion (ticker/cantidad/precio) que ya no viaja en
// el snapshot del servidor -- ver positions-detail.js. Muta DATA in-place
// (no reasigna la variable) para que todos los modulos que ya la importaron
// vean el cambio sin volver a pedir el objeto.
export function setPositionsDetail(detail) {
  if (!DATA) return;
  DATA.positions = detail.positions;
  DATA.trades = detail.trades;
}

// --- Perfil de inversor persistente (asesor con IA, Fase 1) ---
// Guarda en Supabase (tabla profiles) lo que el usuario ajusta en "Afiná tu perfil",
// así no se pierde al recargar. No toca ninguna lógica financiera/render existente.
export let CURRENT_USER_ID = null;
export function setCurrentUserId(next) { CURRENT_USER_ID = next; }

export const quizState = {
  risk: null, horizon: null, themes: [],
  'onb-risk': null, 'onb-horizon': null, 'onb-themes': [],
  'onb-instruments': [], 'onb-countries': []
};
