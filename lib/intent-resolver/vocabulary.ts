/**
 * Vocabulario CERRADO que el resolutor puede emitir.
 *
 * Cada termino de esta lista es una palabra que los motores deterministas ya
 * reconocen hoy: o es clave de dominio en `request-interpreter/domain-rules`,
 * o es sinonimo canonico en `knowledge-assets/interpret-work-query`, o es
 * termino de tipo en `interpret-organization-query`. No hay ni un termino
 * nuevo: el resolutor no amplia el vocabulario del sistema, solo traduce al
 * vocabulario que el sistema ya tiene.
 *
 * Esta lista es la frontera de validacion: cualquier palabra que el
 * proveedor devuelva y no figure aqui se descarta sin excepcion. Por eso la
 * IA no puede inventar criterios -- solo puede elegir dentro de un conjunto
 * finito y ya implementado.
 *
 * `intent-resolver.test.ts` verifica, termino a termino, que cada uno sigue
 * siendo reconocido por los motores reales. Si alguno dejara de serlo, la
 * suite falla: la lista no puede desincronizarse en silencio.
 */
/**
 * Terminos que designan el DOMINIO de la peticion (de que se habla).
 *
 * Los de Personas y los tres ultimos de Organizaciones se incorporaron en
 * el Bloque A2 para reparar una desincronizacion real: los motores ya los
 * reconocian y la frontera no permitia emitirlos, de modo que el proveedor
 * traducia bien y el parser lo descartaba. Caso medido: ante "¿quien dirige
 * obras en Ciudad de Mexico?" el modelo devolvia "director :: dirige" y
 * `parseResolvedTerms` lo tiraba, dejando solo "obra" -- el usuario pedia
 * una persona y el sistema buscaba obras.
 *
 * Ninguno es vocabulario nuevo para el sistema: todos activan hoy su
 * dominio en `detectKnowledgeDomains`, y `director`, `dramaturgo` y
 * `profesional` son ademas valores canonicos de `tipo_perfil` que
 * `interpretPersonQuery` ya resuelve. `productora`, `escuela` e
 * `institucion` son los `tipo_perfil` organizativos que reconoce
 * `profile-classification`.
 */
export const DOMAIN_TERMS: readonly string[] = [
  'obra',
  'compania',
  'teatro',
  'festival',
  'actor',
  'casting',
  'convocatoria',
  'director',
  'dramaturgo',
  'profesional',
  'perfil',
  'productora',
  'escuela',
  'institucion',
]

/** Terminos que designan un CRITERIO sobre ese dominio (como debe ser). */
export const CONCEPT_TERMS: readonly string[] = [
  // Conceptos de Obras (knowledge-assets/interpret-work-query.ts)
  'comedia',
  'musical',
  'infantil',
  'clasico',
  'contemporaneo',
  'corta',
  'larga',
  'pocos actores',

  // Tipos de Organizacion (knowledge-assets/interpret-organization-query.ts)
  'editorial',
  'universidad',
  'fundacion',
  'plataforma',
  // Unico tipo del motor que no tenia ningun termino emitible: sin el,
  // `cultural_org` era inalcanzable para el resolutor.
  'organizacion cultural',
]

export const RESOLVABLE_TERMS: readonly string[] = [...DOMAIN_TERMS, ...CONCEPT_TERMS]

/**
 * Compone el texto que se reinterpretara, anadiendo los terminos resueltos
 * al final de la peticion literal del usuario -- que nunca se altera.
 *
 * Los criterios se introducen con la preposicion "para" para que la regla
 * gramatical de nucleo/complemento de `detectKnowledgeDomains` los lea como
 * lo que son: complementos del dominio, no peticiones propias. Sin ella,
 * anadir "pocos actores" activaria el dominio Personas, exactamente el
 * falso positivo que esa regla existe para evitar. Se reutiliza la
 * gramatica que ya rige la interpretacion, en vez de trabajar contra ella.
 */
export function composeAugmentedRequest(originalRequest: string, resolvedTerms: readonly string[]): string {
  const dominios = resolvedTerms.filter((term) => DOMAIN_TERMS.includes(term))
  const conceptos = resolvedTerms.filter((term) => CONCEPT_TERMS.includes(term))

  // Sin dominio resuelto no se anade ningun criterio: un criterio no tiene
  // sobre que aplicarse, y anadirlo suelto activaria un dominio ajeno --
  // "pocos actores" sin nucleo previo abre Personas, justo el falso
  // positivo que la regla gramatical existe para evitar. Preferimos no
  // reconocer nada antes que reconocer un dominio equivocado.
  if (dominios.length === 0) return originalRequest

  const partes = [originalRequest, ...dominios]
  if (conceptos.length > 0) partes.push(`para ${conceptos.join(' ')}`)

  return partes.join(' ')
}

