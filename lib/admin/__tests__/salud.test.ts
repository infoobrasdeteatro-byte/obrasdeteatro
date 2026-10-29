import { describe, it, expect } from 'vitest'
import {
  hace, lunesMadrid, peorColor, PATRON_BDNS, PATRON_LATAM,
  saludConvocatorias, saludCorreo, saludMake, saludMediateca, saludNoticias, saludProscenio,
  type EscenarioMake, type EstadoMake,
} from '../salud'

// Jueves 29-10-2026, 12:00 UTC (13:00 en Madrid).
const AHORA = new Date('2026-10-29T12:00:00Z')
const horasAntes = (h: number) => new Date(AHORA.getTime() - h * 3_600_000).toISOString()
const diasAntes = (d: number) => horasAntes(d * 24)

const escenario = (over: Partial<EscenarioMake> = {}): EscenarioMake => ({
  id: 1, nombre: 'Convocatorias · BDNS España', activo: true, invalido: false,
  ultimaEjecucion: { at: diasAntes(1), resultado: 'ok' }, ...over,
})
const makeCon = (...escenarios: EscenarioMake[]): EstadoMake => ({ tipo: 'ok', escenarios, leidoAt: AHORA.toISOString() })

describe('hace', () => {
  it('minutos, horas y días', () => {
    expect(hace(horasAntes(0.5), AHORA)).toBe('hace 30 min')
    expect(hace(horasAntes(5), AHORA)).toBe('hace 5 h')
    expect(hace(diasAntes(1), AHORA)).toBe('hace 1 día')
    expect(hace(diasAntes(9), AHORA)).toBe('hace 9 días')
    expect(hace(null, AHORA)).toBe('nunca')
  })
})

describe('saludNoticias: verde < 24 h, ámbar 24–48 h, rojo > 48 h', () => {
  const s = (ultima: string | null) => saludNoticias({ ultima, fuentesActivas: 3, fuentesTotal: 5 }, AHORA)
  it.each([[23, 'verde'], [24, 'ambar'], [48, 'ambar'], [49, 'rojo']])('%s h → %s', (h, color) => {
    expect(s(horasAntes(h as number)).color).toBe(color)
  })
  it('sin ninguna noticia, rojo', () => expect(s(null).color).toBe('rojo'))
  it('cita las fuentes activas', () => expect(s(horasAntes(2)).frase).toContain('3 de 5 fuentes activas'))
})

describe('saludConvocatorias · BDNS (8 días)', () => {
  const bdns = (ultimaImportada: string | null, make: EstadoMake) =>
    saludConvocatorias({ clave: 'bdns', titulo: 'BDNS', ultimaImportada, patron: PATRON_BDNS, maxDias: 8 }, make, AHORA)

  it('verde con el escenario bien y entradas recientes', () => {
    expect(bdns(diasAntes(2), makeCon(escenario())).color).toBe('verde')
  })
  it('rojo si la última ejecución falló', () => {
    const s = bdns(diasAntes(2), makeCon(escenario({ ultimaEjecucion: { at: diasAntes(1), resultado: 'error' } })))
    expect(s.color).toBe('rojo')
    expect(s.frase).toContain('falló')
  })
  it('rojo si la última ejecución tiene más de 8 días', () => {
    expect(bdns(diasAntes(2), makeCon(escenario({ ultimaEjecucion: { at: diasAntes(9), resultado: 'ok' } }))).color).toBe('rojo')
    expect(bdns(diasAntes(2), makeCon(escenario({ ultimaEjecucion: { at: diasAntes(7), resultado: 'ok' } }))).color).toBe('verde')
  })
  it('ámbar si el escenario corre pero no trae nada en más de 8 días (caso del 06-10-2026)', () => {
    const s = bdns(diasAntes(23), makeCon(escenario()))
    expect(s.color).toBe('ambar')
    expect(s.frase).toContain('no trae resultados')
  })
  it('sin Make, se juzga por la base y nunca pasa de ámbar', () => {
    expect(bdns(diasAntes(2), { tipo: 'sin_token' }).color).toBe('verde')
    const s = bdns(diasAntes(23), { tipo: 'sin_token' })
    expect(s.color).toBe('ambar')
    expect(s.frase).toContain('Make sin conectar')
  })
})

