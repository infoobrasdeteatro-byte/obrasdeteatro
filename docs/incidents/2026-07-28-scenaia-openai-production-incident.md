# Incidente ScenaIA — OpenAI / Producción

## Estado
RESUELTO

## Fecha
28 de julio de 2026 (investigación iniciada el 27 de julio de 2026)

## Impacto

ScenaIA, en producción, devolvía sistemáticamente un resultado controlado de error ("ERROR CONTROLADO — No ha sido posible procesar tu solicitud en este momento. Inténtalo de nuevo más tarde.") para toda petición que requería generación real de contenido por IA (`needsAI=true`). Las peticiones que no requerían IA (`needsAI=false`, respuesta directa desde conocimiento estructurado) funcionaban con normalidad durante todo el incidente — esto acotó, desde el principio, que el fallo no era del pipeline completo sino específico de la rama que llega a OpenAI.

## Síntomas

- La interfaz de `/scenaia` cargaba y respondía con normalidad (sin bloqueos, sin errores de renderizado).
- El formulario aceptaba la petición y el botón "Enviar" funcionaba.
- La respuesta final, para cualquier petición que requería IA, era siempre la etiqueta "Error controlado" con un mensaje genérico, sin ningún detalle técnico visible.
- El código HTTP de `POST /api/scenaia-verified` era **200** en todos los casos relevantes a este incidente (existió, en un tramo temporal previo y distinto, un HTTP 500 — ver "Factores contribuyentes").

## Arquitectura afectada

Únicamente el tramo final del pipeline de ScenaIA:

```
AI Gateway (lib/ai-gateway/execute-ai-request.ts)
  → OpenAI Adapter (lib/ai-gateway/openai-adapter.ts)
    → SDK oficial `openai` (node_modules/openai)
```

Ningún otro componente (Request Interpreter, Professional Context Engine, Decision Engine, Credit Manager, Accounting Engine, Response Composer, Orquestador) resultó ser la causa final, aunque uno de ellos (Accounting Engine) sí presentó un defecto real e independiente durante la misma investigación — ver "Factores contribuyentes".

## Cronología

- **27/07/2026, ~21:11 UTC** — Primera prueba E2E real con `needsAI=true`: `POST /api/scenaia-verified` devuelve **HTTP 500**. Causa: defecto SQL real e independiente en `accounting_verify_and_reserve` (columna `created_at` ambigua). Expediente propio: **IA-ACC-SQL-001**.
- **27/07/2026, ~22:11 UTC** — Corrección de IA-ACC-SQL-001 desplegada en producción (migración correctiva, sin tocar la migración histórica original).
- **27/07/2026, ~22:24 UTC** — Segunda prueba E2E: `POST /api/scenaia-verified` devuelve **HTTP 200**, con `responseType: RESPONSE_ERROR` ("Error controlado"). Se confirma, por consulta directa a `credit_reservations`, que Accounting Engine ya funciona correctamente (reserva real creada). El fallo se ha desplazado a un punto posterior, entre Accounting Engine y OpenAI.
- **27–28/07/2026** — Investigación manual en Vercel: inicialmente no se localiza ninguna variable de entorno relacionada con OpenAI. Se crea una variable con el nombre `CLAVE_API_DE_OPENAI` (nombre no reconocido por el código) y se redespliega — el síntoma no cambia.
- **28/07/2026, ~02:27 UTC** — Nueva prueba tras confirmar visualmente que `OPENAI_API_KEY` ya existía en la configuración de Vercel: el síntoma **persiste**, sin ninguna llamada externa a OpenAI visible en el panel de invocación de Vercel.
- **28/07/2026** — Se genera una nueva clave de API de OpenAI, se sustituye como valor de `OPENAI_API_KEY` (Production + Preview, marcada Sensitive), se crea un nuevo deployment de producción con la caché de compilación desmarcada, y se espera a que quede `READY`.
- **28/07/2026** — Dos pruebas E2E reales (`"¿Qué convocatorias hay disponibles?"`, `"recomiendame un dramaturgo español"`) devuelven `RESPONSE_SUCCESS` con contenido generado por IA. Incidente resuelto funcionalmente.

## Investigación realizada