/**
 * Instruccion de sistema del resolutor. Su unica tarea es traducir, no
 * responder ni razonar: se le prohibe explicitamente inventar terminos,
 * emitir cifras y devolver texto libre. La ausencia de coincidencia es una
 * respuesta valida y esperada -- preferimos no reconocer nada a reconocer
 * mal (regla 3 de Direccion: ante ambiguedad real, no inventar).
 *
 * Bloque A1: hasta aqui las reglas y los ejemplos hablaban unicamente de
 * obras, y el resolutor era sordo a las referencias humanas indefinidas
 * ("alguien", "gente", "personas"): medido con el proveedor real, "necesito
 * personas para el reparto" no producia ningun termino de persona. Se anade
 * la regla simetrica de la de "obra" -- generico primero, oficio concreto si
 * el usuario lo expresa -- y, con el mismo peso, su contencion.
 *
 * La contencion importa tanto como el reconocimiento: esas palabras designan
 * a quien se busca solo a veces. En "una obra con mucha gente en escena"
 * describen el tamano del reparto, y el proveedor llego a traducirlas como
 * "pocos actores" -- justo el significado contrario. Por eso la regla no
 * asocia palabra con dominio, sino funcion de la palabra dentro de la frase:
 * lo que decide es si designan a quien se busca, no que aparezcan.
 *
 * Ningun termino nuevo entra en el vocabulario: "perfil", "director",
 * "dramaturgo" y "actor" ya eran emitibles desde A2. Lo que cambia es que el
 * resolutor sabe cuando le corresponde usarlos.
 */
export const RESOLVER_INSTRUCTIONS = [
  'Eres un traductor de vocabulario de un catalogo teatral, no un asistente.',
  'Recibes la peticion de un usuario y una lista cerrada de terminos internos.',
  'Devuelves EXCLUSIVAMENTE los terminos de esa lista cuyo significado el usuario haya expresado.',
  '',
  'Reglas:',
  '- "obra" es el termino generico de una pieza teatral: incluyelo siempre que el usuario busque una pieza, un texto, un montaje o algo que representar, aunque use otras palabras.',
  '- "perfil" es el termino generico de una persona del ecosistema: incluyelo cuando el usuario busque a alguien, gente o personas para participar en algo teatral, aunque no diga su oficio. Si ademas expresa el oficio (dirigir, escribir, interpretar), incluye tambien el termino concreto.',
  '- Pero "alguien", "gente" y "personas" solo piden personas cuando designan a QUIEN se busca. Si dicen a quien va dirigido algo, no incluyas nada por ellas. Y si describen el tamano del reparto de una pieza, no son personas sino un rasgo de la obra: ahi corresponde "pocos actores", y solo cuando el reparto sea pequeno.',
  '- Incluye un termino de criterio SOLO si el usuario lo ha pedido. No anadas terminos tipicos, relacionados ni probables.',
  '- Nunca inventes terminos fuera de la lista. Nunca devuelvas numeros, duraciones ni cantidades.',
  '- Si la peticion no tiene relacion con ninguno de los terminos, responde exactamente: NINGUNO.',
  '',
  '- Cada termino debe ir acompanado del fragmento LITERAL de la peticion que lo justifica, copiado tal cual.',
  '',
  'Formato: una linea por termino, con la forma  termino :: fragmento literal',
  '',
  'Ejemplos:',
  'Peticion: "quiero una pieza que dure poco"',
  'obra :: pieza',
  'corta :: dure poco',
  '',
  'Peticion: "busco textos de Lorca"',
  'obra :: textos',
  '',
  'Peticion: "algo que podamos montar entre tres o cuatro"',
  'obra :: montar',
  'pocos actores :: entre tres o cuatro',
  '',
  'Peticion: "necesito personas para el reparto"',
  'perfil :: personas',
  '',
  'Peticion: "una obra con mucha gente en escena"',
  'obra :: obra',
  '',
  'Peticion: "tienes algo interesante?"',
  'NINGUNO',
].join('\n')

/** Longitud maxima del fragmento justificante, en palabras. */
const MAX_ANCHOR_WORDS = 6

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Prompt completo del resolutor. Funcion pura y determinista: misma
 * peticion, mismo prompt. No accede a persistencia ni a variables de
 * entorno.
 */
export function buildResolverPrompt(originalRequest: string): string {
  return [
    RESOLVER_INSTRUCTIONS,
    `Lista cerrada de terminos: ${RESOLVABLE_TERMS.join(', ')}`,
    `Peticion del usuario: ${originalRequest}`,
  ].join('\n\n')
}

