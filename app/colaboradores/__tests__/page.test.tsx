import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ColaboradorPublico } from '@/lib/colaboradores/colaboradores'

const estado = { lista: [] as ColaboradorPublico[] }

vi.mock('@/lib/colaboradores/datos', () => ({
  colaboradoresActivos: async () => estado.lista,
}))
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_NOT_FOUND') },
}))
vi.mock('@/components/design-system/TopNav', () => ({ default: () => null }))

import ColaboradoresPage from '../page'

const medio: ColaboradorPublico = {
  id: 'm1', nombre: 'Revista Escena', tipo: 'medio', orden: 1, descripcion: 'Revista de artes escénicas.',
  pais_code: 'ES', url_web: 'https://revistaescena.es', logo_url: null,
}

beforeEach(() => { estado.lista = [] })

describe('/colaboradores', () => {
  it('sin ningún colaborador activo: 404', async () => {
    await expect(ColaboradoresPage()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('con colaboradores: grupos, sin el texto de «Pronto…» y con el bloque para colaborar', async () => {
    estado.lista = [medio]
    const h = renderToStaticMarkup(await ColaboradoresPage())
    expect(h).toContain('Medios colaboradores')
    expect(h).toContain('Revista Escena')
    expect(h).not.toContain('Pronto presentaremos')
    expect(h).toContain('¿Quieres colaborar con obrasdeteatro.com?')
    expect(h).toContain('href="mailto:hola@obrasdeteatro.com?subject=Colaboraci%C3%B3n%20con%20obrasdeteatro.com"')
    // El bloque va al final, después de los grupos.
    expect(h.indexOf('Revista Escena')).toBeLessThan(h.indexOf('¿Quieres colaborar'))
  })
})
