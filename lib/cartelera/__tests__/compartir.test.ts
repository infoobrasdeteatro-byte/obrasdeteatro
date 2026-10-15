import { describe, it, expect } from 'vitest'
import { enlacesCompartir, textoCompartir } from '@/components/cartelera/Compartir'

describe('compartir', () => {
  it('texto con título, fecha y lugar', () => {
    expect(textoCompartir('El Método Grönholm', 'Sáb 24 oct 2026 · 19:30 h', 'Centro Cultural Chacao, Caracas'))
      .toBe('El Método Grönholm\nSáb 24 oct 2026 · 19:30 h · Centro Cultural Chacao, Caracas')
    expect(textoCompartir('Yerma')).toBe('Yerma')
  })
  it('enlaces de cada red con la URL codificada', () => {
    const r = enlacesCompartir('https://www.obrasdeteatro.com/cartelera/el-metodo-gronholm', 'El Método')
    expect(r.map(x => x.red)).toEqual(['WhatsApp', 'Facebook', 'X', 'Telegram', 'LinkedIn', 'Correo'])
    expect(r[0].href).toContain('https://wa.me/?text=')
    expect(r[1].href).toBe('https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.obrasdeteatro.com%2Fcartelera%2Fel-metodo-gronholm')
    expect(r[5].href.startsWith('mailto:?subject=El%20M%C3%A9todo')).toBe(true)
  })
})
