/**
 * Crea el cliente de Supabase. Aislado para que nadie mas dependa del arranque.
 */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

export let sb = null;

try {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
  console.error('No se pudo inicializar Supabase:', err);
}
