/**
 * Funcion que una entidad desempena dentro del ecosistema teatral --
 * segundo eje del modelo Dominio x Funcion ratificado por Direccion.
 *
 * Union CERRADA: cada valor esta respaldado por una columna real del
 * esquema, citada en la regla de derivacion correspondiente. Crecer
 * significa anadir un valor con su respaldo, nunca un dominio nuevo: una
 * costurera sera `Personas x vestuario`, no un dominio "Vestuario".
 *
 * Quedan deliberadamente FUERA `vestuario`, `escenografia`, `iluminacion`,
 * `sonido`, `maquillaje` y `caracterizacion`: ninguna columna del esquema
 * las respalda hoy (`grep` sobre todas las migraciones -> 0 resultados).
 * Declararlas seria un valor magico sin estado de dominio detras (PRD-001).
 * Entraran cuando exista la estructura que las sostenga.
 */
export type TheatricalFunction =
  | 'interpretacion'
  | 'direccion'
  | 'dramaturgia'
  | 'produccion'
  | 'distribucion'
  | 'formacion'
  | 'gestion_cultural'
  | 'programacion'
  | 'sala'

/**
 * Orden canonico de salida. Toda derivacion emite las funciones en este
 * orden, nunca en el de evaluacion: resultado estable y comparable.
 */
const CANONICAL_ORDER: readonly TheatricalFunction[] = [
  'interpretacion',
  'direccion',
  'dramaturgia',
  'produccion',
  'distribucion',
  'formacion',
  'gestion_cultural',
  'programacion',
  'sala',
]

function order(functions: Iterable<TheatricalFunction>): TheatricalFunction[] {
  const presentes = new Set(functions)
  return CANONICAL_ORDER.filter((funcion) => presentes.has(funcion))
}

/**
 * REGLA DE SELECTIVIDAD (Direccion): genero, especialidad y caracteristica
 * NO son funcion.
 *
 * `perfil_dramaturgo.esp_comedia`, `perfil_director.esp_clasico`,
 * `perfil_compania.tipo_musical` o `perfil_festival.tipo_infantil` describen
 * QUE hace la entidad, no QUE PAPEL desempena: son criterios del dominio
 * Obras, no funciones. Ninguna familia `esp_*` ni `tipo_*` de genero se
 * deriva aqui. La derivacion es explicita columna a columna, jamas
 * automatica por prefijo.
 */

/** perfil_actor: la existencia del perfil ya declara la funcion. */
export function deriveActorFunctions(): TheatricalFunction[] {
  return order(['interpretacion'])
}

/** perfil_director: la existencia del perfil declara direccion; `disp_formacion` anade formacion. */
export function deriveDirectorFunctions(perfil: { disp_formacion?: boolean | null } = {}): TheatricalFunction[] {
  const funciones: TheatricalFunction[] = ['direccion']
  if (perfil.disp_formacion === true) funciones.push('formacion')
  return order(funciones)
}

/** perfil_dramaturgo: la existencia del perfil declara dramaturgia. Sus `esp_*` son generos, no funciones. */
export function deriveDramaturgoFunctions(): TheatricalFunction[] {
  return order(['dramaturgia'])
}

/**
 * perfil_escuela: la existencia del perfil declara formacion. Las columnas
 * `form_produccion` y `form_gestion_cultural` declaran ademas que la escuela
 * forma en esas funciones -- el resto de `form_*` (musical, danza, voz...)
 * son materias, no funciones del ecosistema.
 */
export function deriveEscuelaFunctions(
  perfil: { form_produccion?: boolean | null; form_gestion_cultural?: boolean | null } = {}
): TheatricalFunction[] {
  const funciones: TheatricalFunction[] = ['formacion']
  if (perfil.form_produccion === true) funciones.push('produccion')
  if (perfil.form_gestion_cultural === true) funciones.push('gestion_cultural')
  return order(funciones)
}

/**
 * perfil_compania: la familia `serv_*` declara servicios reales que si son
 * funciones. La familia `tipo_*` (clasico, musical, infantil...) es genero y
 * queda excluida por la regla de selectividad.
 */
export function deriveCompaniaFunctions(
  perfil: { serv_contratacion?: boolean | null; serv_formacion?: boolean | null } = {}
): TheatricalFunction[] {
  const funciones: TheatricalFunction[] = []
  if (perfil.serv_contratacion === true) funciones.push('produccion')
  if (perfil.serv_formacion === true) funciones.push('formacion')
  return order(funciones)
}

