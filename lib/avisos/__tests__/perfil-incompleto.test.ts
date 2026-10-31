import { describe, expect, it } from 'vitest'
import { asuntoAvisoPerfil, construirHtmlAvisoPerfil, construirTextoAvisoPerfil, faltasDelPerfil } from '../perfil-incompleto'

const base = { avatar_url: null, bio: null, ciudad: null, num_profesiones: 0 }

describe('faltasDelPerfil', () => {
  it('público general: tipo, foto y biografía, nunca profesiones', () => {
    expect(faltasDelPerfil({ ...base, tipo_perfil: 'publico' })).toEqual(['tipo', 'foto', 'bio', 'ciudad'])
  })
  it('persona: foto, profesiones y biografía', () => {
    expect(faltasDelPerfil({ ...base, tipo_perfil: 'actor' })).toEqual(['foto', 'profesiones', 'bio', 'ciudad'])
  })
  it('organización: nunca tipo ni profesiones', () => {
    expect(faltasDelPerfil({ ...base, tipo_perfil: 'teatro', bio: 'Sala.', ciudad: 'Madrid' })).toEqual(['foto'])
  })
  it('perfil completo: nada', () => {
    expect(faltasDelPerfil({ tipo_perfil: 'director', avatar_url: 'x', bio: 'Bio', ciudad: 'Lima', num_profesiones: 1 })).toEqual([])
  })
  it('biografía o foto en blanco cuentan como vacías', () => {
    expect(faltasDelPerfil({ tipo_perfil: 'compania', avatar_url: ' ', bio: '  ', ciudad: ' ', num_profesiones: 0 })).toEqual(['foto', 'bio', 'ciudad'])
  })
})

describe('correo del aviso', () => {
  it('solo incluye los puntos que faltan, con firma de Renee Bausson', () => {
    const html = construirHtmlAvisoPerfil('Ana ', 'teatro', ['foto'])
    expect(html).toContain('Hola, Ana:')
    expect(html).toContain('El logotipo de su organización.')
    expect(html).not.toContain('Tus profesiones')
    expect(html).not.toContain('Público general')
    expect(html).toContain('Renee Bausson')
    expect(html).not.toContain('Díaz')
  })
  it('tú para personas, ustedes para organizaciones (válido en los 20 países)', () => {
    const persona = construirTextoAvisoPerfil('A', 'actor', ['bio', 'ciudad'])
    expect(persona).toContain('Tu ciudad. Así te encuentran quienes buscan profesionales o salas en tu zona.')
    expect(persona).toContain('Completa tu perfil:')
    expect(persona).toContain('Si tienes cualquier duda, responde a este correo')
    expect(asuntoAvisoPerfil('actor')).toBe('Unos detalles para completar tu perfil en ObrasDeTeatro®')

    const org = construirTextoAvisoPerfil('A', 'compania', ['foto', 'bio', 'ciudad'])
    expect(org).toContain('Su ciudad. Así les encuentran quienes buscan compañías o salas en su zona.')
    expect(org).toContain('Tres o cuatro líneas sobre su trayectoria bastan para empezar.')
    expect(org).toContain('El logotipo de su organización. Sin él, su ficha no aparece en el directorio.')
    expect(org).toContain('Su perfil ya está en marcha')
    expect(org).toContain('Completen su perfil:')
    expect(org).toContain('Si tienen cualquier duda, respondan a este correo y les ayudamos personalmente.')
    expect(asuntoAvisoPerfil('compania')).toBe('Unos detalles para completar su perfil en ObrasDeTeatro®')
    for (const t of [org, construirHtmlAvisoPerfil('A', 'compania', ['foto', 'bio', 'ciudad'])]) {
      expect(t).not.toMatch(/(?<!\p{L})(vuestr[oa]s?|os|tu|tus|tienes|responde)(?!\p{L})/iu)
    }
  })
  it('escapa el nombre', () => {
    expect(construirHtmlAvisoPerfil('<b>x</b>', 'publico', ['tipo'])).toContain('Hola, &lt;b&gt;x&lt;/b&gt;:')
  })
  it('sin nombre, saluda con «Hola:»', () => {
    expect(construirTextoAvisoPerfil('', 'actor', ['profesiones'])).toMatch(/^Hola:\n/)
  })
})