/**
 * Valida la respuesta del proveedor contra el vocabulario cerrado.
 *
 * Nunca confia en la salida del modelo: normaliza, trocea y conserva
 * unicamente los terminos que figuran literalmente en `RESOLVABLE_TERMS`.
 * Todo lo demas -- explicaciones, terminos inventados, cifras, texto libre
 * -- se descarta. Devolver una lista vacia es un resultado correcto.
 */
export function parseResolvedTerms(rawContent: string | null, originalRequest: string): string[] {
  if (rawContent === null) return []

  const peticion = normalizarTexto(originalRequest)
  if (peticion.length === 0) return []

  const aceptados = new Set<string>()

  for (const linea of rawContent.split('\n')) {
    const [ladoTermino, ladoAncla] = linea.split('::')
    if (ladoAncla === undefined) continue

    const termino = RESOLVABLE_TERMS.find((term) =>
      new RegExp(`(^|[^a-z])${term}([^a-z]|$)`).test(normalizarTexto(ladoTermino))
    )
    if (termino === undefined) continue

    const ancla = normalizarTexto(ladoAncla)
    if (ancla.length === 0) continue

    // El ancla debe ser un fragmento acotado, no la peticion entera: citar
    // toda la frase no justifica nada.
    if (ancla.split(' ').length > MAX_ANCHOR_WORDS) continue
    if (ancla === peticion) continue

    // Y debe aparecer LITERALMENTE en lo que el usuario escribio.
    if (!peticion.includes(ancla)) continue

    aceptados.add(termino)
  }

  return RESOLVABLE_TERMS.filter((term) => aceptados.has(term))
}

/**
 * Decide si merece la pena consultar al proveedor.
 *
 * Distingue las dos situaciones que el contrato actual no separa por si
 * solo en el dominio Obras:
 *
 *   A) El usuario no pidio ningun criterio ("¿que obras tienes?"). Una vez
 *      retirados el vocabulario que los motores ya consumen y las palabras
 *      gramaticales, no queda contenido: no hay nada que traducir y no se
 *      consulta al proveedor.
 *   B) El usuario expreso algo que el determinista no supo mapear ("¿que
 *      obras que duren poco tienes?"). Queda contenido sin consumir: ahi si
 *      tiene sentido traducir.
 *
 * Es una decision de COSTE, nunca de significado: lo unico que determina es
 * si se gasta una llamada. Jamas produce, altera ni descarta un criterio.
 */
export function mayNeedResolution(originalRequest: string): boolean {
  const palabras = normalizarTexto(originalRequest).split(' ').filter((palabra) => palabra.length > 0)

  return palabras.some(
    (palabra) =>
      !FUNCTION_WORDS.has(palabra) &&
      !RESOLVABLE_TERMS.some((term) => term.split(' ').includes(palabra)) &&
      !ALREADY_UNDERSTOOD.has(palabra)
  )
}

/**
 * Palabras gramaticales del castellano: no aportan criterio por si mismas.
 * Lista cerrada y deliberadamente corta -- no es un diccionario, solo el
 * armazon funcional de una pregunta.
 */
const FUNCTION_WORDS = new Set([
  'que', 'cual', 'cuales', 'quien', 'como', 'donde', 'cuando', 'cuanto', 'cuantos',
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'al', 'del',
  'de', 'en', 'con', 'sin', 'por', 'para', 'sobre', 'entre', 'a', 'y', 'o', 'u',
  'me', 'te', 'se', 'nos', 'mi', 'tu', 'su', 'mis', 'tus', 'sus',
  'hay', 'tienes', 'teneis', 'tiene', 'tengo', 'busco', 'buscas', 'quiero', 'necesito',
  'es', 'son', 'esta', 'estan', 'ser', 'estar', 'hacer', 'dar',
  'alguna', 'algun', 'alguno', 'algunas', 'algunos', 'algo', 'todo', 'toda', 'todos', 'todas',
  'disponible', 'disponibles', 'ahora', 'aqui', 'ahi', 'mas', 'menos', 'muy', 'tambien',
  'porfavor', 'favor', 'gracias', 'hola', 'si', 'no', 'ver', 'dime', 'ensename',
])

/**
 * Vocabulario que los motores deterministas YA consumen directamente: si la
 * peticion solo contiene esto, el determinista ya la ha entendido por
 * completo y consultar al proveedor no anadiria nada.
 */
const ALREADY_UNDERSTOOD = new Set([
  'obras', 'companias', 'teatros', 'festivales', 'actores', 'castings', 'convocatorias',
  'comedias', 'musicales', 'infantiles', 'clasicos', 'clasicas', 'contemporaneas', 'contemporaneos',
  'cortas', 'largas', 'breve', 'breves', 'humoristica', 'divertida', 'divertidas', 'actual', 'moderna',
  'editoriales', 'universidades', 'fundaciones', 'plataformas', 'ninos',
])
