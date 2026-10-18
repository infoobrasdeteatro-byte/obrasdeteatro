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

  it('con alguno activo aparece al final, después de los enlaces legales', async () => {
    estado.hay = true
    const h = await html()
    expect(h).toContain('href="/colaboradores"')
    // Orden de Dirección (18/10/2026): copyright, textos legales y «Colaboradores» al final.
    expect(h.indexOf('href="/colaboradores"')).toBeGreaterThan(h.indexOf('href="/legal/aviso-legal"'))
    expect(h.indexOf('© 2026 obrasdeteatro.com')).toBeLessThan(h.indexOf('href="/legal/aviso-legal"'))
  })
})

describe('SiteFooter — franja «Síguenos»', () => {
  it('enlaza las cinco redes, cada una en pestaña nueva y con nombre accesible', async () => {
    const h = await html()
    expect(h).toContain('Síguenos')
    for (const red of ['Facebook', 'Instagram', 'LinkedIn', 'X', 'WhatsApp']) {
      expect(h).toContain(`aria-label="obrasdeteatro.com en ${red}"`)
    }
    expect(h).toContain('href="https://x.com/obrasdereatro"')
    expect(h.match(/target="_blank" rel="noopener noreferrer"/g)?.length).toBe(5)
  })
})