describe('saludConvocatorias · Latinoamérica (2 días)', () => {
  const latam = (e: Partial<EscenarioMake>) =>
    saludConvocatorias({ clave: 'latam', titulo: 'LATAM', ultimaImportada: diasAntes(1), patron: PATRON_LATAM, maxDias: 2 }, makeCon(escenario({ ...e, nombre: 'Convocatorias · Google Alertas LATAM' })), AHORA)

  it('rojo si el escenario está desactivado (caso del 10-10-2026)', () => {
    const s = latam({ activo: false })
    expect(s.color).toBe('rojo')
    expect(s.frase).toContain('desactivado')
  })
  it('rojo si la última ejecución tiene más de 2 días o falló', () => {
    expect(latam({ ultimaEjecucion: { at: diasAntes(3), resultado: 'ok' } }).color).toBe('rojo')
    expect(latam({ ultimaEjecucion: { at: horasAntes(3), resultado: 'error' } }).color).toBe('rojo')
  })
  it('verde si se ejecutó hace menos de 2 días sin error', () => {
    expect(latam({ ultimaEjecucion: { at: horasAntes(20), resultado: 'ok' } }).color).toBe('verde')
  })
  it('reconoce el escenario por su nombre sin importar tildes ni mayúsculas', () => {
    expect(PATRON_LATAM.test('convocatorias · google alertas latam')).toBe(true)
    expect(PATRON_BDNS.test('convocatorias · google alertas latam')).toBe(false)
  })
})

describe('saludMediateca: rojo con error o sin importar en más de 26 h', () => {
  const p = (over: object) => ({ id: 'a', nombre: 'Cartografía Teatral', ultima_importacion_at: horasAntes(7), ultimo_error: null, ...over })
  it('verde tras una importación reciente sin error', () => expect(saludMediateca([p({})], AHORA)[0].color).toBe('verde'))
  it('rojo con error, mostrando el texto (caso del 404 de YouTube)', () => {
    const [s] = saludMediateca([p({ ultimo_error: 'YouTube: www.youtube.com respondió 404' })], AHORA)
    expect(s.color).toBe('rojo')
    expect(s.frase).toContain('respondió 404')
  })
  it('rojo si no se importa en más de 26 h', () => {
    expect(saludMediateca([p({ ultima_importacion_at: horasAntes(27) })], AHORA)[0].color).toBe('rojo')
    expect(saludMediateca([p({ ultima_importacion_at: horasAntes(25) })], AHORA)[0].color).toBe('verde')
    expect(saludMediateca([p({ ultima_importacion_at: null })], AHORA)[0].color).toBe('rojo')
  })
  it('un error en blanco no cuenta como error', () => expect(saludMediateca([p({ ultimo_error: '  ' })], AHORA)[0].color).toBe('verde'))
})

