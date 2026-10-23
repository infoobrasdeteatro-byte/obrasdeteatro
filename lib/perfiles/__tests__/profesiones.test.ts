import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GRUPOS_PROFESIONES, PROFESIONES, esProfesion, nombreProfesion, textoProfesiones } from '../profesiones'

describe('profesiones', () => {
  it('ids únicos y cada una en un grupo conocido', () => {
    expect(new Set(PROFESIONES.map(p => p.id)).size).toBe(PROFESIONES.length)
    for (const p of PROFESIONES) expect(GRUPOS_PROFESIONES).toContain(p.grupo)
  })

  it('la migración siembra exactamente la misma lista', () => {
    const sql = readFileSync(join(__dirname, '../../../supabase/migrations/20261023120000_perfiles_sello_profesiones_registro.sql'), 'utf8')
    for (const p of PROFESIONES) expect(sql).toContain(`('${p.id}', '${p.nombre.replace(/'/g, "''")}', '${p.grupo}'`)
    expect((sql.match(/^\s*\('[a-z-]+', '[^']*', '[^']*', \d+\)/gm) ?? []).length).toBe(PROFESIONES.length)
  })

  it('nombre y validación', () => {
    expect(nombreProfesion('direccion-escenica')).toBe('Dirección escénica')
    expect(nombreProfesion('inventada')).toBeNull()
    expect(esProfesion('actor')).toBe(true)
    expect(esProfesion('x')).toBe(false)
    expect(esProfesion(3)).toBe(false)
  })

  it('texto para tarjetas: principal primero, máximo 3, ignora ids desconocidos', () => {
    expect(textoProfesiones([])).toBeNull()
    expect(textoProfesiones([
      { specialty: 'dramaturgia', is_primary: false },
      { specialty: 'actor', is_primary: true },
      { specialty: 'raro', is_primary: false },
    ])).toBe('Actor / Actriz · Dramaturgia')
    expect(textoProfesiones([
      { specialty: 'actor', is_primary: true },
      { specialty: 'dramaturgia', is_primary: false },
      { specialty: 'docencia', is_primary: false },
      { specialty: 'produccion', is_primary: false },
    ])).toBe('Actor / Actriz · Dramaturgia · Docencia · +1')
  })
})

import { etiquetaPerfil, ETIQUETA_EQUIPO } from '../profesiones'
it('etiquetaPerfil: equipo, persona con profesiones y organización', () => {
  const tipos = { productora: 'Productora' }
  expect(etiquetaPerfil('profesional', [{ specialty: 'produccion', is_primary: true }, { specialty: 'gestion-cultural', is_primary: false }], tipos)).toBe('Producción · Gestión cultural')
  expect(etiquetaPerfil('profesional', [], tipos)).toBe('Profesional de las artes escénicas')
  expect(etiquetaPerfil('productora', [], tipos)).toBe('Productora')
  expect(etiquetaPerfil('profesional', [], tipos, true)).toBe(ETIQUETA_EQUIPO)
})
