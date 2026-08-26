"""Smoke test de la app. Levanta un servidor local porque la app usa modulos ES,
que el navegador NO carga desde file:// (los bloquea CORS). Correr con:  python3 tests/smoke_test.py"""
import functools
import http.server
import json
import os
import socketserver
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME_PATH = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
FAKE_DATA = json.load(open(os.path.join(ROOT, "tests/fixtures/fake_data.json")))


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve(root):
    handler = functools.partial(_Quiet, directory=root)
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, "http://127.0.0.1:%d" % httpd.server_address[1]

INIT_SCRIPT_TEMPLATE = """
window.__FAKE_DATA__ = %s;
(function() {
  var params = new URLSearchParams(window.location.search);
  var onboarded = params.get('onboarded') === '1';
  var savedProfile = onboarded ? {
    preferred_name: 'Felipe', risk_tolerance: 'moderado', horizon: 'largo',
    themes: ['tech', 'bonds'], onboarded_at: '2026-01-01T00:00:00Z'
  } : { preferred_name: null, risk_tolerance: null, horizon: null, themes: null, onboarded_at: null };

  window.__lastProfileUpdate = null;

  window.supabase = {
    createClient: function(url, key) {
      return {
        auth: {
          getUser: function() { return Promise.resolve({ data: { user: { id: 'test-user-1', email: 'felipe@test.com' } } }); },
          getSession: function() { return Promise.resolve({ data: { session: { user: { id: 'test-user-1' } } } }); },
          onAuthStateChange: function(cb) { return { data: { subscription: { unsubscribe: function(){} } } }; },
          signOut: function() { return Promise.resolve({}); },
          signInWithPassword: function(){ return Promise.resolve({ data: {}, error: null }); },
          signUp: function(){ return Promise.resolve({ data: {}, error: null }); },
          signInWithOAuth: function(){ return Promise.resolve({ data: {}, error: null }); }
        },
        from: function(table) {
          if (table === 'profiles') {
            return {
              select: function() {
                return { eq: function() { return { limit: function() { return Promise.resolve({ data: [savedProfile], error: null }); } }; } };
              },
              update: function(partial) {
                window.__lastProfileUpdate = partial;
                Object.assign(savedProfile, partial);
                return { eq: function() { return Promise.resolve({ data: null, error: null }); } };
              }
            };
          }
          if (table === 'portfolio_snapshots') {
            return {
              select: function() {
                return { order: function() { return { limit: function() {
                  return Promise.resolve({ data: [{ data: window.__FAKE_DATA__, captured_at: '2026-08-20' }], error: null });
                } }; } };
              }
            };
          }
          throw new Error('unexpected table ' + table);
        }
      };
    }
  };
})();
""" % json.dumps(FAKE_DATA)


