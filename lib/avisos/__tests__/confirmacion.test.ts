import { describe, expect, it } from 'vitest'
import { htmlConfirmacion, textoConfirmacion } from '../confirmacion'

describe('recordatorio de confirmación', () => {
  it('lleva a /auth/confirmar con el correo y firma Renee Bausson', () => {
    const html = htmlConfirmacion('Ana ', 'ana+x@correo.com')
    expect(html).toContain('Hola, Ana:')
    expect(html).toContain('https://www.obrasdeteatro.com/auth/confirmar?email=ana%2Bx%40correo.com')
    expect(html).toContain('Confirmar mi correo')
    expect(html).toContain('Renee Bausson')
  })
  it('escapa el nombre', () => {
    expect(htmlConfirmacion('<i>x</i>', 'a@b.co')).toContain('Hola, &lt;i&gt;x&lt;/i&gt;:')
  })
  it('texto plano sin nombre', () => {
    expect(textoConfirmacion('', 'a@b.co')).toMatch(/^Hola:\n\nTe registraste/)
  })
})
