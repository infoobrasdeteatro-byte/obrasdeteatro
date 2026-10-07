import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  agruparPorTipo,
  filaDeFormulario,
  intercambiarOrden,
  rutaLogo,
  urlSegura,
  validarColaborador,
  validarLogo,
  type CamposColaborador,
  type ColaboradorPublico,
} from '../colaboradores'

const c = (id: string, tipo: string, orden: number, nombre = id): ColaboradorPublico => ({
  id, nombre, tipo, orden, descripcion: null, pais_code: null, url_web: 'https://ejemplo.org', logo_url: null,
})

const CAMPOS: CamposColaborador = {
  nombre: 'Revista Escena', tipo: 'medio', descripcion: 'Revista de artes escénicas.', pais_code: 'ES',
  url_web: 'https://revistaescena.es', desde: '2026-10-01', noticias_fuente_id: '',
}

describe('agruparPorTipo', () => {
  it('agrupa en el orden Medios, Instituciones, Patrocinadores y omite los vacíos', () => {
    const g = agruparPorTipo([c('p1', 'patrocinador', 1), c('m2', 'medio', 20), c('m1', 'medio', 10)])
    expect(g.map(x => x.titulo)).toEqual(['Medios colaboradores', 'Patrocinadores'])
    expect(g[0].colaboradores.map(x => x.id)).toEqual(['m1', 'm2'])
  })

  it('sin colaboradores, ningún grupo', () => {
    expect(agruparPorTipo([])).toEqual([])
  })
})

describe('validación del formulario y del logo', () => {
  it('válido', () => expect(validarColaborador(CAMPOS)).toBeNull())

  it.each([
    ['nombre vacío', { nombre: '  ' }, /nombre/],
    ['tipo desconocido', { tipo: 'amigo' }, /tipo/],
    ['descripción de más de 200', { descripcion: 'x'.repeat(201) }, /200/],
    ['país fuera del ámbito', { pais_code: 'US' }, /país/],
    ['web sin https', { url_web: 'http://revistaescena.es' }, /https/],
    ['web vacía', { url_web: '' }, /obligatoria/],
  ])('%s: rechazado', (_caso, cambio, motivo) => {
    expect(validarColaborador({ ...CAMPOS, ...cambio })).toMatch(motivo)
  })

  it('la fila nunca lleva activo ni orden, y vacío es null', () => {
    const fila = filaDeFormulario({ ...CAMPOS, descripcion: ' ', pais_code: '', desde: '' })
    expect(fila).not.toHaveProperty('activo')
    expect(fila).not.toHaveProperty('orden')
    expect(fila).toMatchObject({ descripcion: null, pais_code: null, desde: null, noticias_fuente_id: null })
  })

  it('logo: solo SVG, PNG o WebP de hasta 500 KB', () => {
    expect(validarLogo({ type: 'image/png', size: 500 * 1024 })).toBeNull()
    expect(validarLogo({ type: 'image/svg+xml', size: 1000 })).toBeNull()
    expect(validarLogo({ type: 'image/jpeg', size: 1000 })).toMatch(/SVG, PNG o WebP/)
    expect(validarLogo({ type: 'image/webp', size: 500 * 1024 + 1 })).toMatch(/500 KB/)
  })

  it('ruta del logo nueva en cada subida, con su extensión', () => {
    expect(rutaLogo('abc', 'image/svg+xml', 1)).toBe('abc/logo-1.svg')
    expect(rutaLogo('abc', 'image/webp', 2)).toBe('abc/logo-2.webp')
  })

  it('solo https se usa como enlace o imagen', () => {
    expect(urlSegura('https://a.org/x.png')).toBe('https://a.org/x.png')
    expect(urlSegura('http://a.org')).toBeNull()
    expect(urlSegura('javascript:alert(1)')).toBeNull()
  })
})

describe('ordenar', () => {
  it('intercambia el orden de dos colaboradores', () => {
    expect(intercambiarOrden({ id: 'a', orden: 10 }, { id: 'b', orden: 20 })).toEqual([{ id: 'a', orden: 20 }, { id: 'b', orden: 10 }])
  })
  it('con el mismo orden, los separa para que el cambio se note', () => {
    expect(intercambiarOrden({ id: 'a', orden: 10 }, { id: 'b', orden: 10 })).toEqual([{ id: 'a', orden: 11 }, { id: 'b', orden: 10 }])
  })
})

describe('migración 20261007120000 — contratos', () => {
  const CODIGO = readFileSync(
    join(__dirname, '..', '..', '..', 'supabase', 'migrations', '20261007120000_colaboradores.sql'), 'utf-8',
  ).replace(/--.*$/gm, '')

  it('nace inactivo y la lectura pública solo ve activos', () => {
    expect(CODIGO).toMatch(/activo boolean not null default false/)
    expect(CODIGO).toMatch(/for select\s+using \(activo = true\)/)
  })

  it('escritura solo de moderación, también en Storage', () => {
    expect(CODIGO).toMatch(/on public\.colaboradores for all\s+using \(public\.es_moderador\(\)\)\s+with check \(public\.es_moderador\(\)\)/)
    expect(CODIGO).toMatch(/revoke insert, update, delete, truncate on public\.colaboradores from anon/)
    expect(CODIGO.match(/bucket_id = 'colaboradores' and public\.es_moderador\(\)/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it('bucket público con SVG, PNG o WebP de hasta 500 KB', () => {
    expect(CODIGO).toMatch(/values \('colaboradores', 'colaboradores', true, 512000, array\['image\/svg\+xml', 'image\/png', 'image\/webp'\]\)/)
  })

  it('descripción ≤ 200, url_web https y tipos cerrados', () => {
    expect(CODIGO).toMatch(/char_length\(descripcion\) <= 200/)
    expect(CODIGO).toMatch(/url_web ~\* '\^https:\/\//)
    expect(CODIGO).toMatch(/tipo in \('medio', 'institucion', 'patrocinador'\)/)
    expect(CODIGO).toMatch(/noticias_fuente_id uuid references public\.noticias_fuentes \(id\) on delete set null/)
  })
})