/**
 * perfil_productora: unica tabla que declara `tipo_distribucion` y
 * `tipo_gestion_cultural` de forma explicita. `tipo_teatral` declara
 * produccion teatral. `tipo_audiovisual`, `tipo_musical` y `tipo_eventos`
 * describen sector, no funcion del ecosistema teatral: excluidas.
 */
export function deriveProductoraFunctions(
  perfil: {
    tipo_teatral?: boolean | null
    tipo_distribucion?: boolean | null
    tipo_gestion_cultural?: boolean | null
  } = {}
): TheatricalFunction[] {
  const funciones: TheatricalFunction[] = []
  if (perfil.tipo_teatral === true) funciones.push('produccion')
  if (perfil.tipo_distribucion === true) funciones.push('distribucion')
  if (perfil.tipo_gestion_cultural === true) funciones.push('gestion_cultural')
  return order(funciones)
}

/**
 * perfil_teatro: un teatro programa. `disponible_alquiler` y
 * `disponible_ensayos` declaran ademas que cede su espacio -- funcion
 * `sala`, distinta de programar.
 */
export function deriveTeatroFunctions(
  perfil: { disponible_alquiler?: boolean | null; disponible_ensayos?: boolean | null } = {}
): TheatricalFunction[] {
  const funciones: TheatricalFunction[] = ['programacion']
  if (perfil.disponible_alquiler === true || perfil.disponible_ensayos === true) funciones.push('sala')
  return order(funciones)
}

/**
 * perfil_festival: un festival programa. `ofrece_residencias` no es una
 * funcion de las nueve autorizadas y no se deriva. Sus `tipo_*` son genero.
 */
export function deriveFestivalFunctions(): TheatricalFunction[] {
  return order(['programacion'])
}

/**
 * Funciones que el `type` declarado de una institucion implica de forma
 * INEQUIVOCA. Solo se mapea lo que el valor entrana por si mismo:
 *
 *   university -> formacion    (una universidad forma)
 *   festival   -> programacion (un festival programa)
 *   theater    -> sala         (un teatro es un espacio escenico)
 *
 * `company`, `editorial`, `platform`, `cultural_org`, `foundation` y `other`
 * NO se mapean: su funcion no se deduce del tipo sin suponer. Ante la duda,
 * ninguna funcion antes que una funcion equivocada.
 */
const INSTITUTION_TYPE_FUNCTIONS: Readonly<Record<string, TheatricalFunction>> = {
  university: 'formacion',
  festival: 'programacion',
  theater: 'sala',
}

export function deriveInstitutionFunctions(type: string): TheatricalFunction[] {
  const funcion = INSTITUTION_TYPE_FUNCTIONS[type]
  return funcion === undefined ? [] : order([funcion])
}

/**
 * Funciones que el `tipo_perfil` declarado de un perfil implica de forma
 * INEQUIVOCA. Solo se mapea lo que el valor entrana por si mismo, igual que
 * en `deriveInstitutionFunctions`:
 *
 *   actor      -> interpretacion
 *   director   -> direccion
 *   dramaturgo -> dramaturgia
 *   productora -> produccion
 *   compania   -> produccion
 *   escuela    -> formacion
 *   teatro     -> programacion
 *   festival   -> programacion
 *
 * `profesional`, `institucion` y `publico` NO se mapean: su funcion no se
 * deduce del tipo sin suponer. Un perfil `profesional` puede ser costurera,
 * escenografo o iluminador -- exactamente el caso que hoy no tiene
 * estructura. Devolver `[]` es la respuesta correcta, no una carencia.
 *
 * La funcion NUNCA se infiere de la biografia ni de la descripcion: esta
 * derivacion solo lee una columna enumerada.
 */
const PROFILE_TYPE_FUNCTIONS: Readonly<Record<string, TheatricalFunction>> = {
  actor: 'interpretacion',
  director: 'direccion',
  dramaturgo: 'dramaturgia',
  productora: 'produccion',
  compania: 'produccion',
  escuela: 'formacion',
  teatro: 'programacion',
  festival: 'programacion',
}

export function derivePersonFunctions(profileType: string): TheatricalFunction[] {
  const funcion = PROFILE_TYPE_FUNCTIONS[profileType]
  return funcion === undefined ? [] : order([funcion])
}
