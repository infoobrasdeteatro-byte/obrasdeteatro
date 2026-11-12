import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BotonInstalar, EnlaceInstalarMenu, TarjetaInstalar } from '../Instalar'

// En servidor no se conoce el dispositivo: nada que dependa de él se pinta.
describe('Instalar — renderizado en servidor', () => {
  it('el menú móvil enlaza a /app', () => {
    const h = renderToStaticMarkup(<EnlaceInstalarMenu />)
    expect(h).toContain('<a class="nav-mobile-link" href="/app">Instalar la aplicación</a>')
    expect(h).toContain('Aplicación')
  })

  it('la tarjeta del panel no se pinta hasta conocer el dispositivo', () => {
    expect(renderToStaticMarkup(<TarjetaInstalar />)).toBe('')
  })

  it('el botón de /app reserva su hueco, invisible y oculto al lector de pantalla', () => {
    const h = renderToStaticMarkup(<BotonInstalar />)
    expect(h).toContain('aria-hidden="true"')
    expect(h).toContain('visibility:hidden')
    expect(h).not.toContain('<button')
    expect(h).not.toContain('<a ')
  })
})
