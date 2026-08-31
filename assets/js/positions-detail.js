/**
 * Detalle por posicion (ticker, cantidad, precio) bajo demanda.
 *
 * Desde el cambio de minimizacion de datos (agosto 2026), el server
 * (sync-ibkr) YA NO guarda positions[]/trades[] crudos en portfolio_snapshots
 * -- ver cartera/estrategia-producto-pago.md y producto/infraestructura.md.
 * Este modulo pide ese detalle a la Edge Function fetch-positions, que lo
 * calcula en vivo contra IBKR en cada request y lo devuelve sin persistirlo
 * en ninguna tabla. Se cachea SOLO en memoria de esta pestana del navegador
 * (nunca en localStorage/disco) -- desaparece al cerrar o recargar.
 */
import { SUPABASE_URL } from './config.js';
import { sb } from './supabase.js';

let cache = null;       // { positions, trades, generated_at } | null
let inFlight = null;    // Promise en curso (evita pedidos duplicados en paralelo)
let lastError = null;

export function getPositionsDetailCache() { return cache; }
export function getPositionsDetailError() { return lastError; }

export function ensurePositionsDetail(force) {
  if (cache && !force) return Promise.resolve(cache);
  if (inFlight) return inFlight;

  inFlight = (async function () {
    lastError = null;
    try {
      const { data: sessionData } = await sb.auth.getSession();
      const token = sessionData && sessionData.session && sessionData.session.access_token;
      if (!token) throw new Error('No hay sesión activa.');

      const res = await fetch(SUPABASE_URL + '/functions/v1/fetch-positions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      });
      const json = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(json.error || ('Error ' + res.status + ' cargando el detalle.'));

      cache = { positions: json.positions || [], trades: json.trades || [], generated_at: json.generated_at || null };
      return cache;
    } catch (err) {
      lastError = (err && err.message) || String(err);
      throw err;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
