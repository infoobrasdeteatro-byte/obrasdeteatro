import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ESPERA, clasificarIntento, crearEsperaConfirmacion, intervaloEspera, urlEntrada,
  type EstadoEspera, type ResultadoIntento,
} from '../espera-confirmacion'

/** Pestaña del registro: espera la confirmación hecha en cualquier aparato. */
function montar(respuestas: (() => ResultadoIntento) | ResultadoIntento[]) {
  let visible = true
  const oyentes = new Set<() => void>()
  const estados: EstadoEspera[] = []
  const intentar = vi.fn(async () => {
    if (typeof respuestas === 'function') return respuestas()
    return respuestas.shift() ?? 'esperar'
  })
  const alEntrar = vi.fn()
  const espera = crearEsperaConfirmacion({
    intentar,
    visible: () => visible,
    ahora: () => Date.now(),
    programar(fn, ms) { const t = setTimeout(fn, ms); return () => clearTimeout(t) },
    alCambiarVisibilidad(fn) { oyentes.add(fn); return () => oyentes.delete(fn) },
    alEstado: e => estados.push(e),
    alEntrar,
  })
  const ponerVisible = (v: boolean) => { visible = v; oyentes.forEach(f => f()) }
  return { espera, intentar, alEntrar, estados, ponerVisible, oyentes }
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('clasificación de la respuesta del inicio de sesión', () => {
  it('confirmado → entrar; sin confirmar → esperar; límite → frenar; otro error → parar', () => {
    expect(clasificarIntento(null)).toBe('entrar')
    expect(clasificarIntento({ code: 'email_not_confirmed', message: 'Email not confirmed', status: 400 })).toBe('esperar')
    expect(clasificarIntento({ message: 'Email not confirmed' })).toBe('esperar')
    expect(clasificarIntento({ code: 'over_request_rate_limit', status: 429 })).toBe('frenar')
    expect(clasificarIntento({ code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 })).toBe('parar')
  })

  it('ritmo: 15 s al principio, 30 s después, y el doble tras cada límite (tope 2 min)', () => {
    expect(intervaloEspera(0, 0)).toBe(15_000)
    expect(intervaloEspera(ESPERA.primeraFaseMs, 0)).toBe(30_000)
    expect(intervaloEspera(0, 1)).toBe(30_000)
    expect(intervaloEspera(ESPERA.primeraFaseMs, 5)).toBe(120_000)
  })

  it('la pestaña sale por /auth/confirm con el mismo next', () => {
    expect(urlEntrada(null)).toBe('/auth/confirm')
    expect(urlEntrada('/elenco/invitacion/abc')).toBe('/auth/confirm?next=%2Felenco%2Finvitacion%2Fabc')
  })
})

describe('pestaña original del registro', () => {
  it('reintenta espaciado y entra sola cuando se confirma en otro aparato', async () => {
    const m = montar(['esperar', 'esperar', 'entrar'])
    m.espera.iniciar()

    await vi.advanceTimersByTimeAsync(14_999)
    expect(m.intentar).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(m.intentar).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(15_000)
    expect(m.intentar).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(15_000)

    expect(m.intentar).toHaveBeenCalledTimes(3)
    expect(m.alEntrar).toHaveBeenCalledTimes(1)
    expect(m.estados.at(-1)).toBe('entrando')
    // Después de entrar no hay más intentos.
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    expect(m.intentar).toHaveBeenCalledTimes(3)
  })

  it('no supera ~1 intento cada 15 s, y menos a partir de los 3 minutos', async () => {
    const m = montar(() => 'esperar')
    m.espera.iniciar()
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    // 3 min a 15 s (12) + 2 min a 30 s (4).
    expect(m.intentar.mock.calls.length).toBeLessThanOrEqual(16)
  })

  it('se pausa con la pestaña oculta y comprueba al volver', async () => {
    const m = montar(['esperar', 'entrar'])
    m.espera.iniciar()
    await vi.advanceTimersByTimeAsync(15_000)
    expect(m.intentar).toHaveBeenCalledTimes(1)

    m.ponerVisible(false)
    expect(m.estados.at(-1)).toBe('pausada')
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(m.intentar).toHaveBeenCalledTimes(1)

    m.ponerVisible(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(m.intentar).toHaveBeenCalledTimes(2)
    expect(m.alEntrar).toHaveBeenCalledTimes(1)
  })

  it('al volver a la pestaña respeta el mínimo de 10 s entre intentos', async () => {
    const m = montar(() => 'esperar')
    m.espera.iniciar()
    await vi.advanceTimersByTimeAsync(15_000)
    m.ponerVisible(false)
    await vi.advanceTimersByTimeAsync(2_000)
    m.ponerVisible(true)
    await vi.advanceTimersByTimeAsync(7_999)
    expect(m.intentar).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(m.intentar).toHaveBeenCalledTimes(2)
  })

  it('se detiene a los 15 minutos; el botón «Ya he confirmado, entrar» sigue funcionando', async () => {
    let confirmado = false
    const m = montar(() => (confirmado ? 'entrar' : 'esperar'))
    m.espera.iniciar()
    await vi.advanceTimersByTimeAsync(ESPERA.limiteMs + 60_000)
    const n = m.intentar.mock.calls.length
    expect(m.estados.at(-1)).toBe('agotada')
    await vi.advanceTimersByTimeAsync(60 * 60_000)
    expect(m.intentar.mock.calls.length).toBe(n)
    expect(m.oyentes.size).toBe(0)

    confirmado = true
    expect(await m.espera.comprobarAhora()).toBe('entrar')
    expect(m.alEntrar).toHaveBeenCalledTimes(1)
  })

  it('botón antes de confirmar: dice que aún no está confirmado y sigue esperando', async () => {
    const m = montar(() => 'esperar')
    m.espera.iniciar()
    expect(await m.espera.comprobarAhora()).toBe('esperar')
    expect(m.alEntrar).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(15_000)
    expect(m.intentar).toHaveBeenCalledTimes(2)
  })

  it('si el inicio de sesión falla por otro motivo, deja de intentarlo', async () => {
    const m = montar(['parar'])
    m.espera.iniciar()
    await vi.advanceTimersByTimeAsync(15 * 60_000)
    expect(m.intentar).toHaveBeenCalledTimes(1)
    expect(m.estados.at(-1)).toBe('detenida')
  })

  it('ante un límite de peticiones, espera el doble', async () => {
    const m = montar(['frenar', 'esperar'])
    m.espera.iniciar()
    await vi.advanceTimersByTimeAsync(15_000)
    await vi.advanceTimersByTimeAsync(29_999)
    expect(m.intentar).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(m.intentar).toHaveBeenCalledTimes(2)
  })

  it('al salir de la página deja de intentarlo', async () => {
    const m = montar(() => 'esperar')
    m.espera.iniciar()
    m.espera.detener()
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    expect(m.intentar).not.toHaveBeenCalled()
  })
})

describe('la contraseña nunca se guarda en almacenamiento', () => {
  it('ni la pantalla de espera ni el mecanismo usan localStorage, sessionStorage, IndexedDB o cookies', async () => {
    const { readFileSync } = await import('node:fs')
    for (const f of ['components/auth/EsperaConfirmacion.tsx', 'lib/auth/espera-confirmacion.ts', 'app/auth/registro/page.tsx']) {
      const codigo = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
      expect(codigo, f).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie/)
    }
  })
})
