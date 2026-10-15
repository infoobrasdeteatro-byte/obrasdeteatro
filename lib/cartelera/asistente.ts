/**
 * Asistente «Nuevo espectáculo»: lo que el usuario rellena en los pasos
 * (sin guardar nada hasta el final) y cómo se convierte en las filas de
 * funciones, opciones de compra y ficha artística. Puro: lo prueban los tests.
 */
import {
  ROLES, aFilaOpcion, fechasRepetidas, localAUtc, separarNombres, validarEspectaculo, validarFuncion, validarOpcion,
  zonaPorDefecto, MAX_FUNCIONES_DE_UNA_VEZ, CAMPOS_VACIOS, type CamposEspectaculo, type CamposOpcion,
} from './cartelera'

export type FechaAsistente = { clave: string; fecha: string; hora: string; minuto: string; cantidad: string; cadaDias: number }

export type LugarAsistente = {
  clave: string
  pais: string
  zona: string
  otroLugar: boolean
  sala: { id: string; nombre: string; municipio: string; region: string; pais_code: string } | null
  lugar: string
  ciudad: string
  nota: string
  fechas: FechaAsistente[]
}

export type OpcionAsistente = CamposOpcion & { clave: string; taquilla: boolean }
export type PapelAsistente = { clave: string; rol: string; nombres: string }

export type EstadoAsistente = {
  paso: number
  datos: CamposEspectaculo
  lugares: LugarAsistente[]
  opciones: OpcionAsistente[]
  equipo: PapelAsistente[]
}

let contador = 0
export const nuevaClave = () => `k${Date.now().toString(36)}${(contador++).toString(36)}`

export const fechaVacia = (base?: Partial<FechaAsistente>): FechaAsistente =>
  ({ clave: nuevaClave(), fecha: '', hora: '20', minuto: '00', cantidad: '1', cadaDias: 1, ...base })

export function lugarVacio(pais = 'ES'): LugarAsistente {
  return { clave: nuevaClave(), pais, zona: zonaPorDefecto(pais), otroLugar: false, sala: null, lugar: '', ciudad: '', nota: '', fechas: [fechaVacia()] }
}

export const opcionVacia = (moneda = 'EUR'): OpcionAsistente =>
  ({ clave: nuevaClave(), tipo: 'venta', url: '', precio_desde: '', moneda, etiqueta: '', funcion_id: '', taquilla: false })

export const papelVacio = (rol = 'direccion'): PapelAsistente => ({ clave: nuevaClave(), rol, nombres: '' })

/** Papeles que salen ya puestos en el paso 4 (se pueden quitar o añadir más). */
export const PAPELES_INICIALES = ['direccion', 'reparto', 'dramaturgia', 'produccion']

export function estadoInicial(): EstadoAsistente {
  return {
    paso: 1,
    datos: { ...CAMPOS_VACIOS },
    lugares: [lugarVacio()],
    opciones: [opcionVacia()],
    equipo: PAPELES_INICIALES.map(r => papelVacio(r)),
  }
}

export const PASOS = ['El espectáculo', 'Funciones', 'Entradas', 'Ficha y resumen'] as const

// ── Funciones ─────────────────────────────────────────────────────────────

/** Una fecha está «en blanco» si no se ha tocado: se ignora (no es un error). */
const fechaEnBlanco = (f: FechaAsistente) => !f.fecha
const lugarEnBlanco = (l: LugarAsistente) => !l.sala && !l.lugar.trim() && !l.ciudad.trim() && l.fechas.every(fechaEnBlanco)

export type FilaFuncion = {
  inicio: string
  zona_horaria: string
  espacio_id: string | null
  lugar_nombre: string | null
  ciudad: string | null
  pais_code: string | null
  nota: string | null
}

/**
 * Funciones a crear a partir de los lugares y sus fechas. Devuelve el primer
 * problema con su posición («Sala 2, fecha 1: …») para llevar al usuario allí.
 */
export function funcionesDelAsistente(lugares: LugarAsistente[], ahora: number = Date.now()):
  { filas: FilaFuncion[]; error: string | null; donde: string | null } {
  const filas: FilaFuncion[] = []
  const usados = lugares.filter(l => !lugarEnBlanco(l))
  for (const [i, l] of usados.entries()) {
    const nombreLugar = usados.length > 1 ? `Lugar ${i + 1}` : 'Lugar'
    if (!l.otroLugar && !l.sala) return { filas: [], error: `${nombreLugar}: busca y elige la sala, o marca «Otro lugar».`, donde: l.clave }
    if (l.otroLugar && l.lugar.trim().length < 2) return { filas: [], error: `${nombreLugar}: escribe el nombre del lugar.`, donde: l.clave }
    if (l.otroLugar && !l.ciudad.trim()) return { filas: [], error: `${nombreLugar}: escribe la ciudad.`, donde: l.clave }
    const fechas = l.fechas.filter(f => !fechaEnBlanco(f))
    if (fechas.length === 0) return { filas: [], error: `${nombreLugar}: indica al menos un día.`, donde: l.clave }
    for (const [j, f] of fechas.entries()) {
      const etiqueta = `${nombreLugar}, fecha ${j + 1}`
      const n = Number(f.cantidad)
      if (!Number.isInteger(n) || n < 1 || n > MAX_FUNCIONES_DE_UNA_VEZ) {
        return { filas: [], error: `${etiqueta}: el número de funciones va de 1 a ${MAX_FUNCIONES_DE_UNA_VEZ}.`, donde: f.clave }
      }
      const dias = fechasRepetidas(f.fecha, n, f.cadaDias)
      if (dias.length === 0) return { filas: [], error: `${etiqueta}: la fecha no es válida.`, donde: f.clave }
      for (const d of dias) {
        const campos = {
          inicio: `${d}T${f.hora}:${f.minuto}`, zona_horaria: l.zona, espacio_id: l.otroLugar ? null : l.sala!.id,
          lugar_nombre: l.lugar, ciudad: l.ciudad, pais_code: l.pais, nota: l.nota,
        }
        const problema = validarFuncion(campos, ahora)
        if (problema) return { filas: [], error: `${etiqueta} (${d}): ${problema}`, donde: f.clave }
        filas.push({
          inicio: localAUtc(campos.inicio, campos.zona_horaria)!,
          zona_horaria: campos.zona_horaria,
          espacio_id: campos.espacio_id,
          lugar_nombre: campos.espacio_id ? null : campos.lugar_nombre.trim(),
          ciudad: campos.espacio_id ? null : campos.ciudad.trim(),
          pais_code: campos.espacio_id ? null : campos.pais_code,
          nota: campos.nota.trim() || null,
        })
      }
    }
  }
  // La misma función dos veces (mismo sitio y hora) no tiene sentido.
  const vistas = new Set<string>()
  for (const f of filas) {
    const k = `${f.inicio}|${f.espacio_id ?? f.lugar_nombre}`
    if (vistas.has(k)) return { filas: [], error: 'Hay dos funciones repetidas en el mismo lugar, día y hora.', donde: null }
    vistas.add(k)
  }
  return { filas: filas.sort((a, b) => a.inicio.localeCompare(b.inicio)), error: null, donde: null }
}

