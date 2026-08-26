"""Build a standalone (offline) HTML file from index.html + data.json.
Replaces the fetch('./data.json') loader with an embedded <script type="application/json">
blob parsed via JSON.parse, so the result works from file:// with no server."""
import json

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()
with open('data.json', 'r', encoding='utf-8') as f:
    data_raw = f.read()
    json.loads(data_raw)  # sanity check it's valid JSON

OLD_LOADER = """fetch('./data.json').then(r => r.json()).then(d => { DATA = d; renderAll(); })
  .catch(err => { document.getElementById('hero-value').textContent = 'Error cargando datos'; console.error(err); });"""
NEW_LOADER = """try {
  DATA = JSON.parse(document.getElementById('data-blob').textContent);
  renderAll();
} catch (err) {
  document.getElementById('hero-value').textContent = 'Error cargando datos';
  console.error(err);
}"""

assert OLD_LOADER in html, "loader snippet not found — index.html structure changed"
html = html.replace(OLD_LOADER, NEW_LOADER)

blob_tag = '<script type="application/json" id="data-blob">' + data_raw + '</script>\n'
assert '<body>' in html
html = html.replace('<body>', '<body>\n' + blob_tag, 1)

for out_name in ('index_standalone.html', 'cartera-ibkr-felipe.html'):
    with open(out_name, 'w', encoding='utf-8') as f:
        f.write(html)
    print('wrote', out_name, len(html), 'bytes')