describe('saludProscenio', () => {
  const base = { nombre: 'Proscenio', activo: true, dia_envio: 4 }
  const envio = (enviado_at: string, errores = 0) => ({ enviado_at, destinatarios: 120, errores })
  const viernes = new Date('2026-10-30T10:00:00Z')
  const lunes = new Date('2026-10-26T10:00:00Z')

  it('lunes de la semana en Madrid', () => {
    expect(lunesMadrid(AHORA)).toBe('2026-10-26')
    expect(lunesMadrid(new Date('2026-11-01T22:30:00Z'))).toBe('2026-10-26') // domingo 23:30 en Madrid
    expect(lunesMadrid(new Date('2026-11-01T23:30:00Z'))).toBe('2026-11-02') // ya es lunes en Madrid
  })
  it('rojo si el último envío tuvo errores', () => {
    expect(saludProscenio({ ...base, ultimo: envio('2026-10-29T07:00:00Z', 3) }, AHORA).color).toBe('rojo')
  })
  it('el viernes, rojo si no salió el de esta semana', () => {
    const s = saludProscenio({ ...base, ultimo: envio('2026-10-22T07:00:00Z') }, viernes)
    expect(s.color).toBe('rojo')
    expect(s.frase).toContain('jueves')
  })
  it('el viernes, verde si salió el jueves', () => {
    expect(saludProscenio({ ...base, ultimo: envio('2026-10-29T07:00:00Z') }, viernes).color).toBe('verde')
  })
  it('antes del día de envío, el de la semana pasada basta', () => {
    expect(saludProscenio({ ...base, ultimo: envio('2026-10-22T07:00:00Z') }, lunes).color).toBe('verde')
    expect(saludProscenio({ ...base, ultimo: envio('2026-10-22T07:00:00Z') }, AHORA).color).toBe('verde') // jueves, aún puede salir
  })
  it('desactivado: gris, salvo errores', () => {
    expect(saludProscenio({ ...base, activo: false, ultimo: envio('2026-10-01T07:00:00Z') }, viernes).color).toBe('gris')
  })
})

describe('saludMake', () => {
  it('gris y sin llamar a nada si falta el token', () => {
    const s = saludMake({ tipo: 'sin_token' }, AHORA)
    expect(s.color).toBe('gris')
    expect(s.frase).toBe('Sin conectar: falta MAKE_API_TOKEN.')
  })
  it('ámbar si no se pudo consultar', () => {
    const s = saludMake({ tipo: 'error', mensaje: 'no respondió a tiempo' }, AHORA)
    expect(s.color).toBe('ambar')
    expect(s.frase).toContain('no respondió a tiempo')
  })
  it('rojo si algún escenario activo es inválido o falló', () => {
    expect(saludMake(makeCon(escenario(), escenario({ id: 2, nombre: 'Noticias', invalido: true })), AHORA).color).toBe('rojo')
    expect(saludMake(makeCon(escenario({ ultimaEjecucion: { at: horasAntes(1), resultado: 'error' } })), AHORA).color).toBe('rojo')
  })
  it('ámbar si alguno está desactivado; verde si todos funcionan', () => {
    expect(saludMake(makeCon(escenario(), escenario({ id: 2, nombre: 'LATAM', activo: false })), AHORA).color).toBe('ambar')
    expect(saludMake(makeCon(escenario(), escenario({ id: 2, nombre: 'Noticias' })), AHORA).color).toBe('verde')
  })
})

describe('peorColor', () => {
  it('rojo > ámbar > verde > gris', () => {
    expect(peorColor(['verde', 'ambar', 'rojo'])).toBe('rojo')
    expect(peorColor(['verde', 'ambar', 'gris'])).toBe('ambar')
    expect(peorColor(['gris', 'verde'])).toBe('verde')
    expect(peorColor(['gris'])).toBe('gris')
  })
})

describe('saludCorreo', () => {
  it('gris «Sin configurar» sin la clave del webhook o sin ningún correo', () => {
    expect(saludCorreo({ configurado: false, ultimo: horasAntes(1), sinAtender: null }, AHORA)).toMatchObject({ color: 'gris', frase: expect.stringContaining('RESEND_INBOUND_WEBHOOK_SECRET') })
    expect(saludCorreo({ configurado: true, ultimo: null, sinAtender: null }, AHORA)).toMatchObject({ color: 'gris', frase: expect.stringContaining('ningún correo') })
  })
  it('verde con la fecha del último correo', () => {
    const s = saludCorreo({ configurado: true, ultimo: horasAntes(3), sinAtender: 2 }, AHORA)
    expect(s).toMatchObject({ color: 'verde', ultimoDato: horasAntes(3) })
    expect(s.frase).toBe('El último correo llegó hace 3 h. 2 correos sin atender.')
  })
})
