import { describe, it, expect, vi, afterEach } from 'vitest'
import { asuntoAviso, asuntoAvisoSugerencia, construirHtmlAviso, construirHtmlAvisoSugerencia, enviarAvisoReclamacion, enviarAvisoSugerencia } from '../aviso-reclamacion'

const DATOS = {
  espacioNombre: 'Teatro Leal',
  espacioSlug: 'teatro-leal',
  municipio: 'San Cristóbal de La Laguna',
  solicitante: 'Ana Pérez · ana@leal.es',
  mensaje: 'Directora <b>técnica</b>\nTel. 600 000 000',
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('aviso de reclamación a moderación', () => {
  it('asunto con el nombre del espacio', () => {
    expect(asuntoAviso('Teatro Leal')).toBe('Espacios: nueva reclamación de «Teatro Leal»')
  })

  it('HTML con enlace a la ficha y a la bandeja, y el mensaje escapado', () => {
    const html = construirHtmlAviso(DATOS)
    expect(html).toContain('https://www.obrasdeteatro.com/espacios/teatro-leal')
    expect(html).toContain('https://www.obrasdeteatro.com/admin/espacios#reclamaciones')
    expect(html).toContain('Directora &lt;b&gt;técnica&lt;/b&gt;')
    expect(html).not.toContain('<b>técnica</b>')
    expect(html).toContain('ana@leal.es')
  })

  it('sin RESEND_API_KEY no envía y lo dice', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await enviarAvisoReclamacion(DATOS)).toEqual({ ok: false, error: 'Falta RESEND_API_KEY' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('envía por Resend al buzón de moderación con el remitente de siempre', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('CONVOCATORIAS_RESUMEN_EMAIL', '')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    expect(await enviarAvisoReclamacion(DATOS)).toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.headers.Authorization).toBe('Bearer re_test')
    const cuerpo = JSON.parse(init.body)
    expect(cuerpo.from).toBe('ObrasDeTeatro® <no-reply@obrasdeteatro.com>')
    expect(cuerpo.to).toBe('hola@obrasdeteatro.com')
    expect(cuerpo.subject).toBe('Espacios: nueva reclamación de «Teatro Leal»')
  })

  it('un error de Resend o de red se devuelve, no se lanza', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }))
    expect(await enviarAvisoReclamacion(DATOS)).toEqual({ ok: false, error: 'Resend respondió 422' })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')))
    expect(await enviarAvisoReclamacion(DATOS)).toEqual({ ok: false, error: 'ECONNRESET' })
  })
})

describe('aviso de sugerencia de corrección', () => {
  const SUG = { espacioNombre: 'Teatro Leal', espacioSlug: 'teatro-leal', municipio: 'La Laguna', remitente: 'Visitante sin sesión · responder a a@b.es', mensaje: 'El <i>teléfono</i> cambió' }

  it('mismo correo, con su asunto y enlace a la pestaña de sugerencias', () => {
    expect(asuntoAvisoSugerencia('Teatro Leal')).toBe('Espacios: sugerencia de corrección para «Teatro Leal»')
    const html = construirHtmlAvisoSugerencia(SUG)
    expect(html).toContain('Nueva sugerencia de corrección')
    expect(html).toContain('/admin/espacios#sugerencias')
    expect(html).toContain('El &lt;i&gt;teléfono&lt;/i&gt; cambió')
  })

  it('se envía por Resend al mismo buzón de moderación', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('CONVOCATORIAS_RESUMEN_EMAIL', '')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)
    expect(await enviarAvisoSugerencia(SUG)).toEqual({ ok: true })
    const cuerpo = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(cuerpo.to).toBe('hola@obrasdeteatro.com')
    expect(cuerpo.subject).toBe('Espacios: sugerencia de corrección para «Teatro Leal»')
  })
})
