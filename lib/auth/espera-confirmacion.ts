/**
 * Pestaña del registro esperando la confirmación del correo.
 *
 * Mecanismo: la pestaña vuelve a intentar el inicio de sesión normal con el
 * correo y la contraseña que se acaban de escribir. Mientras el correo no
 * está confirmado, Supabase responde «email_not_confirmed»; en cuanto se
 * confirma (en cualquier aparato), el intento abre sesión y la pestaña entra.
 *
 * Por qué así: no añade ningún endpoint ni token nuevo, usa la misma puerta
 * que el formulario de login, y no revela nada a terceros (sin la contraseña
 * correcta la respuesta es la de siempre, «correo o contraseña incorrectos»).
 * La contraseña vive solo en la memoria de la pestaña (nunca en
 * localStorage, sessionStorage ni cookies) y se descarta al terminar.
 *
 * Ritmo: cada 15 s los primeros 3 minutos y cada 30 s después; se pausa con
 * la pestaña oculta y comprueba al volver a ella; se detiene a los 15
 * minutos. Ante un límite de peticiones, espera el doble cada vez.
 */

export const ESPERA = {
  intervaloInicialMs: 15_000,
  primeraFaseMs: 3 * 60_000,
  intervaloLargoMs: 30_000,
  maximoFrenadoMs: 2 * 60_000,
  minimoEntreIntentosMs: 10_000,
  limiteMs: 15 * 60_000,
} as const

export type ResultadoIntento = 'entrar' | 'esperar' | 'frenar' | 'parar'
export type EstadoEspera = 'esperando' | 'pausada' | 'agotada' | 'detenida' | 'entrando'

/** Traduce la respuesta de signInWithPassword. */
export function clasificarIntento(error: { code?: string; message?: string; status?: number } | null | undefined): ResultadoIntento {
  if (!error) return 'entrar'
  const texto = `${error.code ?? ''} ${error.message ?? ''}`
  if (error.code === 'email_not_confirmed' || /email not confirmed/i.test(texto)) return 'esperar'
  if (error.status === 429 || /rate.?limit|too many|security purposes/i.test(texto)) return 'frenar'
  return 'parar'
}

/** Espera hasta el siguiente intento automático. */
export function intervaloEspera(transcurridoMs: number, frenadas: number): number {
  const base = transcurridoMs < ESPERA.primeraFaseMs ? ESPERA.intervaloInicialMs : ESPERA.intervaloLargoMs
  return Math.min(base * 2 ** frenadas, Math.max(base, ESPERA.maximoFrenadoMs))
}

export interface DependenciasEspera {
  intentar: () => Promise<ResultadoIntento>
  visible: () => boolean
  ahora: () => number
  programar: (fn: () => void, ms: number) => () => void
  alCambiarVisibilidad: (fn: () => void) => () => void
  alEstado: (estado: EstadoEspera) => void
  alEntrar: () => void
}

export interface EsperaConfirmacion {
  iniciar: () => void
  /** Botón «Ya he confirmado, entrar»: un intento inmediato (también tras el límite). */
  comprobarAhora: () => Promise<ResultadoIntento | 'ocupado'>
  detener: () => void
}

export function crearEsperaConfirmacion(dep: DependenciasEspera): EsperaConfirmacion {
  let inicio = 0
  let ultimo = -Infinity
  let frenadas = 0
  let enCurso = false
  let terminado = false
  let estado: EstadoEspera | null = null
  let cancelar: (() => void) | null = null
  let quitarVisibilidad: (() => void) | null = null

  const poner = (e: EstadoEspera) => {
    if (estado !== e) { estado = e; dep.alEstado(e) }
  }
  const limpiarTimer = () => { cancelar?.(); cancelar = null }
  const terminar = (e: EstadoEspera) => {
    terminado = true
    limpiarTimer()
    quitarVisibilidad?.(); quitarVisibilidad = null
    poner(e)
  }
  const agotado = () => dep.ahora() - inicio >= ESPERA.limiteMs

  const programar = (ms: number) => {
    limpiarTimer()
    cancelar = dep.programar(() => { cancelar = null; void ciclo() }, ms)
  }

  const aplicar = (r: ResultadoIntento) => {
    if (r === 'entrar') { terminar('entrando'); dep.alEntrar(); return }
    if (r === 'parar') { terminar('detenida'); return }
    if (r === 'frenar') frenadas++
  }

  async function ciclo() {
    if (terminado || enCurso) return
    if (agotado()) { terminar('agotada'); return }
    if (!dep.visible()) { poner('pausada'); return }
    poner('esperando')
    enCurso = true
    ultimo = dep.ahora()
    let r: ResultadoIntento
    try { r = await dep.intentar() } catch { r = 'esperar' }
    enCurso = false
    if (terminado) return
    aplicar(r)
    if (terminado) return
    if (agotado()) { terminar('agotada'); return }
    if (!dep.visible()) { poner('pausada'); return }
    programar(intervaloEspera(dep.ahora() - inicio, frenadas))
  }

  const alVisibilidad = () => {
    if (terminado) return
    if (!dep.visible()) { limpiarTimer(); poner('pausada'); return }
    // Al volver a la pestaña (p. ej. tras confirmar en el móvil), se
    // comprueba enseguida, respetando el mínimo entre intentos.
    const falta = Math.max(0, ESPERA.minimoEntreIntentosMs - (dep.ahora() - ultimo))
    poner('esperando')
    programar(falta)
  }

  return {
    iniciar() {
      if (quitarVisibilidad || terminado) return
      inicio = dep.ahora()
      quitarVisibilidad = dep.alCambiarVisibilidad(alVisibilidad)
      // El primer intento, tras el primer intervalo: nadie confirma en 0 s.
      if (dep.visible()) { poner('esperando'); programar(ESPERA.intervaloInicialMs) } else poner('pausada')
    },
    async comprobarAhora() {
      if (enCurso || estado === 'entrando') return 'ocupado'
      enCurso = true
      ultimo = dep.ahora()
      let r: ResultadoIntento
      try { r = await dep.intentar() } catch { r = 'esperar' }
      enCurso = false
      aplicar(r)
      return r
    },
    detener() { terminar(estado === 'entrando' ? 'entrando' : 'detenida') },
  }
}

/** A dónde va la pestaña al entrar: el mismo destino que el enlace del correo. */
export function urlEntrada(next: string | null): string {
  return next ? `/auth/confirm?next=${encodeURIComponent(next)}` : '/auth/confirm'
}
