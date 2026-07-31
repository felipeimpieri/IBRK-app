# Spec de producto — "Cartera" (nombre de trabajo)

Estado: primer borrador para discutir. Nace del dashboard personal de Felipe (IBKR) — este doc define cómo evolucionarlo a un producto que otra gente pueda usar.

## Problema y usuario objetivo

Quien tiene cuenta en Interactive Brokers y quiere entender su cartera en profundidad (rendimiento real, cómo le fue comparado con simplemente haber comprado un índice, dónde tiene concentración de riesgo, ideas educativas según su perfil) hoy no tiene una herramienta pensada para eso. La propia interfaz de IBKR está orientada a operar, no a entender. Los agregadores de cartera genéricos (Kubera, Empower/Personal Capital y similares) son multi-broker pero superficiales — no llegan al nivel de detalle ni al tipo de análisis que arma este dashboard.

Felipe construyó exactamente esa herramienta para sí mismo. La hipótesis de producto es que una porción de la base de usuarios de IBKR (que es grande) pagaría o al menos usaría activamente una versión hospedada y seria de lo mismo, sin tener que construírsela.

## Fases

**Fase 0 — Personal (Felipe), con login real.** Sigue siendo de un solo usuario, pero deja de vivir "suelto" en un HTML servido sin autenticación: pasa a tener cuenta, login, y sincronización de datos automática (no manual vía chat). Es la base técnica de todo lo que sigue.

**Fase 1 — Multi-usuario, IBKR únicamente.** Cualquier persona con cuenta IBKR puede crear una cuenta en la app y conectar su cartera. Alcance angosto a propósito: un solo broker, una sola cuenta por usuario, sin trading.

**Fase 2 — futura, no diseñada en detalle todavía.** Otros brokers, carga por CSV o ingreso manual como alternativa a la sincronización automática, posible monetización. Se menciona acá solo para que las decisiones de Fase 0/1 no la hagan más difícil después — no es un compromiso de construirla.

## Cómo se conecta la cuenta de IBKR (investigado, no es una suposición)

IBKR ofrece dos caminos para que un tercero lea datos de una cuenta:

- **Flex Web Service** (recomendado para Fase 1): el usuario genera él mismo, desde su propia cuenta de IBKR (Settings → Account Report → Flex Web Service), un token de acceso + un Query ID. No comparte su contraseña de IBKR en ningún momento. El token no requiere reautenticación ni 2FA repetido, tiene vencimiento configurable (6 horas a 1 año) y el usuario puede revocarlo cuando quiera desde su propia cuenta. Es de solo lectura de reportes preconfigurados — estructuralmente no puede operar ni mover fondos. Rate limit: 1 request/segundo, 10/minuto por token. Pensado para sincronización diaria, no para tiempo real (el Activity Statement se actualiza una vez al cierre del día de mercado).
- **Client Portal Web API (CPAPI)**: soporta OAuth pero está pensado para trading en vivo, típicamente requiere una sesión de Gateway corriendo, y probablemente exige aprobación de IBKR como partner externo. Mayor superficie de riesgo y de mantenimiento.

Dado que Felipe pidió explícitamente "seguridad de verdad" y que nadie no autorizado vea la info de nadie, **Flex Web Service es la elección correcta para el MVP**: el usuario nunca entrega una credencial que permita operar, y el peor caso de una filtración del token es que alguien vea reportes de posiciones — no que pueda mover dinero.

