/**
 * H1/H2 — COTAS DE ADMISION DE ENTRADA.
 *
 * Hasta este bloque no existia ninguna: ni longitud de mensaje, ni numero
 * de turnos, ni tamano de historial. La cuota economica tapaba el hueco por
 * accidente en los planes limitados, y no lo tapaba en absoluto en
 * `empresas`, cuyo techo autorizado es `NULL` y por tanto nunca deniega.
 *
 * FUENTE UNICA. Las tres cifras y los tres mensajes viven aqui y solo aqui.
 * La ruta las aplica, las pruebas las importan y las invariantes comprueban
 * que no reaparezcan como literales en ningun otro sitio: un limite
 * duplicado es un limite que acabara divergiendo.
 *
 * Modulo aparte de `route.ts` por una razon tecnica, no de gusto: un
 * `route.ts` de App Router solo admite exportar sus manejadores HTTP y su
 * configuracion declarada. Exportar constantes desde alli rompe la
 * comprobacion de tipos de la ruta, y sin exportarlas no habria fuente
 * unica que las pruebas pudieran importar.
 *
 * SE MIDE EN UNIDADES DE CODIGO UTF-16 (`String.length`), la MISMA unidad
 * que el estimador usa como `promptCharacters`. Elegir aqui otra -- puntos
 * de codigo, bytes, tokens -- haria que la cota y el coste hablaran de
 * magnitudes distintas. Que esa unidad no sea proporcional a los tokens
 * reales ante emoji o CJK es un asunto conocido y registrado (P2-B), ajeno
 * a este bloque: aqui solo importa que la cota y la estimacion cuenten lo
 * mismo.
 *
 * SE RECHAZA, NUNCA SE RECORTA. Recortar en silencio produciria el mismo
 * "criterio fantasma" que `parseConversationState` existe para impedir: el
 * usuario creeria haber preguntado algo que el sistema nunca leyo. Ademas
 * `previousUserRequests.length` es el indice de turno con el que el
 * servidor reconstruye `stateVersion`, de modo que recortar el historial
 * corromperia ademas la numeracion de la conversacion.
 */

/**
 * Mensaje del usuario: 3.000 unidades.
 *
 * Respaldado por el analisis previo:
 *
 *   - PRODUCTO: 1,5 veces el campo de texto libre mas grande que la
 *     aplicacion ya acepta (la sinopsis de una obra, `maxLength={2000}`), y
 *     unas 50 veces el turno real observado en produccion (~60 car.).
 *   - ECONOMIA: el mensaje entra DOS veces en la estimacion -- prompt de
 *     texto y prompt del resolutor --, asi que al limite anade 1,0000
 *     creditos sobre el suelo de 3,7390. Un turno con el mensaje mas largo
 *     admisible reserva 4,7390 creditos y por tanto cabe incluso en la
 *     cuota mas pequena. La cota no contradice a la economia, y no la toca.
 */
export const MAX_USER_PROMPT_CHARACTERS = 3_000

/**
 * Historial: 20 entradas.
 *
 * DECISION EXPLICITA DE PRODUCTO DE DIRECCION. No se deriva de ningun
 * calculo y no debe presentarse como si lo fuera.
 *
 * La auditoria busco evidencia tecnica que fijara una cantidad y no la
 * encontro: el mayor historial de cualquier prueba del repositorio son 2
 * entradas, ninguna funcion del sistema consume mas de 3 turnos, y la
 * telemetria no registra identificador de conversacion, de modo que la
 * longitud real de una conversacion no es hoy reconstruible. Cuanta
 * conversacion debe poder mantenerse antes de rechazar es una decision de
 * producto, y esta es la que se ha tomado.
 *
 * `CONTEXT_WINDOW_TURNS` pertenece a la recuperacion, vale otra cosa y NO
 * se toca, ni se reutiliza, ni guarda relacion con esta cifra.
 */
export const MAX_HISTORY_TURNS = 20

/**
 * Historial: 16.000 unidades sumando el `content` de las entradas
 * admitidas.
 *
 * LIMITE OPERATIVO DE ADMISION. NO es una garantia de que el prompt final
 * quede dentro de ninguna proporcion de la ventana del proveedor, y no debe
 * presentarse como tal: el conocimiento recuperado, que es el termino
 * dominante del prompt, NO tiene cota de longitud en ninguna capa -- las
 * columnas son `text` sin restriccion y las obras se insertan desde el
 * navegador, donde `maxLength` es un atributo del formulario y no una
 * validacion. Ese crecimiento queda expresamente fuera de H1/H2 y sigue
 * siendo el P2-A ya identificado.
 *
 * Lo que esta cifra SI acota es lo que el cliente aporta como historial, y
 * con ello el peor caso de la subestimacion por tokenizacion (P2-B), que
 * antes no tenia techo alguno.
 *
 * MIDE `content`, no el texto formateado. `formatHistory` anade 9
 * caracteres de prefijo por entrada, un salto entre entradas y una
 * cabecera de seccion: con 20 entradas son 258 caracteres mas en el prompt
 * que los que esta cota cuenta.
 */
export const MAX_HISTORY_CHARACTERS = 16_000

/**
 * Mensajes de rechazo. Se construyen a partir de las cotas para que la
 * cifra exista una sola vez, y siguen el contrato de error que la ruta ya
 * usa: `{ error: <frase> }` con HTTP 400. No se introduce ningun sistema
 * de errores nuevo, ni ningun codigo publico nuevo.
 *
 * Un limite de entrada NO es un problema economico: ninguno de estos
 * mensajes es -- ni debe llegar a ser -- un `denialCode`.
 */
export const MENSAJE_DEMASIADO_LARGO = 'El mensaje es demasiado largo. Reduce el texto e inténtalo de nuevo.'

export const HISTORIAL_DEMASIADOS_TURNOS =
  `La conversación es demasiado larga (máximo ${MAX_HISTORY_TURNS} mensajes). ` +
  'Empieza una conversación nueva e inténtalo de nuevo.'

export const HISTORIAL_DEMASIADO_LARGO =
  `La conversación es demasiado larga (máximo ${MAX_HISTORY_CHARACTERS} caracteres). ` +
  'Empieza una conversación nueva e inténtalo de nuevo.'
