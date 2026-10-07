import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import FranjaColaboradores from '../FranjaColaboradores'
import type { ColaboradorPublico } from '@/lib/colaboradores/colaboradores'

const colaboradores = (n: number): ColaboradorPublico[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `c${i}`, nombre: `Medio ${i}`, tipo: 'medio', orden: i, descripcion: null, pais_code: null,
    url_web: `https://medio${i}.org`, logo_url: `https://cdn.ejemplo.org/logo${i}.png`,
  }))

const html = (n: number) => renderToStaticMarkup(<FranjaColaboradores colaboradores={colaboradores(n)} />)

describe('FranjaColaboradores', () => {
  it('sin colaboradores activos no se pinta', () => {
    expect(html(0)).toBe('')
  })

  it('con menos de 6: fila estática, sin carrusel ni copias', () => {
    const h = html(3)
    expect(h).toContain('class="colab-fila"')
    expect(h).not.toContain('colab-carrusel')
    expect(h.match(/<li/g)).toHaveLength(3)
    expect(h).not.toContain('aria-hidden')
  })

  it('con 6 o más: carrusel con la lista dos veces y la copia oculta y fuera del tabulador', () => {
    const h = html(6)
    expect(h).toContain('class="colab-carrusel"')
    expect(h.match(/<li/g)).toHaveLength(12)
    expect(h.match(/aria-hidden="true"/g)).toHaveLength(6)
    expect(h.match(/tabindex="-1"/gi)).toHaveLength(6)
    expect(h).toContain('--colab-duracion:36s')
  })

  it('cada logo enlaza a su web en otra pestaña con noopener, y hay enlace a /colaboradores', () => {
    const h = html(3)
    expect(h).toContain('href="https://medio0.org" target="_blank" rel="noopener"')
    expect(h).toContain('alt="Medio 0"')
    expect(h).toContain('href="/colaboradores"')
    expect(h).toContain('Ver todos los colaboradores →')
  })

  it('un logo que no es https no se pinta como imagen: sale el nombre', () => {
    const h = renderToStaticMarkup(
      <FranjaColaboradores colaboradores={[{ ...colaboradores(1)[0], logo_url: 'http://inseguro.org/l.png' }]} />,
    )
    expect(h).not.toContain('<img')
    expect(h).toContain('colab-logo-texto')
  })
})
