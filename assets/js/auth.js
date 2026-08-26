/**
 * Login, registro y carga del snapshot desde Supabase.
 */
import { applyProfileToState } from './profile.js';
import { renderAll } from './render.js';
import { setCurrentUserId, setData } from './state.js';
import { sb } from './supabase.js';
import { showApp, showAuthScreen, showOnboarding } from './ui/screens.js';

// ===== Auth (Supabase) =====
export const AUTH_ERROR_ES = {
  'Invalid login credentials': 'Email o contraseña incorrectos.',
  'Email not confirmed': 'Todavía no confirmaste tu mail — revisá tu bandeja de entrada (y spam).',
  'User already registered': 'Ya existe una cuenta con ese mail — probá iniciar sesión.',
};

export function authErrorMessage(err) {
  if (!err) return 'Ocurrió un error inesperado. Probá de nuevo.';
  return AUTH_ERROR_ES[err.message] || err.message;
}

export function showAuthMessage(text, kind) {
  const el = document.getElementById('auth-message');
  el.textContent = text;
  el.className = 'auth-message ' + (kind || 'error');
  el.style.display = 'block';
}

export function hideAuthMessage() {
  document.getElementById('auth-message').style.display = 'none';
}

// Los toggles de login/registro no dependen del cliente de Supabase —
// se conectan siempre, para que la pantalla nunca quede "muerta" si el
// script de Supabase tarda o no llega a cargar (red lenta, bloqueador, etc.)
document.getElementById('to-signup-link').addEventListener('click', function(){
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = 'flex';
  document.getElementById('to-signup').style.display = 'none';
  document.getElementById('to-login').style.display = 'inline';
  hideAuthMessage();
});

document.getElementById('to-login-link').addEventListener('click', function(){
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('login-form').style.display = 'flex';
  document.getElementById('to-login').style.display = 'none';
  document.getElementById('to-signup').style.display = 'inline';
  hideAuthMessage();
});

export function initAuth(sb) {
  document.getElementById('login-form').addEventListener('submit', async function(evt){
    evt.preventDefault();
    hideAuthMessage();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) showAuthMessage(authErrorMessage(error), 'error');
  });

  document.getElementById('signup-form').addEventListener('submit', async function(evt){
    evt.preventDefault();
    hideAuthMessage();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) { showAuthMessage(authErrorMessage(error), 'error'); return; }
    if (data && !data.session) {
      showAuthMessage('Cuenta creada. Te mandamos un mail para confirmarla — revisá tu bandeja de entrada.', 'ok');
    }
  });

  document.getElementById('google-btn').addEventListener('click', async function(){
    hideAuthMessage();
    await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
  });

  document.getElementById('logout-btn').addEventListener('click', async function(){
    await sb.auth.signOut();
  });

  async function loadPortfolioData() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);
    document.getElementById('user-email').textContent = user.email;

    const { data: profileRows } = await sb
      .from('profiles')
      .select('preferred_name, risk_tolerance, horizon, themes, onboarded_at')
      .eq('id', user.id)
      .limit(1);
    const profile = (profileRows && profileRows[0]) || {};
    applyProfileToState(profile);

    const { data: rows, error } = await sb
      .from('portfolio_snapshots')
      .select('data, captured_at')
      .order('captured_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error(error);
      showApp();
      document.getElementById('app-root').innerHTML = '<div class="empty-state">Hubo un error cargando tu cartera. Probá recargar la página.</div>';
      return;
    }
    if (!rows || !rows.length) {
      showApp();
      document.getElementById('app-root').innerHTML =
        '<div class="empty-state">Todavía no hay datos sincronizados en tu cuenta.<br>En cuanto se conecte y corra la primera sincronización, vas a ver tu cartera acá.</div>';
      return;
    }
    setData(rows[0].data);

    if (!profile.onboarded_at) {
      showOnboarding();
    } else {
      showApp();
      renderAll();
    }
  }

  sb.auth.onAuthStateChange(function(event, session){
    if (session) { loadPortfolioData(); } else { showAuthScreen(); }
  });
  sb.auth.getSession().then(function(res){
    if (res.data.session) { loadPortfolioData(); } else { showAuthScreen(); }
  });
}
