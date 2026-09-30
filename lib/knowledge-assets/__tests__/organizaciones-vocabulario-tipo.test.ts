import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { createClient } from '@/lib/supabase/server'
import { __resetCacheForTests } from '@/lib/verified/sistemas-cache/with-cache'
import { ORGANIZATION_PROFILE_TYPES } from '@/lib/repository-layer'
import { TRADUCCION_TIPO_A_PERFIL } from '@/lib/repository-layer/organization-profiles'
import type { Organization } from '@/lib/repository-layer'
import { retrieveRelevantKnowledge } from '../semantic-retriever'
import { interpretOrganizationQuery, TIPOS_SIN_TRADUCCION, unappliedTypeCriteria } from '../interpret-organization-query'
import { normalizeText } from '@/lib/request-interpreter/normalize-text'
import { normalizeRequest } from '@/lib/request-interpreter'
import { buildKnowledgeContext, partiallyAppliedCriteriaNote, unfilteredCriteriaNote } from '@/lib/scenaia-knowledge-model'
import { composePrompt } from '@/lib/prompt-composer'
import { buildDirectContent } from '@/lib/direct-content-builder'
import type { NormalizedRequest } from '@/lib/request-interpreter'

/**
 * SCENAIA-009 (§4 y §7): traducción cerrada theater → teatro y company →
 * compania al filtrar perfiles, y aviso de tipo no aplicado para productora,
 * escuela e institución (variante (ii)). Solo se simula el cliente de
 * Supabase: Repository Layer, los intérpretes, el recuperador, el Knowledge
 * Model, el Prompt Composer y el Direct Content Builder son REALES. El
 * cliente simulado aplica los filtros sobre filas en memoria y registra cada
 * consulta, para comprobar qué tipo recibe cada tabla.
 */
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

type Fila = Record<string, unknown>
interface Consulta { tabla: string; filtros: [string, string, unknown][] }

let tablas: Record<string, Fila[]> = {}
let consultas: Consulta[] = []

function clienteSimulado() {
  return {
    from(tabla: string) {
      const consulta: Consulta = { tabla, filtros: [] }
      consultas.push(consulta)
      const ejecutar = () => {
        const filas = (tablas[tabla] ?? []).filter((fila) =>
          consulta.filtros.every(([op, col, val]) => {
            const v = fila[col]
            if (op === 'eq') return v === val
            if (op === 'ilike') return typeof v === 'string' && v.toLowerCase() === String(val).toLowerCase()
            if (op === 'in') return (val as unknown[]).includes(v)
            if (op === 'is') return v === val
            return true
          })
        )
        return Promise.resolve({ data: filas, error: null })
      }
      const builder = {
        select: () => builder,
        eq: (col: string, val: unknown) => (consulta.filtros.push(['eq', col, val]), builder),
        ilike: (col: string, val: unknown) => (consulta.filtros.push(['ilike', col, val]), builder),
        in: (col: string, val: unknown) => (consulta.filtros.push(['in', col, val]), builder),
        is: (col: string, val: unknown) => (consulta.filtros.push(['is', col, val]), builder),
        limit: () => ejecutar(),
      }
      return builder
    },
  }
}

const BIBLIOTECA = { id: 'i-1', name: 'Biblioteca Oficial', type: 'platform', country_code: null, region: null, ciudad: null, website: null, slug: 'biblioteca', is_public: true, is_active: true }
const INSTITUCION_MADRID = { ...BIBLIOTECA, id: 'i-2', name: 'Fundación de Madrid', type: 'foundation', ciudad: 'Madrid', slug: 'fundacion-madrid' }
const perfil = (id: string, nombre: string, tipo: string, extra: Fila = {}) => ({
  id, nombre, nombre_artistico: null, tipo_perfil: tipo, ciudad: null, region: null, country_code: 'ES', slug: id,
  website_url: null, perfil_publico: true, activo: true, deleted_at: null, ...extra,
})
// Mismo tipo y visibilidad que el perfil de teatro de producción (30-09).
const PERFIL_TEATRO = perfil('p-teatro', 'Teatro Simulado', 'teatro')
const PERFIL_COMPANIA = perfil('p-compania', 'Compañía Simulada', 'compania')
const PERFIL_PRODUCTORA_OCULTA = perfil('p-productora', 'Productora Oculta', 'productora', { perfil_publico: false })

