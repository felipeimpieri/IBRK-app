# Historial

Qué se hizo, cuándo y por qué. Lo más nuevo arriba.

---

## 2026-08-21 · Refactor a módulos y orden del repo

`index.html` tenía **1.689 líneas** con todo adentro: markup, 390 de CSS y 913 de JS.

Se partió en **18 módulos ES** (1.073 líneas de JS), `assets/css/app.css` (390) y un
`index.html` de **386 líneas de puro markup**. Se ordenó el repo en `assets/`, `tests/`,
`docs/`, `tools/` y `samples/`.

**Cómo se hizo, para poder repetirlo:** extracción mecánica, no reescritura. Un script cortó el
`<script>` en 66 bloques de nivel superior respetando profundidad de llaves y strings, los
repartió entre módulos y generó los `import` analizando qué identificador usa cada uno.

**Verificación:**
- Las cinco funciones auditadas salieron **byte por byte idénticas** (hash SHA-256 antes/después).
- Ninguna otra función cambió de cuerpo, salvo dos cambios deliberados: `initAuth` usa ahora
  `setData()` / `setCurrentUserId()` (requisito de los módulos), y `renderSimulator` se partió
  en `renderGananciaReal()` + `renderBenchmarks()` — hacía dos trabajos sin relación en 164
  líneas.
- El grafo de módulos quedó **sin ciclos** y con todos los módulos alcanzables desde `main.js`.
- Los 16 asserts del smoke test pasan contra la estructura nueva.
- Comparación pixel a pixel de las pantallas antes/después: la tarjeta de benchmarks salió
  **idéntica**; la de ganancia difiere solo en el degradado decorativo del fondo (diferencia
  media de 4/255 por canal, porque el alto del documento cambió unos píxeles).

Dos bugs que el proceso encontró y que valen como advertencia:
- Un `import` faltante de `deltaClass`. El generador lo perdió porque borraba comentarios antes
  que strings, y el `//` de una URL dentro de un string desbalanceaba las comillas. Se cambió a
  un scanner de una sola pasada.
- Los módulos que solo registran listeners (`onboarding.js`, `ui/theme.js`, `ui/tabs.js`) no
  aparecían importados por nadie, porque no exportan nada que se use. La app habría cargado sin
  tema, sin pestañas y sin onboarding, **y sin un solo error en consola**. `main.js` los importa
  explícitamente.

## 2026-08-20 · Simulador: la ganancia real primero

Reporte del usuario: *"no puede ser que haya ganado 9k"*. El Simulador mostraba
`Invertido $9.515,98 / Resultado real $9.534,32` como si fueran la cartera entera.

Se investigó con la cuenta real y el hallazgo dio vuelta el enfoque: **lo que el usuario quería
saber no había que estimarlo.**

- **Ganancia real:** `market_value − cost_basis` = $18.710,36 → $22.908,27 = **+$4.197,92
  (+22,4%)**. Exacto, coincide al centavo con IBKR, no necesita fecha de compra.
- **Retorno de la cuenta:** IBKR ya lo calcula (TWR de Portfolio Analyst): **+14,87% a 1 año**.
- **Depósitos:** se despejan exacto cruzando NAV con TWR. Se encontró el aporte grande:
  **$9.775,66 el 2026-03-02**. Ese día el NAV saltó de $12.641 a $22.453 (+77,6%) mientras el
  retorno se movía +0,29 pp. Ahí se cerró la duda original: de los $12.424 que creció la cuenta
  en un año, $9.776 los puso el usuario.
- **Estimar la fecha de compra desde el precio: no funciona.** Se midió con precios reales de
  5 años. GOOGL: 4 grupos de fechas candidatas en 13 meses. IBKR: contradictorio por el split
  4-a-1 de junio 2025, y encima es una posición fraccionaria de $173 que parece dividendo
  reinvertido — no tiene *una* fecha de compra.

**Rediseño (`83f69cb`):** "Tu ganancia real" pasó a ser la tarjeta principal; la comparación
contra benchmarks bajó a secundaria, con alcance escrito y punto de ayuda. Después se le
restauraron los montos junto a los porcentajes, y se arregló el contraste de los tiles en tema
oscuro (el glass es casi transparente y sobre las zonas claras del fondo los números se lavaban).

**Detectado y sin arreglar:** el bloque `performance` también está congelado. La app dice
+11,21% a 1 año cuando el real es +14,87%.

## 2026-08-20 · Pestañas (`be0b816`)

De página larga con scroll a cuatro pestañas (Resumen / Posiciones / Simulador / Ideas), con
deep-link por hash. *"Nadie mira toda la página larga, pero sí el menú."* Cambio 100% aditivo.

**Lección de proceso:** el usuario reportó dos veces que "seguía igual" después de arreglos que
sí estaban hechos. Había tres versiones dando vueltas y él abría siempre su URL de producción,
que estaba dos entregas atrasada. Desde entonces: se escribe el archivo a su carpeta, él
pushea, y se verifica **producción** por ETag. Un preview de Vercel no sirve como canal de
revisión.

## 2026-08-20 · Migración al diseño Glass (`a577e8f`)

Se portaron los 44 tokens de color, el efecto vidrio, la tipografía (Archivo + IBM Plex Mono),
las fotos de fondo y los resplandores. **Cambio 100% de CSS y estructura, cero líneas de lógica.**

## 2026-08-15 · Auditoría de datos (`68f0b0e`)

Revisión campo por campo contra el snapshot real. Cinco problemas, tres mostrando números
incorrectos. Ver `AUDITORIA.md`.

Se descubrió de paso que el proyecto de Vercel apuntaba al repo equivocado — un template viejo
de v0, no `IBRK-app`. Por eso los arreglos "no aparecían".

## Antes

Login real de punta a punta con Supabase Auth (email+password con confirmación, y Google), RLS
por usuario desde el día uno. La app pasó de leer `data.json` a leer `portfolio_snapshots`.
Sincronización diaria por `pg_cron` + Edge Function contra el Flex Web Service de IBKR.

---

## Sobre `tools/`

Scripts históricos, no se usan en el flujo actual:

- `compute_data.py` — generaba el shape de `data.json` a partir de datos crudos de IBKR, con las
  posiciones hardcodeadas. Lo reemplazó la Edge Function que sincroniza sola todos los días.
  Queda como referencia del shape.
- `inject_standalone.py` — armaba un HTML offline con los datos embebidos, para compartir.
  **Ya no funciona:** daba por sentado un loader (`fetch('./data.json')`) que dejó de existir
  cuando la app pasó a Supabase.
