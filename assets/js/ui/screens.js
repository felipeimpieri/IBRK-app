/**
 * Alterna entre las tres pantallas: login, onboarding y app.
 */
export function showOnboarding() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-root').style.display = 'none';
  document.getElementById('onboarding-screen').style.display = 'flex';
}

export function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('onboarding-screen').style.display = 'none';
  document.getElementById('app-root').style.display = 'none';
}

export function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('onboarding-screen').style.display = 'none';
  document.getElementById('app-root').style.display = 'block';
}
