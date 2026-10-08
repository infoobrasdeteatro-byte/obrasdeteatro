import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// next/image fuera de Next: una <img> normal basta para comprobar el marcado.
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

import VideosPerfil from '../VideosPerfil'
import GaleriaFotos from '../GaleriaFotos'
import PortfolioPerfil from '../PortfolioPerfil'

describe('vídeos del perfil público', () => {
  it('al cargar no hay iframe: solo miniatura y botón de reproducir', () => {
    const h = renderToStaticMarkup(
      <VideosPerfil videos={[
        { id: 'a', plataforma: 'youtube', videoId: 'dQw4w9WgXcQ', titulo: 'Tráiler' },
        { id: 'b', plataforma: 'vimeo', videoId: '76979871', titulo: null },
      ]} />,
    )
    expect(h).not.toContain('<iframe')
    expect(h).not.toContain('youtube-nocookie.com')
    expect(h).toContain('aria-label="Reproducir: Tráiler"')
    expect(h).toContain('aria-label="Reproducir: Vídeo de Vimeo"')
    expect(h).toContain('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
  })

  it('sin vídeos no se pinta', () => {
    expect(renderToStaticMarkup(<VideosPerfil videos={[]} />)).toBe('')
  })
})

describe('galería del perfil público', () => {
  it('cada miniatura es un botón con texto alternativo y hay un visor <dialog>', () => {
    const h = renderToStaticMarkup(
      <GaleriaFotos fotos={[{ id: 'f1', url: 'https://x.supabase.co/a.webp', alt: 'Ensayo general', pie: 'Ensayo general', credito: '© Ana' }]} />,
    )
    expect(h).toContain('aria-label="Ver a pantalla completa: Ensayo general"')
    expect(h).toContain('alt="Ensayo general"')
    expect(h).toContain('<dialog')
  })

  it('sin fotos no se pinta', () => {
    expect(renderToStaticMarkup(<GaleriaFotos fotos={[]} />)).toBe('')
  })
})

describe('portfolio del perfil público', () => {
  it('pinta título, año · rol · compañía y solo enlaces https', () => {
    const h = renderToStaticMarkup(
      <PortfolioPerfil nombre="Ana" proyectos={[
        { id: 'p1', titulo: 'Yerma', anio: 2023, rol: 'Dirección', compania: 'Cía. Sur', descripcion: null, imagenUrl: null, enlace: 'https://yerma.es' },
        { id: 'p2', titulo: 'Otra', anio: null, rol: null, compania: null, descripcion: null, imagenUrl: null, enlace: 'javascript:alert(1)' },
      ]} />,
    )
    expect(h).toContain('Yerma')
    expect(h).toContain('2023 · Dirección · Cía. Sur')
    expect(h).toContain('href="https://yerma.es"')
    expect(h).not.toContain('javascript:')
  })
})
