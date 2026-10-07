import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const estado = { hay: false }

vi.mock('@/lib/colaboradores/datos', () => ({
  hayColaboradoresActivos: async () => estado.hay,
}))

import SiteFooter from '../SiteFooter'

const html = async () => renderToStaticMarkup(await SiteFooter())

beforeEach(() => { estado.hay = false })

describe('SiteFooter — enlace «Colaboradores»', () => {
  it('sin colaboradores activos no aparece', async () => {
    const h = await html()
    expect(h).not.toContain('href="/colaboradores"')
    expect(h).not.toContain('Sobre ObrasDeTeatro')
    // Los enlaces legales siguen ahí.
    expect(h).toContain('href="/legal/aviso-legal"')
  })

  it('con alguno activo aparece, junto a los enlaces legales', async () => {
    estado.hay = true
    const h = await html()
    expect(h).toContain('href="/colaboradores"')
    expect(h.indexOf('href="/colaboradores"')).toBeLessThan(h.indexOf('href="/legal/aviso-legal"'))
  })
})
