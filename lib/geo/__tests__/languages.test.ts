import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { LANGUAGES, languageName } from '../languages'

const APP = join(__dirname, '..', '..', '..', 'app', 'obras')
const PAGINA_OBRA = readFileSync(join(APP, '[slug]', 'page.tsx'), 'utf-8')
const FORMULARIOS = {
  alta: readFileSync(join(APP, 'nueva', 'NuevaObraForm.tsx'), 'utf-8'),
  edicion: readFileSync(join(APP, '[slug]', 'editar', 'EditarObraForm.tsx'), 'utf-8'),
}

describe('languageName', () => {
  it('traduce el codigo al nombre del idioma', () => {
    expect(languageName('es')).toBe('Español')
    expect(languageName('en')).toBe('Inglés')
  })

  it('un codigo que no esta en la tabla se muestra tal cual', () => {
    expect(languageName('xx')).toBe('xx')
    expect(languageName('')).toBe('')
  })
})

describe('LANGUAGES', () => {
  it('conserva todos los codigos de las tablas que sustituye, con el mismo nombre', () => {
    expect(LANGUAGES.map((language) => [language.code, language.name])).toEqual([
      ['es', 'Español'],
      ['ca', 'Catalán'],
      ['eu', 'Euskera'],
      ['gl', 'Gallego'],
      ['va', 'Valenciano'],
      ['en', 'Inglés'],
      ['fr', 'Francés'],
      ['pt', 'Portugués'],
      ['de', 'Alemán'],
      ['it', 'Italiano'],
      ['otro', 'Otro'],
    ])
  })

  it('cada opcion tiene nombre y ningun codigo se repite', () => {
    for (const language of LANGUAGES) {
      expect(language.name.trim(), language.code).not.toBe('')
      expect(language.name, language.code).not.toBe(language.code)
    }
    expect(new Set(LANGUAGES.map((language) => language.code)).size).toBe(LANGUAGES.length)
  })
})

describe('una sola tabla de idiomas para las obras', () => {
  it('los dos formularios pintan sus opciones desde LANGUAGES, con su nombre', () => {
    for (const [formulario, fuente] of Object.entries(FORMULARIOS)) {
      expect(fuente, formulario).toMatch(/import \{ LANGUAGES \} from '@\/lib\/geo\/languages'/)
      expect(fuente, formulario).toMatch(/LANGUAGES\.map\(l => \(/)
      expect(fuente, formulario).toMatch(/<option key=\{l\.code\} value=\{l\.code\}>\{l\.name\}<\/option>/)
      expect(fuente, formulario).not.toMatch(/const IDIOMAS\b/)
    }
  })

  it('la pagina de la obra usa la misma tabla, sin una propia', () => {
    expect(PAGINA_OBRA).toMatch(/import \{ languageName \} from '@\/lib\/geo\/languages'/)
    expect(PAGINA_OBRA).toMatch(/languageName\(obra\.language\)/)
    expect(PAGINA_OBRA).not.toMatch(/IDIOMA_LABEL/)
  })
})
