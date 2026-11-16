import { describe, it, expect } from 'vitest'
import robots, { RUTAS_NO_RASTREABLES } from '@/app/robots'
import { SECCIONES_SITEMAP } from '../sitemap-datos'

describe('robots.txt', () => {
  const r = robots()
  const regla = Array.isArray(r.rules) ? r.rules[0] : r.rules

  it('deja rastrear el sitio público y señala el sitemap', () => {
    expect(regla.userAgent).toBe('*')
    expect(regla.allow).toBe('/')
    expect(r.sitemap).toBe('https://www.obrasdeteatro.com/sitemap.xml')
  })

  it('excluye las zonas privadas, la API y la autenticación', () => {
    for (const ruta of ['/admin', '/api/', '/auth/', '/dashboard', '/cuenta']) {
      expect(regla.disallow).toContain(ruta)
    }
  })

  it('no bloquea ninguna portada de sección del sitemap ni las fichas públicas', () => {
    const publicas = [...SECCIONES_SITEMAP.map(s => s.ruta), '/obras/la-vida-es-sueno', '/perfil/alguien', '/espacios/teatro-x', '/convocatoria/123']
    for (const ruta of publicas) {
      const bloqueada = RUTAS_NO_RASTREABLES.some(no => ruta === no || ruta.startsWith(no.endsWith('/') || no.endsWith('-') ? no : `${no}/`))
      expect(bloqueada, ruta).toBe(false)
    }
  })
})
