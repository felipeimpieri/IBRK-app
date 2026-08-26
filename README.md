# Cartera IBKR

Dashboard de cartera para clientes de Interactive Brokers. Muestra posiciones, rendimiento,
dividendos y comparaciones contra benchmarks a partir del snapshot diario que sincroniza IBKR
hacia Supabase. Multi-usuario, con login propio y datos aislados por cliente.

**En producción:** https://eve-chat-template-chi-dusky.vercel.app

---

## Cómo correrlo

La app usa **módulos ES**, que el navegador no carga desde `file://` (los bloquea CORS).
Hay que servirla por HTTP, aunque sea el servidor más tonto:

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

No hay build, no hay `npm install`, no hay bundler. Lo que ves en el repo es lo que corre
en producción, archivo por archivo.

## Cómo se testea

```bash
python3 tests/smoke_test.py
```

Levanta la app en un servidor local, la abre con Playwright y verifica dos escenarios
(usuario nuevo → onboarding, usuario que vuelve → app directa) más el contenido del
Simulador. Si algo se rompe, falla con un `AssertionError` que dice qué.

Antes de pushear cualquier cambio al front, correlo.

## Cómo se deploya

`git push` a `main`. Vercel detecta el push y publica solo, en pocos segundos.

**Verificación obligatoria después de pushear** — comparar lo que sirve producción contra
el archivo local:

```bash
curl -sI https://eve-chat-template-chi-dusky.vercel.app | grep -i etag
md5sum index.html
```

El ETag es `W/"<md5>"`. Si no coincide, producción no tiene tu cambio. Esto **no es opcional**:
ya pasó dos veces que un arreglo parecía no funcionar y en realidad no había llegado.

---

## Estructura

```
index.html              solo markup (386 líneas) — ni una línea de CSS ni de JS
assets/
  css/app.css           todos los estilos y los tokens de tema
  js/
    main.js             punto de entrada
    config.js           constantes: Supabase, pestañas, paletas
    state.js            estado en memoria (DATA, perfil) + sus setters
    format.js           formateo de números y fechas
    finance.js          ⚠ CÁLCULOS AUDITADOS — leer docs/AUDITORIA.md antes de tocar
    supabase.js         cliente de Supabase
    auth.js             login, registro y carga del snapshot
    profile.js          perfil de inversor persistente
    onboarding.js       pantalla de bienvenida
    render.js           orquestador: qué se dibuja y en qué orden
    ui/                 tema, pestañas, gráficos, cambio de pantalla
    views/              una por pestaña: resumen, posiciones, simulador, ideas
tests/
  smoke_test.py         test end-to-end con Playwright
  fixtures/             datos de prueba
tools/                  scripts sueltos, históricos (ver docs/HISTORIAL.md)
samples/data.json       snapshot de referencia: el shape que espera la app
docs/                   ↓
```

## Documentación

| Doc | Para qué |
|---|---|
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Mapa de módulos, quién depende de quién, cómo fluyen los datos |
| [docs/DATOS.md](docs/DATOS.md) | Shape del snapshot y **qué campos están frescos y cuáles congelados** |
| [docs/AUDITORIA.md](docs/AUDITORIA.md) | Los bugs de datos encontrados, su estado, y las funciones protegidas |
| [docs/DECISIONES.md](docs/DECISIONES.md) | Por qué cada cosa es como es |
| [docs/HISTORIAL.md](docs/HISTORIAL.md) | Qué se hizo y cuándo |
| [docs/SPEC.md](docs/SPEC.md) | Spec de producto: fases, arquitectura, seguridad |

## Reglas de la casa

1. **No tocar `assets/js/finance.js`** sin leer `docs/AUDITORIA.md`. Son cinco funciones que
   arreglan bugs que le mostraban números incorrectos al usuario.
2. **Nunca inventar un número.** Si un dato no está, la app lo dice. No se rellena con una
   estimación disfrazada de dato real.
3. **No usar `DATA.performance` para nada nuevo** — está congelado (ver `docs/DATOS.md`).
4. **Correr el smoke test antes de pushear**, y verificar el ETag después.
5. Si un número está mal encuadrado, se cambia la jerarquía visual — no se le agrega una nota
   al pie. Una aclaración en gris chico debajo de un número grande y confuso no arregla nada.