Fuentes: [IBKR Flex Web Service](https://www.interactivebrokers.com/campus/ibkr-api-page/flex-web-service/), [IBKR Client Portal API](https://www.interactivebrokers.com/campus/ibkr-api-page/cpapi-v1/).

## Goals

1. Fase 0 funcionando de punta a punta: login real, datos detrás de autenticación, sincronización automática sin intervención manual, durante al menos 2 semanas seguidas sin que Felipe tenga que pedirle a un chat que actualice nada.
2. Fase 1: al menos 5–10 usuarios externos completan el onboarding completo (cuenta → mail confirmado → token IBKR conectado → primera sincronización exitosa) sin soporte manual de Felipe.
3. Modelo de seguridad creíble: un desconocido tiene que poder entender, en menos de un minuto, qué puede y qué NO puede hacer la app con su token, y confiar en conectarlo.
4. Aislamiento de datos verificado: ningún usuario puede ver datos de otro, probado explícitamente antes de invitar al primer usuario externo.
5. Aprender qué parte del producto engancha — dashboard básico vs. Simulador vs. Recomendaciones — para decidir dónde invertir después.

## Non-goals (v1)

- **Nada de trading ni movimiento de fondos**, ahora ni en el roadmap cercano — el producto es puramente de lectura y análisis. Evita la superficie regulatoria y de riesgo de operar con la plata de terceros.
- **Un solo broker (IBKR) en Fase 1** — angosto y profundo antes de generalizar a otros brokers.
- **Sin CSV ni carga manual en Fase 1** — se prioriza la sincronización automática porque es más confiable; CSV queda para una fase futura sin diseñar todavía.
- **Sin app mobile nativa** — web responsive alcanza para v1.
- **Una cuenta IBKR por usuario** en v1 — simplifica el modelo de datos, se puede extender después.
- **Sin cobro/suscripción en Fase 1** — primero validar uso real, después evaluar monetización.

## Historias de usuario

**Felipe (Fase 0)**
- Como Felipe, quiero loguearme antes de ver mi dashboard, para que solo yo pueda ver mi información financiera.
- Como Felipe, quiero poder loguearme con Google o con email, para no manejar una contraseña más.
- Como Felipe, quiero que mis datos se actualicen solos, sin tener que pedírselo a un chat cada vez.

**Usuario nuevo con cuenta IBKR (Fase 1)**
- Como usuario nuevo, quiero crear una cuenta con email o Google/Facebook y confirmar mi mail, para asegurarme de que solo yo controle mi cuenta.
- Como usuario nuevo, quiero un instructivo claro de cómo generar mi token de Flex Web Service y mi Query ID en mi propia cuenta de IBKR, para conectar mi cartera sin compartir mi contraseña con nadie.
- Como usuario, quiero que me quede clarísimo qué puede y qué no puede hacer la app con mi token (solo lectura, nunca puede operar), para confiar en conectarla.
- Como usuario, quiero poder desconectar/revocar el acceso cuando quiera, desde la app o desde mi propia cuenta de IBKR.
- Como usuario, quiero ver resumen, posiciones, simulador y recomendaciones con MIS datos, sin que nadie más pueda verlos.
- Como usuario, quiero un aviso si mi token está por vencer o ya venció, para no perder la sincronización sin darme cuenta.
- Como usuario, si mi token o Query ID son inválidos, quiero un mensaje de error claro sobre qué revisar.
- Como usuario nuevo sin datos todavía, quiero un estado vacío que me explique qué va a aparecer ahí.

## Requisitos

**P0 — Fase 0**
- Auth real con Supabase: registro por email con confirmación obligatoria antes de poder loguear; login social con Google (Facebook si las credenciales de developer están listas a tiempo, si no pasa a P1).
- Pantalla de cuenta básica: cambiar mail/password, cerrar sesión, ver última sincronización.
- Aislamiento de datos por usuario desde el día uno (Row Level Security en Supabase), aunque Fase 0 tenga un solo usuario real — evita rehacer el modelo de datos en Fase 1.
- Todo el dashboard actual (resumen, posiciones, simulador, recomendaciones) queda detrás del login.
- Sincronización automática programada, al menos 1 vez por día, sin intervención manual.

**P0 — Fase 1**
- Flujo de onboarding: crear cuenta → confirmar mail → instructivo para generar token + Query ID en IBKR → pegarlos en la app → primera sincronización.
- Tokens guardados encriptados en la base, nunca en texto plano, nunca expuestos al frontend una vez guardados.
- Proceso de sync periódico (ej. Supabase Edge Function + cron) respetando el rate limit de IBKR, mínimo 1 vez por día por usuario.
- Página de estado de conexión: última sincronización, estado del token (activo/por vencer/vencido/inválido), botón de desconexión.
- Pruebas explícitas de aislamiento de datos entre cuentas antes de invitar al primer usuario externo.

**P1**
- Login social con Facebook, si las credenciales están listas.
- Aviso por mail cuando el token está por vencer.
- Export de los propios datos (transparencia/portabilidad).

**P2 — futuro, sin diseñar en detalle**
- Otros brokers.
- Carga por CSV o ingreso manual.
- Monetización / suscripción paga.
- Multi-cuenta IBKR por usuario.

## Métricas de éxito

**Tempranas (días/semanas)**
- Fase 0 corriendo sin intervención manual 2 semanas seguidas.
- 5–10 usuarios externos completan onboarding completo sin soporte manual.
- Tasa de éxito de onboarding (llegan a primera sync exitosa / arrancan el registro): meta inicial 50%+ — generar el token en IBKR tiene fricción real, no va a ser 100%.

**Tardías (semanas/meses)**
- Retención semana 1: % que vuelve a entrar la semana siguiente.
- % de usuarios que usan Simulador o Recomendaciones más de una vez — señal de que el valor agregado engancha, no solo el dashboard básico.

## Preguntas abiertas

- **[Legal — bloqueante para Fase 1]** ¿Qué términos de servicio y política de privacidad hacen falta antes de aceptar el primer usuario externo? Esto excede lo que este asistente puede resolver — conviene consulta legal real antes de operar con datos financieros de terceros.
- **[Legal/Compliance — bloqueante para Fase 1]** ¿Hay alguna registración o limitación regulatoria por ofrecer esto en distintas jurisdicciones (Argentina, EE.UU., otras)? Misma recomendación: consulta legal.
- **[Ingeniería — no bloqueante para Fase 0]** Confirmar contra la documentación oficial de IBKR el detalle exacto de expiración/renovación de tokens Flex antes de programar los avisos de vencimiento.
- **[Producto — no bloqueante]** ¿"Cartera" es el nombre/marca definitivo o Felipe quiere explorar otro naming?
- **[Producto — no bloqueante]** ¿Gratis hasta validar retención, o freemium desde el día uno? Se puede decidir con las primeras métricas en mano.

## Consideraciones de timeline

- Fase 0 no tiene fecha dura — depende de que Felipe consiga las credenciales OAuth de Google (y Facebook si aplica).
- Fase 1 no debería arrancar sin resolver el punto legal/compliance — es la dependencia dura, no la técnica.
- El diseño visual (en paralelo, vía Claude Design) es necesario antes de exponer Fase 1 a usuarios externos, pero no bloquea seguir avanzando en Fase 0 con el diseño actual como base temporal.
