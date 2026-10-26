import { describe, expect, it } from 'vitest'
import { codigoValido, enlaceWhatsapp, mensajeWhatsapp, oficioPersona, tituloEmbajador } from '../textos'

describe('textos de Embajadores de Escena', () => {
  it('título y oficio con género', () => {
    expect(tituloEmbajador('f')).toBe('Embajadora de Escena')
    expect(tituloEmbajador('m')).toBe('Embajador de Escena')
    expect(oficioPersona('dramaturgia', 'f')).toBe('dramaturga')
    expect(oficioPersona('interpretacion', 'm')).toBe('actor')
  })

  it('mensaje para quien no conoce el proyecto: oficio, cortesía y enlace; sin precio ni otros invitados', () => {
    const m = mensajeWhatsapp({ nombre: 'Blanca Pérez', genero: 'f', oficio: 'dramaturgia', token: 'abc', version: 'nuevo' })
    expect(m.startsWith('Hola, Blanca.')).toBe(true)
    expect(m).toContain('estrenarlas, adaptarlas o programarlas')
    expect(m).toContain('*Embajadora de Escena*')
    expect(m).toContain('sin tarjeta y sin compromiso.')
    expect(m).toContain('https://www.obrasdeteatro.com/invitacion/abc')
    expect(m).not.toMatch(/€|50|renovación/)
  })

  it('mensaje corto para quien ya lo conoce', () => {
    const m = mensajeWhatsapp({ nombre: 'Juan', genero: 'm', oficio: 'direccion', token: 't', version: 'conoce' })
    expect(m).toContain('*Embajador de Escena*')
    expect(m).not.toContain('productoras, salas y festivales buscan')
  })

  it('enlace de WhatsApp: al número con prefijo, o para elegir contacto', () => {
    expect(enlaceWhatsapp('Hola', '+34 600 000 000')).toBe('https://wa.me/34600000000?text=Hola')
    expect(enlaceWhatsapp('Hola', '600000000')).toBe('https://wa.me/?text=Hola')
    expect(enlaceWhatsapp('Hola y adiós', null)).toBe('https://wa.me/?text=Hola%20y%20adi%C3%B3s')
  })

  it('código de referido', () => {
    expect(codigoValido(' ab12cd34 ')).toBe('AB12CD34')
    expect(codigoValido('corto')).toBeNull()
    expect(codigoValido("x'; drop")).toBeNull()
  })
})

describe('compartir el enlace personal', () => {
  it('correo con asunto y mensaje con el enlace', async () => {
    const { enlaceCorreo, mensajeColegas, ASUNTO_COLEGAS } = await import('../textos')
    const m = mensajeColegas('https://www.obrasdeteatro.com/r/6AA5572E')
    expect(m).toContain('un mes de Premium gratis')
    expect(m).toContain('https://www.obrasdeteatro.com/r/6AA5572E')
    const url = enlaceCorreo(ASUNTO_COLEGAS, m)
    expect(url.startsWith('mailto:?subject=Te%20invito%20a%20ObrasDeTeatro%C2%AE&body=')).toBe(true)
    expect(decodeURIComponent(url.split('body=')[1])).toBe(m)
  })
})
