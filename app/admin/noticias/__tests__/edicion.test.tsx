import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// Los componentes son de cliente: el router y Supabase no se llegan a usar en
// un render estático, pero sus módulos no deben cargarse de verdad.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }))

import ColaNoticias, { type NoticiaPanel } from '../ColaNoticias'
import EditarCandidata from '../EditarCandidata'
import {
  cambiosDeEdicion,
  categoriasParaEditar,
  contadorResumen,
  puedeEditar,
  validarEdicion,
  type CamposEdicion,
  type CategoriaOpcion,
} from '../edicion'

/** Edición de candidatas en /admin/noticias: funciones puras y render. */

const CATEGORIAS: CategoriaOpcion[] = [
  { id: 'estreno', etiqueta: 'Estreno', activo: true },
  { id: 'premio', etiqueta: 'Premio', activo: true },
  { id: 'formacion', etiqueta: 'Formación', activo: false },
]
const VALIDAS = new Set(['estreno', 'premio'])

const CAMPOS: CamposEdicion = {
  titular: 'Estreno en el Teatro Nacional',
  resumen: 'Resumen breve propio.',
  categoria_id: 'estreno',
  pais_code: 'CL',
}

const NOTICIA: NoticiaPanel = {
  id: 'n1',
  titular: CAMPOS.titular,
  resumen: CAMPOS.resumen,
  categoria: 'Estreno',
  categoriaId: 'estreno',
  pais: 'Chile',
  paisCode: 'CL',
  fuente: 'Revista SATCH',
  fuenteActiva: true,
  urlOriginal: 'https://www.satch.cl/estreno',
  fechaOriginal: null,
  creadaEn: '2026-10-02T10:00:00Z',
  publicadaEn: null,
  origen: 'make',
  lote: 'L1',
}

describe('funciones puras de la edición', () => {
  it('solo las candidatas se editan; las publicadas se retiran', () => {
    expect(puedeEditar('candidata')).toBe(true)
    expect(puedeEditar('publicada')).toBe(false)
    expect(puedeEditar('descartada')).toBe(false)
    expect(puedeEditar('retirada')).toBe(false)
  })

  it('el UPDATE solo lleva los cuatro campos y nunca el estado', () => {
    const cambios = cambiosDeEdicion({ ...CAMPOS, titular: '  Titular con espacios  ' })
    expect(Object.keys(cambios).sort()).toEqual(['categoria_id', 'pais_code', 'resumen', 'titular'])
    expect(cambios).not.toHaveProperty('estado')
    expect(cambios.titular).toBe('Titular con espacios')
  })

  it('valida titular, resumen (máx. 400), categoría y país', () => {
    expect(validarEdicion(CAMPOS, VALIDAS)).toBeNull()
    expect(validarEdicion({ ...CAMPOS, titular: '   ' }, VALIDAS)).toMatch(/titular/)
    expect(validarEdicion({ ...CAMPOS, titular: 't'.repeat(201) }, VALIDAS)).toMatch(/titular/)
    expect(validarEdicion({ ...CAMPOS, resumen: '' }, VALIDAS)).toMatch(/resumen/)
    expect(validarEdicion({ ...CAMPOS, resumen: 'r'.repeat(401) }, VALIDAS)).toMatch(/400/)
    expect(validarEdicion({ ...CAMPOS, resumen: 'r'.repeat(400) }, VALIDAS)).toBeNull()
    expect(validarEdicion({ ...CAMPOS, categoria_id: 'opera' }, VALIDAS)).toMatch(/categoría/)
    expect(validarEdicion({ ...CAMPOS, pais_code: 'BR' }, VALIDAS)).toMatch(/país/)
  })

  it('el selector ofrece las activas y la desactivada que ya tenga la candidata', () => {
    expect(categoriasParaEditar(CATEGORIAS, 'estreno').map(c => c.id)).toEqual(['estreno', 'premio'])
    expect(categoriasParaEditar(CATEGORIAS, 'formacion').map(c => c.id)).toEqual(['estreno', 'premio', 'formacion'])
  })

  it('el contador cuenta sobre 400', () => {
    expect(contadorResumen('')).toBe('0 / 400')
    expect(contadorResumen('abc')).toBe('3 / 400')
  })
})

describe('render', () => {
  it('las candidatas tienen Editar, Publicar y Descartar', () => {
    const html = renderToStaticMarkup(<ColaNoticias modo="candidatas" noticias={[NOTICIA]} categorias={CATEGORIAS} />)
    expect(html).toContain('>Editar<')
    expect(html).toContain('>Publicar<')
    expect(html).toContain('>Descartar<')
  })

  it('las publicadas no se editan: solo Retirar', () => {
    const html = renderToStaticMarkup(
      <ColaNoticias modo="publicadas" noticias={[{ ...NOTICIA, publicadaEn: '2026-10-02T11:00:00Z' }]} />,
    )
    expect(html).toContain('>Retirar<')
    expect(html).not.toContain('>Editar<')
    expect(html).not.toContain('>Publicar<')
  })

  it('el formulario de edición viene relleno, con contador y sin campo de estado', () => {
    const html = renderToStaticMarkup(
      <EditarCandidata id="n1" inicial={CAMPOS} categorias={CATEGORIAS} onGuardada={() => {}} onCancelar={() => {}} />,
    )
    expect(html).toContain(`value="${CAMPOS.titular}"`)
    expect(html).toContain(CAMPOS.resumen)
    expect(html).toContain(`${CAMPOS.resumen.length} / 400`)
    expect(html).toContain('maxLength="400"')
    expect(html).toContain('Guardar no publica')
    expect(html).not.toMatch(/estado/i)
    // Categoría desactivada que la candidata no usa: no se ofrece.
    expect(html).not.toContain('Formación')
  })
})
