import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const READ_ONLY_MODULES = [
  'identity.ts',
  'professional-profile.ts',
  'works.ts',
  'organizations.ts',
  'individual-profile.ts',
  'organizational-profile.ts',
]
const READ_ONLY_SOURCE = READ_ONLY_MODULES.map((file) => readFileSync(join(__dirname, '..', file), 'utf-8')).join(
  '\n'
)

const ACCOUNTING_SOURCE = readFileSync(join(__dirname, '..', 'accounting.ts'), 'utf-8')
const ACTIVITY_LOG_SOURCE = readFileSync(join(__dirname, '..', 'activity-log.ts'), 'utf-8')
const TELEMETRY_SOURCE = readFileSync(join(__dirname, '..', 'telemetry.ts'), 'utf-8')
const SUBSCRIPTION_SOURCE = readFileSync(join(__dirname, '..', 'subscription.ts'), 'utf-8')
const INDIVIDUAL_PROFILE_SOURCE = readFileSync(join(__dirname, '..', 'individual-profile.ts'), 'utf-8')
const ORGANIZATIONAL_PROFILE_SOURCE = readFileSync(join(__dirname, '..', 'organizational-profile.ts'), 'utf-8')

const MODULE_SOURCE = [READ_ONLY_SOURCE, ACCOUNTING_SOURCE, ACTIVITY_LOG_SOURCE, TELEMETRY_SOURCE].join('\n')

describe('Repository Layer — invariantes de integración (SC-005.1)', () => {
  it('usa exclusivamente el cliente ya existente de lib/supabase/server, sin instanciar otro', () => {
    expect(MODULE_SOURCE).toMatch(/from '@\/lib\/supabase\/server'/)
    expect(MODULE_SOURCE).not.toMatch(/createServerClient|createBrowserClient|@supabase\/ssr|@supabase\/supabase-js/)
  })

  it('no crea ningún cliente privilegiado (service role)', () => {
    expect(MODULE_SOURCE).not.toMatch(/service[_-]?role/i)
  })

  it('no expone ningún dato del dominio Subscription (Incidencia A)', () => {
    expect(MODULE_SOURCE).not.toMatch(/is_premium|isPremium|subscriptions|stripe/i)
  })
})

describe('Repository Layer — módulos de solo lectura (identity, professional-profile, works, organizations)', () => {
  it('no contienen ninguna operación de escritura ni de RPC', () => {
    expect(READ_ONLY_SOURCE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/)
  })
})