Resumen de lo ya documentado en los expedientes de esta misma investigación (no se repite en detalle aquí): validación de candidato limpio en Git, integración a `main`, despliegue de infraestructura de Accounting Engine (IA-ACC-PROD-001), diagnóstico y corrección del defecto SQL de `accounting_verify_and_reserve` (IA-ACC-SQL-001), múltiples pruebas E2E reales correlacionadas contra logs de producción y datos reales de Supabase, inspección directa del código fuente del SDK oficial de OpenAI ya instalado en el proyecto, y verificación exhaustiva de que ningún archivo propio del repositorio hace referencia a nombres de variable distintos de `OPENAI_API_KEY`/`OPENAI_MODEL`.

## Causa raíz

**El adaptador de OpenAI (`lib/ai-gateway/openai-adapter.ts`) construye el cliente del SDK sin credencial explícita (`new OpenAI()`), delegando en el propio SDK la lectura de `process.env.OPENAI_API_KEY`. Durante el tramo del incidente, esa variable no llegó, con un valor utilizable, a la instancia de ejecución que atendía las peticiones reales — inicialmente porque no existía ninguna variable con ese nombre exacto (se creó una con un nombre distinto, `CLAVE_API_DE_OPENAI`, que el código nunca busca), y en un tramo posterior por una causa que no ha podido demostrarse con certeza entre varias igualmente plausibles (ver "Incertidumbres restantes"). El SDK, al no encontrar ninguna credencial, lanza de forma síncrona su propio error de configuración antes de intentar ninguna llamada de red — de ahí que nunca se observara tráfico saliente hacia OpenAI durante todo el tramo fallido.**

## Evidencia

- `lib/ai-gateway/openai-adapter.ts:14-19` — `new OpenAI()` sin `apiKey` explícita.
- `node_modules/openai/client.js:60` — `apiKey = process.env['OPENAI_API_KEY'] ?? null` (comportamiento oficial y documentado del SDK).
- `node_modules/openai/client.js:156-157` — `if (!providerRuntime && !apiKey && !adminAPIKey && !workloadIdentity) { throw new Errors.OpenAIError('Missing credentials. Please pass an \`apiKey\`, \`workloadIdentity\`, \`adminAPIKey\`, or set the \`OPENAI_API_KEY\` or \`OPENAI_ADMIN_KEY\` environment variable.'); }` — coincide, con alta fidelidad, con los nombres de variable observados durante el diagnóstico en la respuesta de la aplicación.
- Búsqueda exhaustiva en `lib/`: cero referencias propias a `OPENAI_ADMIN_KEY`, `OPENAI_ORGANIZATION`, `OPENAI_PROJECT` o `CLAVE_API_DE_OPENAI` — confirma que esos nombres proceden exclusivamente del propio SDK, no de código de la aplicación.
- Logs reales de Vercel (`POST /api/scenaia-verified 200`, 27/07 22:24 UTC) sin ninguna entrada de error de servidor y sin ninguna llamada externa a `api.openai.com` en el panel de invocación — coherente con una excepción síncrona en la construcción del cliente, nunca con una llamada de red rechazada.
- Fila real en `credit_reservations` (`id=73c04d5a-56b3-4fb7-9c4b-2d747e43ab50`) confirmando que Accounting Engine, Credit Manager y AI Gateway sí se ejecutaron correctamente hasta el punto de invocar al adaptador — el fallo está acotado, con evidencia directa, al propio adaptador o al SDK, no a ningún componente anterior.
- Dos pruebas E2E reales tras la corrección, con `RESPONSE_SUCCESS` y contenido real generado por IA.

## Factores contribuyentes

- **Defecto SQL independiente en Accounting Engine** (`accounting_verify_and_reserve`, ambigüedad de columna `created_at`) — causó un HTTP 500 real y distinto en una fase anterior de la misma investigación, ya corregido y desplegado (IA-ACC-SQL-001) antes de que el problema de OpenAI quedara aislado como causa final. No es la causa del incidente aquí documentado, pero retrasó su diagnóstico al presentar un segundo fallo real en la misma cadena.
- **Nombre de variable incorrecto** (`CLAVE_API_DE_OPENAI` en vez de `OPENAI_API_KEY`) — factor contribuyente demostrado en la primera fase del diagnóstico de credenciales.
- **Ausencia total de observabilidad del error real** (ver más abajo) — no fue causa del fallo, pero fue la razón por la que el diagnóstico requirió horas: el mensaje exacto del SDK nunca llegó a ningún log de servidor.

