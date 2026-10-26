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
    expect(m.startsWith('Hola, Blanca:')).toBe(true)
    expect(m).toContain('Tu trayectoria como dramaturga es un referente')
    expect(m).toContain('Como Embajadora tendrás')
    expect(m).toContain('un distintivo en tu perfil que reconoce tu carrera')
    expect(m.endsWith('Será un honor contar contigo.\nUn abrazo,\nRenee Bausson')).toBe(true)
    expect(m).toContain('estrenarlas, adaptarlas o programarlas')
    expect(m).toContain('*Embajadora de Escena*')
    expect(m).toContain('sin tarjeta y sin compromiso, y un distintivo')
    expect(m).toContain('https://www.obrasdeteatro.com/invitacion/abc')
    expect(m).not.toMatch(/€|50|renovación/)
  })

  it('mensaje corto para quien ya lo conoce', () => {
    const m = mensajeWhatsapp({ nombre: 'Juan', genero: 'm', oficio: 'direccion', token: 't', version: 'conoce' })
    expect(m).toContain('*Embajador de Escena*')
    expect(m).toContain('Por tu trayectoria como director,')
    expect(m).not.toContain('productoras, salas y festivales buscan')
    expect(m).not.toContain('Soy Renee Bausson')
    expect(m).toContain('Renee Bausson')
    expect(m).not.toMatch(/€|50|renovación/)
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
  it('Gmail y Outlook web con asunto y mensaje', async () => {
    const { enlaceGmail, enlaceOutlook } = await import('../textos')
    expect(enlaceGmail('Hola', 'a b')).toBe('https://mail.google.com/mail/?view=cm&fs=1&su=Hola&body=a%20b')
    expect(enlaceOutlook('Hola', 'a b')).toBe('https://outlook.live.com/mail/0/deeplink/compose?subject=Hola&body=a%20b')
  })
})