describe('Repository Layer — accounting.ts (invariante de componente, aprobado 2026-07-16)', () => {
  it('nunca realiza una mutación directa y genérica sobre la tabla (solo operaciones nombradas vía RPC)', () => {
    expect(ACCOUNTING_SOURCE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(/)
  })

  it('toda escritura pasa por una función RPC nombrada y con contrato propio', () => {
    expect(ACCOUNTING_SOURCE).toMatch(
      /\.rpc\('accounting_verify_and_reserve'|\.rpc\('accounting_settle_reservation'|\.rpc\('accounting_release_reservation'|\.rpc\('accounting_expire_stale_reservations'/
    )
  })
})

describe('Repository Layer — activity-log.ts (invariante de componente, ampliado 2026-07-17)', () => {
  it('expone exactamente una operación de escritura y una de actualización, nombradas y no genéricas -- nunca UPSERT/DELETE/RPC', () => {
    expect(ACTIVITY_LOG_SOURCE).not.toMatch(/\.upsert\(|\.delete\(|\.rpc\(/)
    const insertMatches = ACTIVITY_LOG_SOURCE.match(/\.insert\(/g) ?? []
    const updateMatches = ACTIVITY_LOG_SOURCE.match(/\.update\(/g) ?? []
    expect(insertMatches).toHaveLength(1)
    expect(updateMatches).toHaveLength(1)
  })

  it('toda operación está acotada a nucleo_activity_log', () => {
    const fromMatches = ACTIVITY_LOG_SOURCE.match(/\.from\('([^']+)'\)/g) ?? []
    expect(fromMatches.length).toBeGreaterThan(0)
    for (const match of fromMatches) {
      expect(match).toBe(".from('nucleo_activity_log')")
    }
  })
})

describe('Repository Layer — telemetry.ts (invariante de componente, 2026-07-18)', () => {
  it('solo escribe insertando, nunca UPDATE/UPSERT/DELETE/RPC (hechos inmutables, sin semántica de cola)', () => {
    // La invariante protege la INMUTABILIDAD del registro, no el numero de
    // funciones. Fase 0 anadio `recordMetrics`, que es la MISMA escritura
    // agrupada (siete metricas de un turno en un solo viaje, decision
    // tomada sobre una medicion real de ~194 ms). Sigue siendo insert,
    // sigue siendo inmutable y sigue acotada a la misma tabla.
    expect(TELEMETRY_SOURCE).not.toMatch(/\.update\(|\.upsert\(|\.delete\(|\.rpc\(/)
    const insertMatches = TELEMETRY_SOURCE.match(/\.insert\(/g) ?? []
    expect(insertMatches.length).toBeGreaterThan(0)
    expect(TELEMETRY_SOURCE).toContain('export async function recordMetric(')
    expect(TELEMETRY_SOURCE).toContain('export async function recordMetrics(')
  })

  it('toda operación está acotada a telemetry_metrics', () => {
    const fromMatches = TELEMETRY_SOURCE.match(/\.from\('([^']+)'\)/g) ?? []
    expect(fromMatches.length).toBeGreaterThan(0)
    for (const match of fromMatches) {
      expect(match).toBe(".from('telemetry_metrics')")
    }
  })
})

describe('Repository Layer — subscription.ts (invariante de componente, IA-001 resuelta 2026-07-21)', () => {
  it('es de solo lectura -- nunca insert/update/upsert/delete/rpc', () => {
    expect(SUBSCRIPTION_SOURCE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/)
  })

  it('toda operación está acotada a subscriptions', () => {
    const fromMatches = SUBSCRIPTION_SOURCE.match(/\.from\('([^']+)'\)/g) ?? []
    expect(fromMatches.length).toBeGreaterThan(0)
    for (const match of fromMatches) {
      expect(match).toBe(".from('subscriptions')")
    }
  })

  it('es el único módulo autorizado a exponer datos del dominio Subscription', () => {
    expect(READ_ONLY_SOURCE).not.toMatch(/subscriptions|stripe/i)
  })
})

describe('Repository Layer — individual-profile.ts y organizational-profile.ts (invariante de componente, IA-002 resuelta 2026-07-22)', () => {
  it('ambos son de solo lectura -- nunca insert/update/upsert/delete/rpc', () => {
    expect(INDIVIDUAL_PROFILE_SOURCE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/)
    expect(ORGANIZATIONAL_PROFILE_SOURCE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/)
  })

  it('nunca usan select(\'*\'): mismo defecto que origino RA-001/IA-002, no debe reintroducirse', () => {
    expect(INDIVIDUAL_PROFILE_SOURCE).not.toMatch(/\.select\('\*'\)/)
    expect(ORGANIZATIONAL_PROFILE_SOURCE).not.toMatch(/\.select\('\*'\)/)
  })

  it('individual-profile.ts solo consulta las tablas perfil_actor/perfil_director/perfil_dramaturgo', () => {
    expect(INDIVIDUAL_PROFILE_SOURCE).toMatch(/\.from\(TABLE_BY_TYPE\[profileType\]\)/)
    expect(INDIVIDUAL_PROFILE_SOURCE).toMatch(/perfil_actor/)
    expect(INDIVIDUAL_PROFILE_SOURCE).toMatch(/perfil_director/)
    expect(INDIVIDUAL_PROFILE_SOURCE).toMatch(/perfil_dramaturgo/)
    expect(INDIVIDUAL_PROFILE_SOURCE).not.toMatch(/perfil_compania|perfil_productora|perfil_teatro|perfil_festival|perfil_escuela/)
  })

  it('organizational-profile.ts solo consulta las 5 tablas organizacionales', () => {
    expect(ORGANIZATIONAL_PROFILE_SOURCE).toMatch(/perfil_compania/)
    expect(ORGANIZATIONAL_PROFILE_SOURCE).toMatch(/perfil_productora/)
    expect(ORGANIZATIONAL_PROFILE_SOURCE).toMatch(/perfil_teatro/)
    expect(ORGANIZATIONAL_PROFILE_SOURCE).toMatch(/perfil_festival/)
    expect(ORGANIZATIONAL_PROFILE_SOURCE).toMatch(/perfil_escuela/)
    expect(ORGANIZATIONAL_PROFILE_SOURCE).not.toMatch(/perfil_actor|perfil_director|perfil_dramaturgo/)
  })

  it('nunca exponen nif_cif (identificador administrativo/fiscal excluido por la Decisión de Dirección)', () => {
    expect(INDIVIDUAL_PROFILE_SOURCE).not.toMatch(/nif_cif/)
    expect(ORGANIZATIONAL_PROFILE_SOURCE).not.toMatch(/nif_cif/)
  })

  it('ningún dato de contacto se expone sin comprobar antes su mostrar_* correspondiente', () => {
    expect(INDIVIDUAL_PROFILE_SOURCE).toMatch(/mostrar_email/)
    expect(INDIVIDUAL_PROFILE_SOURCE).toMatch(/mostrar_telefono/)
    expect(INDIVIDUAL_PROFILE_SOURCE).toMatch(/mostrar_redes/)
    expect(ORGANIZATIONAL_PROFILE_SOURCE).toMatch(/mostrar_contacto/)
  })
})


/**
 * BLOQUE 5 — la cuota de IA vive en un solo sitio.
 *
 * La invariante no protege una cifra: protege que exista UN unico lugar
 * donde cambiarla. Repartida por la UI, la API o SQL, una decision
 * comercial deja de ser modificable y pasa a ser arqueologia.
 */
describe('Repository Layer — cuota de IA, fuente unica (Bloque 5)', () => {
  const REPO_ROOT = join(__dirname, '..', '..', '..')
  const QUOTA_SOURCE_PATH = join(REPO_ROOT, 'lib', 'repository-layer', 'subscription.ts')

  /** Todos los .ts/.tsx de produccion bajo un directorio (sin pruebas). */
  function ficherosDeProduccion(dir: string): string[] {
    const salida: string[] = []
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      if (entrada.isDirectory()) {
        if (entrada.name === '__tests__') continue
        salida.push(...ficherosDeProduccion(join(dir, entrada.name)))
      } else if (entrada.name.endsWith('.ts') || entrada.name.endsWith('.tsx')) {
        salida.push(join(dir, entrada.name))
      }
    }
    return salida
  }

  const PRODUCCION = [...ficherosDeProduccion(join(REPO_ROOT, 'lib')), ...ficherosDeProduccion(join(REPO_ROOT, 'app'))]

  it('ningun modulo salvo subscription.ts declara una cuota de IA', () => {
    const declarantes = PRODUCCION.filter(
      (fichero) => /PLAN_AI_QUOTAS|creditsPerPeriod/.test(readFileSync(fichero, 'utf-8'))
    )

    expect(declarantes).toEqual([QUOTA_SOURCE_PATH])
  })

  it('la traduccion plan -> cuota se expone por una sola funcion, no por el mapa en crudo', () => {
    expect(SUBSCRIPTION_SOURCE).toMatch(/export function getUsageLimit\(/)
    // El mapa NO se exporta: quien quiera una cuota pasa por la funcion, y
    // no puede quedarse con una copia propia que despues divergiria.
    expect(SUBSCRIPTION_SOURCE).not.toMatch(/export const PLAN_AI_QUOTAS|export \{[^}]*PLAN_AI_QUOTAS/)
  })

  it('ILIMITADO no se representa con ninguna cifra convenida (PRD-001)', () => {
    // Se mira el CODIGO, no los comentarios: la documentacion puede
    // nombrar los valores prohibidos precisamente para explicar por que no
    // se usan, y eso no es usarlos.
    const codigo = SUBSCRIPTION_SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')

    expect(codigo).not.toMatch(/999999999|Number\.MAX_SAFE_INTEGER|Infinity/)
    // La rama sin techo no lleva `creditsPerPeriod` en absoluto.
    expect(codigo).toMatch(/empresas:\s*\{\s*kind:\s*'ILIMITADO'\s*\}/)
  })

  it('el catalogo comercial (lib/plans.ts) sigue sin conocer la cuota de IA', () => {
    // Precios, euros y Stripe viven ahi; la cuota de IA no. Si un dia
    // apareciera, habria dos fuentes y ninguna autoridad.
    const PLANS_SOURCE = readFileSync(join(REPO_ROOT, 'lib', 'plans.ts'), 'utf-8')

    expect(PLANS_SOURCE).not.toMatch(/scenaia|creditos?_?ia|creditsPerPeriod|usageLimit/i)
  })
})

/**
 * BLOQUE 5 — el periodo de cuota es el que ya existia.
 *
 * No se inventa una arquitectura de periodos nueva: la funcion atomica ya
 * acota el presupuesto al mes natural desde el Bloque 3. Estas invariantes
 * impiden que se duplique o se sustituya sin decidirlo.
 */
describe('Accounting SQL — periodo y cuota (Bloque 5)', () => {
  const MIGRATIONS_DIR = join(__dirname, '..', '..', '..', 'supabase', 'migrations')
  const SEPARADOR = String.fromCharCode(10)
  const ACCOUNTING_SQL = readdirSync(MIGRATIONS_DIR)
    .filter((fichero) => fichero.includes('accounting'))
    .map((fichero) => readFileSync(join(MIGRATIONS_DIR, fichero), 'utf-8'))
    .join(SEPARADOR)

  it('SQL no conoce ninguna cuota: recibe el techo como parametro en cada invocacion', () => {
    // Por eso cambiar una cuota comercial NUNCA exige una migracion.
    expect(ACCOUNTING_SQL).toMatch(/p_authorized_limit/)
    expect(ACCOUNTING_SQL).not.toMatch(/gratuito|premium|destacado|empresas/i)
  })

  it('el periodo es el mes natural ya existente, no uno nuevo', () => {
    expect(ACCOUNTING_SQL).toMatch(/date_trunc\('month', now\(\)\)/)
    expect(ACCOUNTING_SQL).not.toMatch(/date_trunc\('(day|week|year)'/)
  })

  it('un plan sin techo no puede denegarse por cuota', () => {
    // La comparacion contra el limite solo ocurre cuando hay limite.
    expect(ACCOUNTING_SQL).toMatch(/IF p_authorized_limit IS NOT NULL[\s\S]{0,20}AND v_current_consumption \+ p_estimated_cost > p_authorized_limit/)
  })
})
