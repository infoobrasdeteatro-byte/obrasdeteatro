import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { emailValido, estadoContacto, hrefTelefono, hrefWhatsapp, telefonoValido } from '../contacto'

describe('telefonoValido', () => {
  it('acepta formatos habituales', () => {
    expect(telefonoValido('+34 600 123 456')).toBe(true)
    expect(telefonoValido('922 60 94 50')).toBe(true)
    expect(telefonoValido('(+57) 300-123-4567')).toBe(false) // el + solo al principio
    expect(telefonoValido('+57 (300) 123-4567')).toBe(true)
  })
  it('rechaza texto y números demasiado cortos', () => {
    expect(telefonoValido('llámame')).toBe(false)
    expect(telefonoValido('12345')).toBe(false)
    expect(telefonoValido('------')).toBe(false)
  })
})

describe('emailValido', () => {
  it('valida lo básico', () => {
    expect(emailValido('hola@obrasdeteatro.com')).toBe(true)
    expect(emailValido('sin-arroba.com')).toBe(false)
    expect(emailValido('a b@c.com')).toBe(false)
  })
})

describe('enlaces', () => {
  it('tel: con solo dígitos y el + inicial', () => {
    expect(hrefTelefono('+34 600 12 34 56')).toBe('tel:+34600123456')
    expect(hrefTelefono('922 60 94 50')).toBe('tel:922609450')
  })
  it('wa.me solo con prefijo internacional', () => {
    expect(hrefWhatsapp('+34 600 12 34 56')).toBe('https://wa.me/34600123456')
    expect(hrefWhatsapp('0034 600 12 34 56')).toBe('https://wa.me/34600123456')
    expect(hrefWhatsapp('600 12 34 56')).toBeNull()
  })
})

describe('estadoContacto', () => {
  it('normaliza valores desconocidos a «ninguna»', () => {
    expect(estadoContacto('aceptada')).toBe('aceptada')
    expect(estadoContacto('rechazada')).toBe('ninguna')
    expect(estadoContacto(null)).toBe('ninguna')
  })
})

describe('migración', () => {
  const sql = readFileSync(join(__dirname, '../../../supabase/migrations/20261023160000_red_fase1_contacto.sql'), 'utf8')
  it('no concede la lectura de email ni phone de profiles', () => {
    const grant = sql.match(/^grant select \(([^)]*)\) on public\.profiles/m)?.[1] ?? ''
    const columnas = grant.split(',').map(c => c.trim())
    expect(columnas).toContain('slug')
    expect(columnas).not.toContain('email')
    expect(columnas).not.toContain('phone')
    expect(sql).toContain('revoke select on public.profiles from anon, authenticated;')
  })
})