## Corrección aplicada

Exclusivamente de configuración, sin cambios de código: generación de una nueva clave de API de OpenAI, sustitución como valor de la variable `OPENAI_API_KEY` en Vercel (Production + Preview, Sensitive), creación de un nuevo deployment de producción, y verificación de que quedó `READY`.

## Verificación E2E

Dos peticiones reales en producción, con contenido no sensible, ambas con `responseType: RESPONSE_SUCCESS` y contenido generado por IA:
1. *"¿Qué convocatorias hay disponibles?"*
2. *"recomiendame un dramaturgo español"* → recomendó a Federico García Lorca con contenido generado sobre su obra.

## Por qué devolvía HTTP 200

`app/api/scenaia-verified/route.ts` siempre responde `NextResponse.json(responseContext)` sin ninguna lógica de código de estado condicionada al `responseType` — el contrato arquitectónico de Response Composer es "degradación segura por defecto, nunca una excepción" (documentado en el propio código, `lib/response-composer/types.ts`): cualquier fallo de un componente aguas abajo del Núcleo se traduce en un `ResponseContext` válido con `responseType: RESPONSE_ERROR`, nunca en una excepción no controlada que llegara a Next.js. Es, por diseño, indistinguible a nivel de HTTP de una respuesta "correcta" — solo el cuerpo JSON revela el fallo real.

## Por qué no aparecía tráfico hacia OpenAI

`lib/ai-gateway/openai-adapter.ts` construye el cliente (`new OpenAI()`) **dentro** del mismo `try` que envuelve la llamada real (`getClient().chat.completions.create(...)`, línea 36). Cuando el SDK no encuentra ninguna credencial utilizable, lanza su propio error de configuración **de forma síncrona, en la propia construcción del cliente** — antes de que se despache ninguna petición HTTP. El `catch` que rodea esa línea captura igual una excepción de construcción que un fallo real de red, por lo que ambos casos producen el mismo `RESPONSE_ERROR` — pero solo el segundo genera tráfico de red observable. La ausencia total de llamadas a `api.openai.com` en todas las trazas del incidente es, en sí misma, la evidencia de que nunca se llegó a intentar la llamada real.

## Medidas preventivas

1. **Validación explícita de `OPENAI_API_KEY` al construir el cliente**, con un mensaje propio y distinguible (no delegar en el mensaje genérico del SDK) que permita diferenciar "credencial ausente" de cualquier otro fallo sin necesidad de inspeccionar código fuente en un incidente futuro.
2. **Logging estructurado y seguro del `executionStatus`/tipo de error** en el propio servidor (nunca el mensaje completo si pudiera contener fragmentos de credenciales) — hoy `ERROR_COMUNICACION` no deja ningún rastro en ningún log de Vercel, solo en `responseWarnings`, visible únicamente en la respuesta HTTP al cliente.
3. **Códigos internos de error diferenciados** para: credencial ausente/inválida, cuota/billing, modelo no disponible, timeout, error de red — hoy todos colapsan en el mismo `ERROR_COMUNICACION` genérico.
4. **Health check ligero y de solo lectura del proveedor** (p. ej. verificar al arrancar que `OPENAI_API_KEY` resuelve a un valor no vacío, sin hacer ninguna llamada real) — habría detectado este incidente en segundos, no en horas.
5. **Prueba de integración real contra la API de OpenAI** (no mockeada), ejecutable bajo demanda contra un entorno de verificación, para validar credenciales sin depender de una prueba manual completa de ScenaIA.
6. **Prueba E2E automatizada** que ejercite específicamente `needsAI=true` de forma periódica, no solo bajo demanda manual.
7. **Reconsiderar, arquitectónicamente, si un fallo de comunicación con el proveedor debe seguir devolviendo HTTP 200** — la decisión actual (degradación segura, nunca excepción) es una decisión de diseño ya congelada y con justificación propia (evita que un fallo de un componente periférico rompa la respuesta al usuario); este incidente no la invalida, pero sí demuestra su coste real en observabilidad — cualquier cambio aquí requeriría su propio expediente de gobernanza, no se propone aquí.
8. **Mantener los secretos fuera de logs y de la UI** — ya es así hoy (verificado: ningún valor de credencial aparece en ningún log ni en pantalla); esta práctica debe mantenerse explícitamente al implementar cualquiera de las medidas anteriores.

