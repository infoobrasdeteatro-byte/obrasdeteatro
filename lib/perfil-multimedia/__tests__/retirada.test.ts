import { describe, it, expect } from 'vitest'
import { retirarElemento, type ElementoRetirable } from '../retirada'

function cliente({ falloArchivo = false, falloFila = false } = {}) {
  const pasos: string[] = []
  return {
    pasos,
    supabase: {
      storage: {
        from: (bucket: string) => ({
          remove: async (rutas: string[]) => {
            pasos.push(`archivo:${bucket}:${rutas.join(',')}`)
            return { error: falloArchivo ? { message: 'sin permiso' } : null }
          },
        }),
      },
      from: (tabla: string) => ({
        delete: () => ({
          eq: async (_c: string, id: string) => {
            pasos.push(`fila:${tabla}:${id}`)
            return { error: falloFila ? { message: 'sin permiso' } : null }
          },
        }),
      }),
    },
  }
}

describe('retirada desde /admin/galeria', () => {
  it('foto: borra primero el archivo y después la fila', async () => {
    const c = cliente()
    const foto: ElementoRetirable = { tipo: 'foto', id: 'f1', ruta: 'u1/fotos/a.webp' }
    expect(await retirarElemento(c.supabase, foto)).toBeNull()
    expect(c.pasos).toEqual(['archivo:galeria:u1/fotos/a.webp', 'fila:perfil_galeria_fotos:f1'])
  })

  it('si el archivo no se puede borrar, la fila no se toca', async () => {
    const c = cliente({ falloArchivo: true })
    const r = await retirarElemento(c.supabase, { tipo: 'foto', id: 'f1', ruta: 'u1/fotos/a.webp' })
    expect(r).toMatch(/archivo/)
    expect(c.pasos).toEqual(['archivo:galeria:u1/fotos/a.webp'])
  })

  it('vídeo: solo la fila (no hay archivo)', async () => {
    const c = cliente()
    expect(await retirarElemento(c.supabase, { tipo: 'video', id: 'v1' })).toBeNull()
    expect(c.pasos).toEqual(['fila:perfil_galeria_videos:v1'])
  })

  it('proyecto: su imagen, si la tiene, y la fila', async () => {
    const c = cliente()
    await retirarElemento(c.supabase, { tipo: 'proyecto', id: 'p1', imagen_ruta: 'u1/portfolio/b.webp' })
    expect(c.pasos).toEqual(['archivo:galeria:u1/portfolio/b.webp', 'fila:perfil_portfolio:p1'])
    const sinImagen = cliente()
    await retirarElemento(sinImagen.supabase, { tipo: 'proyecto', id: 'p2', imagen_ruta: null })
    expect(sinImagen.pasos).toEqual(['fila:perfil_portfolio:p2'])
  })

  it('error al borrar la fila: se informa', async () => {
    const c = cliente({ falloFila: true })
    expect(await retirarElemento(c.supabase, { tipo: 'video', id: 'v1' })).toMatch(/fila/)
  })
})