function catalogo(instituciones: Fila[], perfiles: Fila[]) {
  tablas = { institutions: instituciones, profiles: perfiles }
}

function peticion(texto: string): NormalizedRequest {
  const q = normalizeText(texto)
  return {
    requestId: 'req-009', originalRequest: texto, normalizedIntent: q, retrievalQuery: q,
    requestsFullCatalog: false, requestsPlainListing: false, requestType: 'RECONOCIDA',
    requestedKnowledgeDomains: ['Organizaciones'], estimatedComplexity: 'baja',
    professionalContextLevel: 'STANDARD', detectedAmbiguities: [], interpretationConfidence: 1,
    timestamp: '2026-09-30T00:00:00.000Z',
  }
}

const PARCIAL = partiallyAppliedCriteriaNote('Organizaciones')
const SIN_FILTRAR = unfilteredCriteriaNote('Organizaciones')
const nombres = (items: readonly { data: unknown }[]) => items.map((i) => (i.data as Organization).name).sort()

async function turno(texto: string) {
  const req = peticion(texto)
  const r = await retrieveRelevantKnowledge('Organizaciones', req.retrievalQuery)
  __resetCacheForTests()
  const ctx = await buildKnowledgeContext(req, {})
  return { r, ctx, prompt: composePrompt(req, ctx), directo: buildDirectContent(ctx) }
}

/** Tipo con el que se filtró cada tabla en la última búsqueda (excluida la de ubicaciones). */
function tipoFiltrado(tabla: 'institutions' | 'profiles', columna: 'type' | 'tipo_perfil') {
  return consultas
    .filter((c) => c.tabla === tabla && !(tabla === 'institutions' && c.filtros.length === 2))
    .flatMap((c) => c.filtros.filter(([op, col]) => op === 'eq' && col === columna).map(([, , v]) => v))
}

beforeEach(() => {
  __resetCacheForTests()
  consultas = []
  catalogo([BIBLIOTECA], [PERFIL_TEATRO, PERFIL_COMPANIA, PERFIL_PRODUCTORA_OCULTA])
  vi.mocked(createClient).mockResolvedValue(clienteSimulado() as never)
})

describe('traducción theater → teatro y company → compania (§4.1 y §7.1)', () => {
  it.each(['teatros', 'salas', 'teatro barroco'])('"%s" encuentra el perfil de teatro', async (texto) => {
    const { r } = await turno(texto)
    expect(nombres(r.items)).toEqual(['Teatro Simulado'])
  })

  it('"teatro barroco" lleva además la nota parcial de la 008 y el aviso a la IA', async () => {
    const { r, ctx, prompt } = await turno('teatro barroco')
    expect(r.unappliedCriteria).toEqual(['epoca'])
    expect(ctx.knowledgeLimitations).toContain(PARCIAL)
    expect(prompt).toContain('Organizaciones: el listado esta filtrado solo EN PARTE')
  })

  it('"compañías" encuentra el perfil de compañía público', async () => {
    const { r } = await turno('compañías')
    expect(nombres(r.items)).toEqual(['Compañía Simulada'])
    expect(r.unappliedCriteria).toEqual([])
  })

  it('un perfil no público no aparece nunca', async () => {
    const { r } = await turno('productoras')
    expect(nombres(r.items)).not.toContain('Productora Oculta')
  })
})

