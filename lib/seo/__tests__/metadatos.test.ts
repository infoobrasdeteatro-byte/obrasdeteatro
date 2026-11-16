import { describe, it, expect } from 'vitest'
import {
  MAX_DESCRIPCION, MAX_TITULO, conMarca, descripcionConvocatoria, descripcionObra, esAnonimo,
  jsonLdObra, jsonLdSitio, recortar, tituloConvocatoria, tituloObra,
} from '../metadatos'

const obra = { title: 'La dama comendador', author: 'Pedro Lanini y Sagredo', genre: 'Comedia', year: null, rights_status: 'public_domain', sinopsis: null }

describe('recortar', () => {
  it('no toca lo que cabe y corta por palabra lo que no', () => {
    expect(recortar('  Texto   breve ', 50)).toBe('Texto breve')
    const r = recortar('una frase bastante larga que no cabe en el límite', 20)
    expect(r.length).toBeLessThanOrEqual(20)
    expect(r.endsWith('…')).toBe(true)
    expect(r).not.toMatch(/\s…$/)
  })
})

describe('título de obra', () => {
  it('lleva título, autor y marca', () => {
    expect(tituloObra(obra)).toBe('La dama comendador · Pedro Lanini y Sagredo | ObrasDeTeatro®')
  })
  it('las anónimas lo dicen entre paréntesis', () => {
    expect(esAnonimo('Anónimo')).toBe(true)
    expect(tituloObra({ title: 'El amor niño', author: 'Anónimo' })).toBe('El amor niño (anónimo) | ObrasDeTeatro®')
  })
  it('suelta la marca, y después recorta, cuando no cabe', () => {
    const t = tituloObra({ title: 'El mayor monstruo los celos y tetrarca de Jerusalén', author: 'Pedro Calderón de la Barca' })
    expect(t.length).toBeLessThanOrEqual(MAX_TITULO)
    expect(t).not.toContain('ObrasDeTeatro')
  })
})

describe('descripción de obra', () => {
  it('usa la sinopsis si existe', () => {
    expect(descripcionObra({ ...obra, sinopsis: 'Una sinopsis propia.' })).toBe('Una sinopsis propia.')
  })
  it('sin sinopsis, se construye con género, autor, año y acceso', () => {
    expect(descripcionObra({ ...obra, year: 1680 })).toBe(
      '«La dama comendador»: comedia de Pedro Lanini y Sagredo (1680). Texto completo de libre acceso, en dominio público, en la biblioteca de ObrasDeTeatro®.',
    )
  })
  it('«Teatro» se dice «obra de teatro» y las anónimas, «de autor anónimo»', () => {
    expect(descripcionObra({ ...obra, genre: 'Teatro', author: 'Anónimo' })).toContain(': obra de teatro de autor anónimo.')
  })
  it('no promete el texto libre si no es dominio público', () => {
    expect(descripcionObra({ ...obra, rights_status: 'managed' })).not.toContain('libre acceso')
  })
  it('nunca pasa del máximo, por largo que sea el título', () => {
    const d = descripcionObra({ ...obra, title: 'x'.repeat(300) })
    expect(d.length).toBeLessThanOrEqual(MAX_DESCRIPCION)
  })
})

describe('datos estructurados de obra', () => {
  it('schema.org/Play con autor y acceso libre', () => {
    const j = jsonLdObra({ ...obra, slug: 'la-dama', idioma: 'es' }, 'https://www.obrasdeteatro.com')
    expect(j['@type']).toBe('Play')
    expect(j.url).toBe('https://www.obrasdeteatro.com/obras/la-dama')
    expect(j.author).toEqual({ '@type': 'Person', name: 'Pedro Lanini y Sagredo' })
    expect(j.isAccessibleForFree).toBe(true)
  })
  it('las anónimas no llevan autor', () => {
    expect(jsonLdObra({ ...obra, author: 'Anónimo', slug: 'x' }, 'https://s')).not.toHaveProperty('author')
  })
})

describe('convocatorias', () => {
  const c = { title: 'Premio de Teatro Infantil Xaro Vidal', categoria: 'Premio', entidad: 'Ayuntamiento de Carcaixent', lugar: 'Carcaixent, España', plazo: '23 nov 2026', dotacion: '3.000 €' }
  it('el título es el de la convocatoria, con sección y marca si caben', () => {
    expect(tituloConvocatoria(c)).toBe('Premio de Teatro Infantil Xaro Vidal | ObrasDeTeatro®')
    expect(tituloConvocatoria({ title: 'Becas' })).toBe('Becas | Convocatorias · ObrasDeTeatro®')
    expect(conMarca('x'.repeat(80)).length).toBeLessThanOrEqual(MAX_TITULO)
  })
  it('la descripción reúne tipo, entidad, lugar, plazo y dotación', () => {
    expect(descripcionConvocatoria(c)).toBe(
      'Premio. Convoca: Ayuntamiento de Carcaixent (Carcaixent, España). Plazo hasta el 23 nov 2026. Dotación: 3.000 €. Bases y enlace oficial.',
    )
  })
  it('funciona sin datos opcionales', () => {
    expect(descripcionConvocatoria({ title: 'X', categoria: null, entidad: null, lugar: null, plazo: null, dotacion: null })).toBe('Convocatoria. Bases y enlace oficial.')
  })
})

describe('datos estructurados del sitio', () => {
  it('Organization y WebSite', () => {
    const [org, web] = jsonLdSitio('https://www.obrasdeteatro.com', ['https://x.com/a'])
    expect(org['@type']).toBe('Organization')
    expect(org.sameAs).toEqual(['https://x.com/a'])
    expect(web['@type']).toBe('WebSite')
  })
})
