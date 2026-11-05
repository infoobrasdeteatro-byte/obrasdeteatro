import { describe, expect, it } from 'vitest'
import {
  CANALES, DISTINTIVOS, LIMITE_MAILTO, enlaceMailtoPreinvitacion, enlaceWhatsappPreinvitacion, nombreDePila, preinvitacion, textoParaCopiar,
} from '../preinvitacion'

const TODAS = DISTINTIVOS.flatMap(d => CANALES.map(c => [d.id, c.id] as const))

describe('preinvitación: plantillas', () => {
  it.each(TODAS)('%s · %s: pone solo el nombre de pila y no deja corchetes', (d, c) => {
    const { asunto, cuerpo } = preinvitacion(d, c, '  Lucía Fernández Gil ')
    expect(cuerpo.startsWith(c === 'whatsapp' ? 'Hola, Lucía. ¿Cómo estás?' : 'Hola, Lucía:\n\n')).toBe(true)
    expect(cuerpo).not.toContain('[')
    expect(cuerpo).not.toContain('Fernández')
    if (c === 'correo') expect(asunto).toMatch(/^Invitación personal para Lucía: /)
    else expect(asunto).toBeNull()
  })

  it.each(TODAS)('%s · %s: sin nombre, «Hola.» / «Hola:»', (d, c) => {
    const { asunto, cuerpo } = preinvitacion(d, c, '')
    expect(cuerpo.startsWith(c === 'whatsapp' ? 'Hola. ¿Cómo estás?' : 'Hola:\n\n')).toBe(true)
    expect(cuerpo).not.toContain('[')
    if (asunto) {
      expect(asunto).not.toContain('[')
      expect(asunto).toMatch(/^Invitación personal: /)
    }
  })

  it.each(TODAS)('%s · %s: «80 %» con espacio, viñetas y firma', (d, c) => {
    const { cuerpo } = preinvitacion(d, c, 'Lucía')
    expect(cuerpo).toContain('80 %')
    expect(cuerpo).toContain('20 %')
    expect(cuerpo).not.toMatch(/\d%/)
    expect(cuerpo).toMatch(/\n• /)
    expect(cuerpo).toContain('Renee Bausson\nFundador de ObrasDeTeatro®')
  })

  it('cada distintivo habla de su programa', () => {
    expect(preinvitacion('embajador', 'whatsapp').cuerpo).toContain('Embajadores de Escena:')
    expect(preinvitacion('fundador', 'whatsapp').cuerpo).toContain('nuestro Elenco Fundador:')
    expect(preinvitacion('embajador', 'correo').asunto).toBe('Invitación personal: Programa Embajadores de Escena de ObrasDeTeatro®')
    expect(preinvitacion('fundador', 'correo').asunto).toBe('Invitación personal: Elenco Fundador de ObrasDeTeatro®')
  })

  it('nombre de pila', () => {
    expect(nombreDePila(' Lucía  Pérez ')).toBe('Lucía')
    expect(nombreDePila(null)).toBe('')
  })
})

describe('preinvitación: enlaces', () => {
  it('wa.me conserva saltos de línea y viñetas', () => {
    const { cuerpo } = preinvitacion('fundador', 'whatsapp', 'Lucía')
    const url = enlaceWhatsappPreinvitacion(cuerpo, '+34 600 11 22 33')
    expect(url.startsWith('https://wa.me/34600112233?text=')).toBe(true)
    expect(decodeURIComponent(url.split('?text=')[1])).toBe(cuerpo)
    expect(url).toContain('%0A%E2%80%A2%20')
    expect(enlaceWhatsappPreinvitacion('x').startsWith('https://wa.me/?text=')).toBe(true)
  })

  it('mailto en texto plano con %0D%0A', () => {
    const { asunto, cuerpo } = preinvitacion('embajador', 'correo', 'Lucía')
    const url = enlaceMailtoPreinvitacion(asunto!, cuerpo)
    expect(url.startsWith('mailto:?subject=')).toBe(true)
    expect(url).toContain('%0D%0A%0D%0A')
    expect(url).not.toMatch(/%0A(?<!%0D%0A)/)
    const body = new URL(url).searchParams.get('body')
    expect(body).toBe(cuerpo.replace(/\n/g, '\r\n'))
  })

  it('mailto: destinatario solo si es una dirección válida', () => {
    expect(enlaceMailtoPreinvitacion('a', 'b', ' lucia@ejemplo.com ').startsWith('mailto:lucia@ejemplo.com?')).toBe(true)
    expect(enlaceMailtoPreinvitacion('a', 'b', 'lucia@x.com?cc=otro@y.com').startsWith('mailto:?')).toBe(true)
  })

  it('los dos correos pasan del límite: se ofrece «Copiar texto»', () => {
    for (const d of ['embajador', 'fundador'] as const) {
      const { asunto, cuerpo } = preinvitacion(d, 'correo', 'Lucía')
      expect(enlaceMailtoPreinvitacion(asunto!, cuerpo).length).toBeGreaterThan(LIMITE_MAILTO)
    }
  })

  it('copiar texto lleva asunto y cuerpo', () => {
    expect(textoParaCopiar('A', 'B')).toBe('Asunto: A\n\nB')
  })
})