describe('aislamiento: la traducción solo alcanza al filtro de perfiles (§7.5)', () => {
  it.each([
    ['teatros', 'theater', 'teatro'],
    ['compañías', 'company', 'compania'],
    ['festivales', 'festival', 'festival'],
  ])('"%s": institutions filtra por %s y perfiles por %s', async (texto, deInstitutions, dePerfiles) => {
    await retrieveRelevantKnowledge('Organizaciones', normalizeText(texto))
    expect(tipoFiltrado('institutions', 'type')).toEqual([deInstitutions])
    expect(tipoFiltrado('profiles', 'tipo_perfil')).toEqual([dePerfiles])
  })

  it('los resultados devuelven el tipo_perfil real, no el traducido', async () => {
    const { r } = await turno('teatros')
    expect(r.items.map((i) => (i.data as Organization).type)).toEqual(['teatro'])
  })

  it('la tabla de traducción es cerrada: exactamente dos entradas, y festival no está', () => {
    expect([...TRADUCCION_TIPO_A_PERFIL.entries()]).toEqual([['theater', 'teatro'], ['company', 'compania']])
  })
})

describe('productora, escuela e institución sin más criterio (§4.3 y §7.2)', () => {
  it.each(['productoras', 'escuelas', 'instituciones'])(
    '"%s": abre Organizaciones, declara el tipo, nota de sin filtrar y aviso a la IA',
    async (texto) => {
      expect(normalizeRequest(texto, 'id').requestedKnowledgeDomains).toEqual(['Organizaciones'])
      const { r, ctx, prompt } = await turno(texto)
      expect(interpretOrganizationQuery(normalizeText(texto))).toEqual({})
      expect(r.requestWasNarrowed).toBe(false)
      expect(r.unappliedCriteria).toEqual(['tipo'])
      expect(nombres(r.items)).toEqual(['Biblioteca Oficial', 'Compañía Simulada', 'Teatro Simulado'])
      expect(ctx.knowledgeLimitations).toContain(SIN_FILTRAR)
      expect(prompt).toContain('Organizaciones: el listado NO esta filtrado por el criterio pedido.')
    }
  )

  it.each(['productoras', 'escuelas', 'instituciones'])('"%s" con cero resultados: el texto directo de sin filtrar', async (texto) => {
    catalogo([], [])
    const { directo } = await turno(texto)
    expect(directo).toBe('En organizaciones no he podido aplicar el criterio que pedías, y tampoco he encontrado ningún resultado.')
  })
})

describe('con otro criterio aplicado: nota parcial (§7.3 y §7.4)', () => {
  it('"productoras en Madrid" con Madrid resuelto: nota parcial', async () => {
    catalogo([BIBLIOTECA, INSTITUCION_MADRID], [PERFIL_TEATRO])
    const { r, ctx } = await turno('productoras en Madrid')
    expect(interpretOrganizationQuery(normalizeText('productoras en madrid'), { regions: [], cities: ['Madrid'] })).toEqual({ city: 'Madrid' })
    expect(r.requestWasNarrowed).toBe(true)
    expect(r.unappliedCriteria).toEqual(['tipo'])
    expect(ctx.knowledgeLimitations).toContain(PARCIAL)
  })

  it('variante (ii): "escuelas de teatro" aplica el tipo theater, avisa de la escuela y lleva nota parcial', async () => {
    const { r, ctx } = await turno('escuelas de teatro')
    expect(interpretOrganizationQuery(normalizeText('escuelas de teatro'))).toEqual({ type: 'theater' })
    expect(nombres(r.items)).toEqual(['Teatro Simulado'])
    expect(r.unappliedCriteria).toEqual(['tipo'])
    expect(ctx.knowledgeLimitations).toContain(PARCIAL)
  })

  it('"teatros" y "salas" no declaran tipo: se aplican del todo', async () => {
    for (const texto of ['teatros', 'salas']) expect(unappliedTypeCriteria(normalizeText(texto)), texto).toEqual([])
  })
})

describe('palabra completa, no subcadena', () => {
  it.each([
    ['reproductoras de video', []],
    ['apoyo institucional', []],
    ['una escuela', ['tipo']],
    ['institución cultural', ['tipo']],
  ])('"%s" → %j', (texto, esperado) => {
    expect(unappliedTypeCriteria(normalizeText(texto))).toEqual(esperado)
  })
})

