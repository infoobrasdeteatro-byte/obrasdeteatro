import { describe, expect, it } from 'vitest'
import { construirHtmlAvisoPerfil, construirTextoAvisoPerfil, faltasDelPerfil } from '../perfil-incompleto'

const base = { avatar_url: null, bio: null, num_profesiones: 0 }

describe('faltasDelPerfil', () => {
  it('público general: tipo, foto y biografía, nunca profesiones', () => {
    expect(faltasDelPerfil({ ...base, tipo_perfil: 'publico' })).toEqual(['tipo', 'foto', 'bio'])
  })
  it('persona: foto, profesiones y biografía', () => {
    expect(faltasDelPerfil({ ...base, tipo_perfil: 'actor' })).toEqual(['foto', 'profesiones', 'bio'])
  })
  it('organización: nunca tipo ni profesiones', () => {
    expect(faltasDelPerfil({ ...base, tipo_perfil: 'teatro', bio: 'Sala.' })).toEqual(['foto'])
  })
  it('perfil completo: nada', () => {
    expect(faltasDelPerfil({ tipo_perfil: 'director', avatar_url: 'x', bio: 'Bio', num_profesiones: 1 })).toEqual([])
  })
  it('biografía o foto en blanco cuentan como vacías', () => {
    expect(faltasDelPerfil({ tipo_perfil: 'compania', avatar_url: ' ', bio: '  ', num_profesiones: 0 })).toEqual(['foto', 'bio'])
  })
})

describe('correo del aviso', () => {
  it('solo incluye los puntos que faltan, con firma de Renee Bausson', () => {
    const html = construirHtmlAvisoPerfil('Ana ', 'teatro', ['foto'])
    expect(html).toContain('Hola, Ana:')
    expect(html).toContain('El logotipo de tu organización.')
    expect(html).not.toContain('Tus profesiones')
    expect(html).not.toContain('Público general')
    expect(html).toContain('Renee Bausson')
    expect(html).not.toContain('Díaz')
  })
  it('escapa el nombre', () => {
    expect(construirHtmlAvisoPerfil('<b>x</b>', 'publico', ['tipo'])).toContain('Hola, &lt;b&gt;x&lt;/b&gt;:')
  })
  it('sin nombre, saluda con «Hola:»', () => {
    expect(construirTextoAvisoPerfil('', 'actor', ['profesiones'])).toMatch(/^Hola:\n/)
  })
})