def run():
    httpd, BASE = serve(ROOT)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)

        # --- Scenario A: fresh user, no profile saved yet -> onboarding must show ---
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: console_errors.append(str(exc)))
        page.add_init_script(INIT_SCRIPT_TEMPLATE)
        page.goto(BASE + "/index.html?onboarded=0")
        page.wait_for_timeout(500)

        onboarding_visible = page.eval_on_selector("#onboarding-screen", "el => getComputedStyle(el).display")
        app_visible = page.eval_on_selector("#app-root", "el => getComputedStyle(el).display")
        print("A1. onboarding-screen display:", onboarding_visible, "(expect flex)")
        print("A2. app-root display:", app_visible, "(expect none)")

        page.fill("#onb-name", "Felipe Test")
        page.click('.chip-row[data-quiz="onb-risk"] .chip[data-value="agresivo"]')
        page.click('.chip-row[data-quiz="onb-horizon"] .chip[data-value="largo"]')
        page.click('.chip-row[data-quiz="onb-themes"] .chip[data-value="tech"]')
        page.click('.chip-row[data-quiz="onb-themes"] .chip[data-value="crypto"]')
        # Test de personalización opcional: primero confirmamos que arranca oculto,
        # lo abrimos con el botón "Sí, quiero personalizarlo más", y elegimos algunos
        # instrumentos (dejando otros sin elegir a propósito).
        deep_test_before = page.eval_on_selector("#onb-deep-test", "el => getComputedStyle(el).display")
        print("A0. onb-deep-test display antes de abrir:", deep_test_before, "(expect none)")
        page.click("#onb-deepen-btn")
        page.wait_for_timeout(150)
        deep_test_after = page.eval_on_selector("#onb-deep-test", "el => getComputedStyle(el).display")
        print("A0b. onb-deep-test display después de abrir:", deep_test_after, "(expect block)")
        page.click('.chip-row[data-quiz="onb-instruments"] .chip[data-value="KO"]')
        page.click('.chip-row[data-quiz="onb-countries"] .chip[data-value="EWZ"]')
        page.click('.chip-row[data-quiz="onb-countries"] .chip[data-value="BTC"]')
        page.click("#onb-submit")
        page.wait_for_timeout(400)

        onboarding_after = page.eval_on_selector("#onboarding-screen", "el => getComputedStyle(el).display")
        app_after = page.eval_on_selector("#app-root", "el => getComputedStyle(el).display")
        brand_title = page.eval_on_selector("#brand-title", "el => el.textContent")
        last_update = page.evaluate("window.__lastProfileUpdate")
        risk_selected = page.eval_on_selector(
            '.chip-row[data-quiz="risk"] .chip.selected', "el => el ? el.getAttribute('data-value') : null"
        )
        horizon_selected = page.eval_on_selector(
            '.chip-row[data-quiz="horizon"] .chip.selected', "el => el ? el.getAttribute('data-value') : null"
        )
        themes_selected = page.eval_on_selector_all(
            '.chip-row[data-quiz="themes"] .chip.selected', "els => els.map(e => e.getAttribute('data-value'))"
        )

        print("A3. onboarding-screen display after submit:", onboarding_after, "(expect none)")
        print("A4. app-root display after submit:", app_after, "(expect block)")
        print("A5. brand-title:", brand_title, "(expect contains 'Felipe Test')")
        print("A6. last profile update sent to Supabase:", last_update)
        print("A7. Ideas-tab risk chip selected:", risk_selected, "(expect agresivo)")
        print("A8. Ideas-tab horizon chip selected:", horizon_selected, "(expect largo)")
        print("A9. Ideas-tab themes chips selected:", sorted(themes_selected), "(expect ['crypto','tech'])")
        print("A10. console errors:", console_errors if console_errors else "none")
        page.close()

        # --- Scenario B: returning user with saved profile -> onboarding must be skipped, chips pre-hydrated ---
        page2 = browser.new_page(viewport={"width": 1280, "height": 900})
        console_errors2 = []
        page2.on("console", lambda msg: console_errors2.append(msg.text) if msg.type == "error" else None)
        page2.on("pageerror", lambda exc: console_errors2.append(str(exc)))
        page2.add_init_script(INIT_SCRIPT_TEMPLATE)
        page2.goto(BASE + "/index.html?onboarded=1")
        page2.wait_for_timeout(500)

        onboarding_b = page2.eval_on_selector("#onboarding-screen", "el => getComputedStyle(el).display")
        app_b = page2.eval_on_selector("#app-root", "el => getComputedStyle(el).display")
        brand_title_b = page2.eval_on_selector("#brand-title", "el => el.textContent")
        risk_b = page2.eval_on_selector(
            '.chip-row[data-quiz="risk"] .chip.selected', "el => el ? el.getAttribute('data-value') : null"
        )
        horizon_b = page2.eval_on_selector(
            '.chip-row[data-quiz="horizon"] .chip.selected', "el => el ? el.getAttribute('data-value') : null"
        )
        themes_b = page2.eval_on_selector_all(
            '.chip-row[data-quiz="themes"] .chip.selected', "els => els.map(e => e.getAttribute('data-value'))"
        )

        # --- Simulador: bloque principal = ganancia real (de `positions`, sin estimar) ---
        real_labels = page2.eval_on_selector_all(
            "#sim-real-tiles .tile .t-label", "els => els.map(e => e.textContent)"
        )
        real_values = page2.eval_on_selector_all(
            "#sim-real-tiles .tile .t-value", "els => els.map(e => e.textContent)"
        )
        real_rows = page2.eval_on_selector_all(
            "#sim-real-table tbody tr",
            "els => els.map(r => Array.from(r.cells).map(c => c.textContent))",
        )
        sim_scope = page2.eval_on_selector("#sim-scope", "el => el.textContent")
        pop_hidden_before = page2.eval_on_selector("#sim-pop", "el => el.hidden")
        pop_text = page2.eval_on_selector("#sim-pop", "el => el.textContent")
        bench_values = page2.eval_on_selector_all(
            "#sim-tiles .tile .t-value", "els => els.map(e => e.textContent)"
        )

        print()
        print("B8.  sim-real-tiles labels:", real_labels)
        assert real_labels == ["Costó", "Vale hoy", "Ganancia"], real_labels
        print("B9.  sim-real-tiles values:", real_values)
        # SPY 6158.92 + GOOGL 1574.00 = 7732.92  ->  7404.50 + 3342.40 = 10746.90
        assert real_values[0] == "$7,732.92", real_values
        assert real_values[1] == "$10,746.90", real_values
        assert real_values[2] == "$3,013.98", real_values
        print("B10. filas de la tabla real:", real_rows)
        assert len(real_rows) == 2, real_rows
        # ordenadas por ganancia desc: GOOGL (+1768.40) antes que SPY (+1245.58)
        assert real_rows[0][0] == "GOOGL", real_rows
        assert real_rows[0][3] == "$1,768.40", real_rows
        assert real_rows[1][0] == "SPY", real_rows
        assert real_rows[1][3] == "$1,245.58", real_rows

        print("B11. sim-scope:", repr(sim_scope))
        # cubiertas y en cartera = solo SPY (JNJ se vendió); posiciones totales = 2
        assert "1 de tus 2 posiciones" in sim_scope, sim_scope

        print("B12. sim-pop oculto al cargar:", pop_hidden_before, "(expect True)")
        assert pop_hidden_before is True
        assert "GOOGL" in pop_text, pop_text
        assert "JNJ" in pop_text, pop_text
        assert "cuándo" in pop_text, pop_text

        page2.click('.nav-btn[data-tab="simulador"]')   # el panel debe estar visible para clickear
        page2.wait_for_timeout(200)
        page2.click("#sim-dot")
        page2.wait_for_timeout(120)
        pop_hidden_after = page2.eval_on_selector("#sim-pop", "el => el.hidden")
        print("B13. sim-pop oculto tras click en el punto:", pop_hidden_after, "(expect False)")
        assert pop_hidden_after is False

        bench_subs = page2.eval_on_selector_all(
            "#sim-tiles .tile .t-sub", "els => els.map(e => e.textContent)"
        )
        print("B14. tiles de benchmark — montos:", bench_values)
        print("     y sus subtitulos (% o rango):", bench_subs)
        # Un % suelto no dice nada sin el monto: cada tile lleva los dos.
        assert all("$" in v for v in bench_values), bench_values
        assert len(bench_values) == 5, bench_values          # invertido + 4 escenarios
        assert bench_values[0] == "$9,515.98", bench_values  # base de la comparacion
        assert all("%" in x for x in bench_subs[1:]), bench_subs

        sim_excluded = page2.eval_on_selector("#sim-excluded", "el => el.textContent")
        print("B15. sim-excluded:", repr(sim_excluded))
        assert "GOOGL" in sim_excluded

        assert page2.eval_on_selector_all("#sim-stale-warn", "e => e.length") == 0
        assert page2.eval_on_selector_all("#sim-reconcile", "e => e.length") == 0
        print("B16. los ids viejos (sim-stale-warn / sim-reconcile) ya no existen: OK")

        print("B7. console errors:", console_errors2 if console_errors2 else "none")
        page2.close()

        browser.close()
    httpd.shutdown()


if __name__ == "__main__":
    run()
