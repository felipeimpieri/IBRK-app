# Brief para Claude Design — Dashboard de cartera IBKR

## Qué es
Una app personal para ver la cartera de inversiones de Interactive Brokers (IBKR): posiciones, rendimiento, simulador de "qué hubiera pasado si invertía distinto", y una sección de recomendaciones/educación. Hoy es HTML+CSS+JS plano (una sola página, sin framework de build) — el resultado final tiene que poder traducirse a eso, no depende de React/Vue/etc.

## Contenido y secciones (fijo, no se puede sacar nada)
1. Header con marca/logo + botón modo claro/oscuro.
2. Hero: valor total de la cartera, variación del día, cash disponible.
3. Tiles de métricas: P&L no realizado, retornos YTD / 1 año / 1 mes, dividendos acumulados, P&L realizado.
4. Gráfico de rendimiento acumulado del año (línea/área, tooltip al pasar el mouse).
5. Asignación por clase de activo, país y sector (barras horizontales).
6. Tabla de posiciones actuales (ticker, cantidad, precio, valor, P&L).
7. Tabla de operaciones recientes.
8. Simulador — "¿qué hubiera pasado?": compara las compras reales contra haber puesto la misma plata el mismo día en SPY / QQQ / Bitcoin. Tiles de comparación + gráfico de barras + tabla de detalle.
9. Recomendaciones: perfil inferido de la cartera (texto generado de los datos), mini-quiz de riesgo/horizonte/temáticas con chips, tarjetas de ideas de inversión por temática, sección de "posibles ajustes a considerar".

Próximamente se le va a agregar navegación tipo app (menú con secciones en vez de todo en una sola página larga) y login de usuario — pero el diseño visual de cada sección de arriba es lo que necesitamos ahora.

## Referencias de estilo (lo que SÍ queremos)
Linear, Vercel, Raycast — dark-first pero con buen modo claro también. Minimalista pero con carácter propio, no genérico. Tipografía cuidada como protagonista (números grandes, jerarquía clara). Uso de color con propósito: verde/rojo para positivo/negativo, un único color de acento para el resto. Sensación de "producto real y dedicado", no de plantilla ni de salida de librería de gráficos.

## Lo que NO queremos (ya lo probamos y se descartó)
- **Genérico/plantilla básica**: la primera versión era flat sin identidad — se sintió "lo hace cualquiera".
- **Glassmorphism**: blobs de color de fondo, blur pesado en las tarjetas, texto con gradiente, glow en los gráficos. Se probó y se rechazó con fuerza (ver `reference_rejected_glassmorphism.png` adjunta) — nada de blur ni glow.
- **Librerías de componentes de terceros tal cual** (Bootstrap, Material, shadcn genérico sin modificar) — tiene que sentirse hecho a medida, no "sacado de un kit".

## Archivos adjuntos
- `dashboard_actual.html` — la versión actual funcionando, con datos reales embebidos (para ver estructura y contenido real).
- `data.json` — los datos crudos.
- `reference_current_dark.png` / `reference_current_light.png` — cómo se ve hoy (punto de partida a superar).
- `reference_rejected_glassmorphism.png` — la dirección que ya se descartó (para no repetirla).

## Lo que buscamos de esta consulta
Una dirección visual concreta y superadora — paleta, tipografía, tratamiento de las tarjetas/gráficos/tablas — que se vea única y curada, no genérica. Puede venir como descripción, mockup, código, o lo que Design proponga.
