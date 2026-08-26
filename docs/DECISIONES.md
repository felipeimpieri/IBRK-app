# Decisiones

Por qué el proyecto es como es. Cada entrada dice qué se decidió, por qué, y qué se descartó.

---

## Producto

### Describir, no prescribir
La app cuenta cómo está tu cartera; no te dice qué comprar. Ni la app ni quien la programa son
asesores registrados, y hay un disclaimer explícito en pantalla.

Test para cualquier texto nuevo: **¿describe una situación o sugiere una acción?** Si sugiere
una acción, no va.

Esto vale para el motor de Ideas, para los scores, y para cualquier cosa que venga después.
El camino honesto para que las Ideas sean útiles es mostrar *datos y huecos* ("no tenés renta
fija", "tu exposición tech real es X% contando el look-through de los ETFs"), no una lista de
tickers.

### Nunca inventar un número
Si un dato no está, la app lo dice. No se rellena con una estimación disfrazada de dato real.

El patrón canónico es `computeRealized()`: cuando un ticker tiene ventas pero sus compras
quedaron fuera de la ventana de la API, marca el resultado como incompleto en vez de estimar.

### Las estimaciones se muestran, pero con la marca pegada al número
Decisión del 2026-08-20, contra la propuesta inicial de bloquearlas hasta que el cliente las
confirme. El razonamiento que ganó: bloquear la estimación deja la pantalla vacía justo para el
cliente que más la necesita, el de diez años de historia.

Tres reglas que la hacen honesta:
1. **La marca viaja pegada al número, no en la esquina de la tarjeta.** Un badge arriba de todo
   se lee una vez y desaparece; el número queda solo y se propaga en capturas de pantalla.
2. **Si el rango de fechas posibles es ancho, se muestra la horquilla, no un punto.** Acá está
   el control real de honestidad: cuando la incertidumbre es grande, el problema es mostrar un
   solo número, no la falta de disclaimer.
3. **La carga manual siempre visible ahí mismo**, no escondida en configuración.

### La jerarquía visual es parte de la corrección
Si un número está mal encuadrado, se cambia la jerarquía — no se le agrega una nota al pie.
Nació de un error real: se anotó el Simulador con avisos en gris chico y el usuario no vio
ninguna diferencia, porque el número confuso seguía siendo el más grande de la pantalla.

### Un porcentaje sin monto no dice nada
"+9,2%" no informa si no se ve sobre cuánta plata se calculó. Los tiles llevan los dos.
(Se probó mostrar solo porcentajes para evitar que los montos se confundieran con la cartera;
el remedio fue peor. La confusión se resuelve con jerarquía y alcance escrito, no sacando
información.)

---

## Técnicas

### Sin build, sin bundler, sin framework
No hay `npm install`, no hay paso de build, no hay `node_modules`. Lo que está en el repo es lo
que corre en producción. Deployar es pushear.

La única dependencia externa es el cliente de Supabase por CDN.

Se evaluó separar en módulos con bundler cuando el archivo pasó de 1.700 líneas. Se descartó:
agrega un paso que se puede romper y una diferencia entre repo y producción, a cambio de nada
que se necesite hoy.

### Módulos ES nativos (2026-08-21)
Cuando `index.html` llegó a 1.689 líneas se partió en 18 módulos. Módulos nativos, no scripts
clásicos: dan dependencias explícitas y matan el espacio global, a costo cero de tooling.

**El precio:** no se puede abrir `index.html` con doble clic — los módulos no cargan desde
`file://`. Hay que servirlo por HTTP. El smoke test levanta su propio servidor por eso.

Si algún día ese precio molesta más de lo que ayuda, la salida es volver a scripts clásicos,
**no** meter un bundler.

### El estado mutable vive en un solo lugar
`export let DATA` da un binding vivo, pero solo su módulo puede reasignarlo. De ahí `setData()`
y `setCurrentUserId()` en `state.js`. Sin esto, cada módulo tendría su propia copia y la app
mostraría datos viejos de formas difíciles de rastrear.

### El grafo de módulos no tiene ciclos
Se rompieron dos ciclos a propósito durante el refactor:
- `sb` se movió a `supabase.js` (antes vivía en `main.js`, que importaba `auth.js`, que lo
  necesitaba de vuelta).
- `profile.js` se partió en `profile.js` (datos puros) y `onboarding.js` (pantalla, que sí
  necesita `renderAll`).

Los módulos ES toleran ciclos, pero un ciclo es una señal de que dos cosas que deberían estar
separadas están enredadas.

### Cinco funciones financieras son intocables
Ver `AUDITORIA.md`. Cada cambio al front verifica por diff que no se tocaron. En el refactor a
módulos salieron byte por byte idénticas, verificado por hash.

### El smoke test es la red de seguridad, no el largo del archivo
Un archivo largo es incómodo; un cambio sin verificar es peligroso. El smoke test corre los dos
escenarios de arranque y verifica el contenido real de la pantalla. **Cuando agregues una
feature, agregale un assert.**

### Verificar producción por ETag
Vercel devuelve `ETag: W/"<md5>"`. Comparado contra el md5 local, prueba que lo que está online
es exactamente el archivo revisado. No es paranoia: dos veces un arreglo pareció no funcionar y
en realidad no había llegado a producción.

### Los mockups de diseño no se commitean
`diseno/` está en `.gitignore` por dos razones: Vercel publica como estático **todo** lo que
está en el repo, y esos `.dc.html` tienen la cartera con números reales hardcodeados — quedarían
accesibles sin login en `https://<dominio>/diseno/...`. Además son 3,8 MB que no son código.

---

## Pendientes de decidir

- **Qué significa "Ideas pro de verdad".** Hay dos caminos muy distintos: análisis institucional
  sobre la cartera propia (solapamiento real entre holdings, exposición a factores, drift
  sectorial) o recomendaciones de qué comprar. El segundo es asesoramiento financiero
  personalizado y choca con "describir, no prescribir".
- **Cuándo separar `index.html`** si el markup crece. Hoy son 386 líneas y se lee bien.
- **Modo LIBERADA** (etiquetas irreverentes para los scores): arquitectura de tres capas ya
  definida — score (matemática, invariante) → estadio (umbrales) → etiqueta (lo único que
  cambia con el modo). Falta construirlo.