// ── Entradas y equipo ─────────────────────────────────────────────────────

const opcionEnBlanco = (o: OpcionAsistente) => !o.url.trim() && !o.precio_desde.trim() && !o.etiqueta.trim() && o.tipo === 'venta'

export function opcionesDelAsistente(opciones: OpcionAsistente[]):
  { filas: ReturnType<typeof aFilaOpcion>[]; error: string | null; donde: string | null } {
  const filas: ReturnType<typeof aFilaOpcion>[] = []
  const usadas = opciones.filter(o => !opcionEnBlanco(o))
  for (const [i, o] of usadas.entries()) {
    const problema = validarOpcion(o)
    if (problema) return { filas: [], error: usadas.length > 1 ? `Opción ${i + 1}: ${problema}` : problema, donde: o.clave }
    filas.push(aFilaOpcion({ ...o, funcion_id: '' }))
    if (o.taquilla && (o.tipo === 'venta' || o.tipo === 'reserva')) {
      filas.push(aFilaOpcion({ ...o, tipo: 'taquilla', url: '', etiqueta: '', funcion_id: '' }))
    }
  }
  // Una sola fila de taquilla aunque se marque en varias opciones.
  const sinDuplicar = filas.filter((f, i) => f.tipo !== 'taquilla' || filas.findIndex(x => x.tipo === 'taquilla') === i)
  return { filas: sinDuplicar, error: null, donde: null }
}

export function equipoDelAsistente(equipo: PapelAsistente[]):
  { filas: { nombre: string; rol: string; orden: number }[]; error: string | null; donde: string | null } {
  const filas: { nombre: string; rol: string; orden: number }[] = []
  for (const p of equipo) {
    const nombres = separarNombres(p.nombres)
    if (nombres.length === 0) continue
    if (!ROLES.some(r => r.value === p.rol)) return { filas: [], error: 'Elige el papel.', donde: p.clave }
    const largo = nombres.find(n => n.length < 2 || n.length > 120)
    if (largo) return { filas: [], error: `«${largo.slice(0, 30)}»: cada nombre debe tener de 2 a 120 caracteres.`, donde: p.clave }
    for (const nombre of nombres) filas.push({ nombre, rol: p.rol, orden: (filas.length + 1) * 10 })
  }
  return { filas, error: null, donde: null }
}

/** Qué falta para poder pasar de un paso al siguiente (null = se puede). */
export function problemaDelPaso(paso: number, e: EstadoAsistente, ahora: number = Date.now()): { error: string; donde: string | null } | null {
  if (paso === 1) {
    const p = validarEspectaculo(e.datos)
    return p ? { error: p, donde: 'datos' } : null
  }
  if (paso === 2) {
    const r = funcionesDelAsistente(e.lugares, ahora)
    if (r.error) return { error: r.error, donde: r.donde }
    if (r.filas.length === 0) return { error: 'Añade al menos una función: elige la sala o el lugar, el día y la hora.', donde: e.lugares[0]?.clave ?? null }
    return null
  }
  if (paso === 3) {
    const r = opcionesDelAsistente(e.opciones)
    return r.error ? { error: r.error, donde: r.donde } : null
  }
  if (paso === 4) {
    const r = equipoDelAsistente(e.equipo)
    return r.error ? { error: r.error, donde: r.donde } : null
  }
  return null
}

/** Lo guardado en el navegador vuelve como estaba (sin el archivo del cartel, que no se puede guardar). */
export function leerBorradorLocal(texto: string | null): EstadoAsistente | null {
  if (!texto) return null
  try {
    const e = JSON.parse(texto) as EstadoAsistente
    if (!e || typeof e !== 'object' || !e.datos || !Array.isArray(e.lugares) || !Array.isArray(e.opciones) || !Array.isArray(e.equipo)) return null
    return { ...e, paso: Math.min(Math.max(Number(e.paso) || 1, 1), PASOS.length) }
  } catch {
    return null
  }
}

/** ¿Hay algo escrito que merezca la pena recuperar? */
export const tieneContenido = (e: EstadoAsistente) =>
  Boolean(e.datos.titulo.trim() || e.datos.sinopsis.trim() || e.lugares.some(l => !lugarEnBlanco(l)))
