import { describe, expect, it } from 'vitest'
import { contieneCodigo, cumpleRequisitos, validarEnlace } from '../verificacion'

describe('validarEnlace', () => {
  it('acepta una red del tipo elegido y una web propia', () => {
    expect(validarEnlace('instagram', 'https://www.instagram.com/compania_x/')).toEqual({ ok: true, url: 'https://www.instagram.com/compania_x/' })
    expect(validarEnlace('web', 'https://compania.es/quienes-somos').ok).toBe(true)
    expect(validarEnlace('x', 'https://twitter.com/alguien').ok).toBe(true)
  })
  it('rechaza http, IPs, localhost, la propia plataforma y redes que no coinciden', () => {
    expect(validarEnlace('web', 'http://compania.es').ok).toBe(false)
    expect(validarEnlace('web', 'https://192.168.1.1/x').ok).toBe(false)
    expect(validarEnlace('web', 'https://localhost/x').ok).toBe(false)
    expect(validarEnlace('web', 'https://www.obrasdeteatro.com/perfil/yo').ok).toBe(false)
    expect(validarEnlace('instagram', 'https://facebook.com/yo').ok).toBe(false)
    expect(validarEnlace('nada', 'https://compania.es').ok).toBe(false)
    expect(validarEnlace('web', 'no es url').ok).toBe(false)
  })
})

it('detecta el código aunque cambien mayúsculas o espacios', () => {
  expect(contieneCodigo('<p>Verificación: odt-4f7k2a</p>', 'ODT-4F7K2A')).toBe(true)
  expect(contieneCodigo('ODT - 4F7K2A', 'ODT-4F7K2A')).toBe(true)
  expect(contieneCodigo('nada aquí', 'ODT-4F7K2A')).toBe(false)
})

it('requisitos: todos en true', () => {
  expect(cumpleRequisitos({ plan: true, foto: true, biografia: true, ciudad: true, profesiones: true })).toBe(true)
  expect(cumpleRequisitos({ plan: false, foto: true, biografia: true, ciudad: true, profesiones: true })).toBe(false)
  expect(cumpleRequisitos(null)).toBe(false)
})
