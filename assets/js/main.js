/**
 * Punto de entrada: arranca la app o avisa si no hay conexion.
 */
// Modulos de solo-efecto: registran sus listeners al importarse.
import './ui/theme.js';
import './ui/tabs.js';
import './onboarding.js';
import { initAuth, showAuthMessage } from './auth.js';
import { sb } from './supabase.js';

if (!sb) {
  showAuthMessage('No se pudo conectar con el servidor. Revisá tu conexión y recargá la página.', 'error');
} else {
  initAuth(sb);
}