describe('sincronía del vocabulario del §4.4 con ORGANIZATION_PROFILE_TYPES (§7.6)', () => {
  // Valores del CHECK real de institutions.type (mismo listado que el invariante vigente).
  const TIPOS_INSTITUTIONS = ['platform', 'editorial', 'university', 'cultural_org', 'foundation', 'festival', 'other', 'company', 'theater']
  const traducidos = [...TRADUCCION_TIPO_A_PERFIL.values()]
  const sinTraduccion = ORGANIZATION_PROFILE_TYPES.filter((t) => !traducidos.includes(t) && !TIPOS_INSTITUTIONS.includes(t))
  const plural = (s: string) => (/[aeiou]$/.test(s) ? `${s}s` : `${s}es`)

  it('los tipos de perfil sin traducción son exactamente productora, escuela e institución', () => {
    expect([...sinTraduccion].sort()).toEqual(['escuela', 'institucion', 'productora'])
  })

  it('la lista cerrada contiene exactamente esos tipos, en singular y en plural', () => {
    expect([...TIPOS_SIN_TRADUCCION].sort()).toEqual(sinTraduccion.flatMap((t) => [t, plural(t)]).sort())
    expect(Object.isFrozen(TIPOS_SIN_TRADUCCION)).toBe(true)
  })

  it('cada palabra de la lista se declara y el intérprete no puede emitirla como tipo', () => {
    for (const t of TIPOS_SIN_TRADUCCION) {
      expect(unappliedTypeCriteria(t), t).toEqual(['tipo'])
      expect(interpretOrganizationQuery(t).type, t).toBeUndefined()
    }
  })

  it('cada tipo de perfil traducido existe de verdad en ORGANIZATION_PROFILE_TYPES', () => {
    for (const t of traducidos) expect(ORGANIZATION_PROFILE_TYPES, t).toContain(t)
  })
})

describe('invariantes de contrato (solo lo que reabre SCENAIA-009)', () => {
  const RAIZ = join(__dirname, '..', '..', '..')
  const fuente = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf-8')
  const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')

  it('la traducción vive solo en organization-profiles.ts: ningún otro fichero de la aplicación la usa', () => {
    const codigo = (dir: string): string[] =>
      readdirSync(join(RAIZ, dir), { recursive: true, encoding: 'utf-8' })
        .filter((f) => /\.(ts|tsx)$/.test(f) && !/__tests__/.test(f))
        .map((f) => join(dir, f))
    const usuarios = [...codigo('lib'), ...codigo('app')].filter((f) => /TRADUCCION_TIPO_A_PERFIL/.test(fuente(f)))
    expect(usuarios.map((f) => f.replace(/\\/g, '/'))).toEqual(['lib/repository-layer/organization-profiles.ts'])
  })

  it('la consulta de institutions no traduce: sigue filtrando por el criterio tal cual', () => {
    expect(fuente('lib/repository-layer/organizations.ts')).toMatch(/baseQuery\.eq\('type', criteria\.type\)/)
  })

  it('el resultado de perfiles conserva tipo_perfil real', () => {
    expect(fuente('lib/repository-layer/organization-profiles.ts')).toMatch(/type: row\.tipo_perfil,/)
  })

  it('el intérprete de Organizaciones no importa nada de Repository Layer salvo tipos, ni la traducción', () => {
    const org = sinComentarios(fuente('lib/knowledge-assets/interpret-organization-query.ts'))
    expect(org).toMatch(/import type \{ OrganizationLocations, OrganizationSearchCriteria \} from '@\/lib\/repository-layer'/)
    expect(org).not.toMatch(/ORGANIZATION_PROFILE_TYPES|TRADUCCION_TIPO_A_PERFIL|organization-profiles/)
  })

  it('el recuperador declara el tipo junto a la ubicación y los criterios de obra', () => {
    expect(fuente('lib/knowledge-assets/semantic-retriever.ts')).toMatch(/\.\.\.unappliedTypeCriteria\(query\),/)
  })
})
