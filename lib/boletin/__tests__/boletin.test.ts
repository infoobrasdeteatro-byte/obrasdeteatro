import { describe, it, expect, beforeAll } from 'vitest'
import {
  asuntoBoletin, construirHtmlBoletin, construirHtmlConfirmacion, contenidoVacio, crearTokenBaja, crearTokenConfirmacion,
  diaIsoMadrid, emailValido, enviarLote, hashToken, normalizarEmail, tocaEnvio, verificarTokenBaja, type ContenidoBoletin,
} from '../boletin'

beforeAll(() => { process.env.ALERTAS_CONVOCATORIAS_SECRET = 'secreto-de-prueba' })

const ID = '3f0e4b9a-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const JUEVES = new Date('2026-10-15T07:00:00Z')
const VACIO: ContenidoBoletin = { noticias: [], convocatorias: [], formaciones: [], episodios: [] }
const LLENO: ContenidoBoletin = {
  noticias: [{ titular: 'Estreno <b>en</b> Lima', fuente: 'Cuenta Artes', pais_code: 'PE' }],
  convocatorias: [{ id: 'c1', title: 'Premio de dramaturgia', pais_code: 'ES', deadline: '2026-11-30T23:00:00Z' }],
  formaciones: [],
  episodios: [{ titulo: 'Cartografía Teatral: Carmen Aros', programa: 'Cartografía Teatral', ruta: '/mediateca/cartografia-teatral/x' }],
}

describe('correo y calendario', () => {
  it('normaliza y valida correos', () => {
    expect(normalizarEmail('  Ana@Ejemplo.ES ')).toBe('ana@ejemplo.es')
    expect(emailValido('ana@ejemplo.es')).toBe(true)
    expect(emailValido('ana@ejemplo')).toBe(false)
    expect(emailValido('<x>@y.es')).toBe(false)
  })

  it('toca el día elegido, activo y sin envío en 6 días', () => {
    expect(diaIsoMadrid(JUEVES)).toBe(4)
    expect(tocaEnvio({ activo: true, dia_envio: 4 }, null, JUEVES)).toBe(true)
    expect(tocaEnvio({ activo: false, dia_envio: 4 }, null, JUEVES)).toBe(false)
    expect(tocaEnvio({ activo: true, dia_envio: 1 }, null, JUEVES)).toBe(false)
    expect(tocaEnvio({ activo: true, dia_envio: 4 }, '2026-10-15T06:00:00Z', JUEVES)).toBe(false)
    expect(tocaEnvio({ activo: true, dia_envio: 4 }, '2026-10-08T07:00:00Z', JUEVES)).toBe(true)
  })
})

describe('tokens', () => {
  it('baja: firmado, verificable y no falsificable', () => {
    const t = crearTokenBaja(ID)!
    expect(verificarTokenBaja(t)).toBe(ID)
    expect(verificarTokenBaja(t.slice(0, -2) + 'xx')).toBeNull()
    expect(verificarTokenBaja('basura')).toBeNull()
  })
  it('confirmación: aleatorio y solo se guarda el hash', () => {
    const a = crearTokenConfirmacion()
    const b = crearTokenConfirmacion()
    expect(a.token).not.toBe(b.token)
    expect(a.hash).toBe(hashToken(a.token))
    expect(a.hash).not.toContain(a.token)
  })
})

describe('HTML', () => {
  it('semana vacía no se envía', () => {
    expect(contenidoVacio(VACIO)).toBe(true)
    expect(contenidoVacio(LLENO)).toBe(false)
  })
  it('incluye solo las secciones con contenido, escapa el HTML y lleva la baja', () => {
    const h = construirHtmlBoletin('Proscenio', LLENO, crearTokenBaja(ID)!, JUEVES, true)
    expect(h).toContain('Estreno &lt;b&gt;en&lt;/b&gt; Lima')
    expect(h).toContain('Convocatorias nuevas')
    expect(h).not.toContain('>Formación<')
    expect(h).toContain('/boletin/baja?t=')
    expect(h).toContain('Ver planes')
    expect(construirHtmlBoletin('Proscenio', LLENO, 't', JUEVES, false)).not.toContain('Ver planes')
  })
  it('asunto y confirmación', () => {
    expect(asuntoBoletin('Proscenio', LLENO)).toBe('Proscenio: 1 convocatoria nueva')
    expect(asuntoBoletin('Proscenio', { ...VACIO, noticias: LLENO.noticias })).toBe('Proscenio: la actualidad teatral de la semana')
    expect(construirHtmlConfirmacion('Proscenio', 'abc')).toContain('/boletin/confirmar?t=abc')
  })
})

describe('envío por lotes', () => {
  it('manda un lote con la baja de un clic en cabeceras', async () => {
    let cuerpo: unknown = null
    const falso = (async (_url: string, init: RequestInit) => { cuerpo = JSON.parse(String(init.body)); return new Response('{}', { status: 200 }) }) as unknown as typeof fetch
    const ok = await enviarLote([{ para: 'a@b.es', asunto: 'x', html: '<p>x</p>', tokenBaja: 'tok' }], 'Proscenio', falso)
    expect(ok).toBe(true)
    const [c] = cuerpo as { from: string; headers: Record<string, string> }[]
    expect(c.from).toBe('Proscenio · ObrasDeTeatro® <no-reply@obrasdeteatro.com>')
    expect(c.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
  })
  it('un error de Resend no lanza', async () => {
    const falla = (async () => new Response('', { status: 500 })) as unknown as typeof fetch
    expect(await enviarLote([{ para: 'a@b.es', asunto: 'x', html: 'x' }], 'P', falla)).toBe(false)
  })
})