## Lecciones técnicas

- Un adaptador que delega la lectura de credenciales en el propio SDK, sin validación propia, oculta por completo la diferencia entre "credencial ausente" y "fallo de red" hasta que alguien lee el código fuente del SDK.
- La ausencia de tráfico de red observable es, en sí misma, una señal diagnóstica de alto valor — permitió descartar con seguridad "clave inválida" o "fallo del proveedor" mucho antes de tener el mensaje exacto.
- Un `catch` que envuelve tanto la construcción de un cliente como su uso mezcla dos clases de fallo muy distintas bajo el mismo manejo — arquitectónicamente razonable para no duplicar lógica, pero con coste real de diagnóstico si no se complementa con logging diferenciado.
- El nombre exacto de una variable de entorno es una superficie de fallo silenciosa: no hay ningún error visible al crear una variable con un nombre distinto al esperado, ni en Vercel ni en el código.

## Elementos que NO fueron la causa

Descartados con evidencia, durante la propia investigación:

- **Breakpoints de DevTools sobre bundles minificados** — no se detenían durante el envío; abandonado como vía de investigación por no aportar evidencia utilizable, no por ser la causa.
- **Los 3 avisos del panel "Problemas" de Chrome** (2 de atributos `id`/`name` en campos de formulario HTML, 1 de Content Security Policy sobre `eval`) — inspeccionados y descartados explícitamente; ninguno tiene relación demostrable con `RESPONSE_ERROR` ni con la llamada a OpenAI. No se modificó CSP.
- **Existencia/accesibilidad del endpoint `/api/scenaia-verified`** — confirmado desde el principio que el endpoint existe, responde, y no es un 404 ni una caída de infraestructura.
- **Renderizado de la interfaz `/scenaia`** — funcionó correctamente durante todo el incidente; el fallo nunca estuvo en el frontend.
- **Desactivar la caché de compilación ("Build Cache"), como mecanismo causal en sí mismo** — ver más abajo, tratado explícitamente como incertidumbre, no como causa confirmada.

## Incertidumbres restantes

- **No puede demostrarse, con la evidencia disponible, la causa exacta del tramo intermedio** (variable `OPENAI_API_KEY` ya presente, con nombre correcto, y aun así fallando en la prueba de 02:27 UTC del 28/07). Son igualmente plausibles, sin poder distinguirlas: (a) el valor estaba vacío o solo con espacios; (b) el ámbito no incluía realmente Production en ese momento; (c) la petición de esa prueba fue atendida por un deployment anterior a haber guardado la variable. No se capturó, en su momento, el mensaje literal de `responseWarnings` de esa prueba concreta, que habría resuelto esta pregunta con certeza.
- **El papel causal de desactivar "Build Cache" no está demostrado.** Las variables de entorno de Vercel se inyectan en el entorno de ejecución de un deployment en el momento de su creación, con independencia de si su compilación reutilizó artefactos de caché — la caché de compilación acelera el paso de *build*, no determina qué variables de entorno recibe la función en tiempo de ejecución. La explicación de mayor confianza es que **el factor causal fue crear un deployment nuevo después de guardar el valor correcto de la credencial** — un paso necesario en cualquier caso, con o sin caché — y que desactivar la caché fue una precaución razonable tomada a la vez, no el mecanismo que resolvió el problema. Esto no se ha verificado de forma independiente (no se realizó una prueba de control con caché activada), por lo que se documenta como hipótesis de alta confianza, no como hecho demostrado.
- **No se ha determinado si la clave antigua expuesta llegó a ser usada realmente en algún momento**, ni si estaba ella misma invalidada/revocada de forma independiente antes de sustituirse — no fue investigado, dado que la sustitución completa ya resolvió el incidente sin necesitar esa distinción.
