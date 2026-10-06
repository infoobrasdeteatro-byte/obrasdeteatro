import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Contratos de la migración de autopublicación BDNS y cierre de pendientes
 * vencidas. Como en migracion-redaccion.test.ts, se lee el SQL (sin
 * comentarios); el comportamiento real se verifica contra la base al aplicar.
 */
const CODIGO = readFileSync(
  join(__dirname, '..', '..', '..', 'supabase', 'migrations', '20261007090000_convocatorias_bdns_autopublicacion_y_cierre.sql'),
  'utf-8',
).replace(/--.*$/gm, '')

const TRIGGER = CODIGO.slice(
  CODIGO.indexOf('create or replace function public.calls_sync_estado()'),
  CODIGO.indexOf('create or replace function public.cerrar_convocatorias_vencidas()'),
)

describe('migración 20261007090000 — autopublicación BDNS', () => {
  it('solo se decide al insertar, por lote BDNS- y país ES', () => {
    expect(TRIGGER).toMatch(/if tg_op = 'INSERT' then\s+new\.estado := 'pendiente_revision';\s+v_autopublicar := coalesce\(new\.lote, ''\) like 'BDNS-%' and new\.pais_code = 'ES';/)
  })

  it('se publica solo si ninguna regla de moderación la señala (GALERTAS y el resto, a revisión)', () => {
    expect(TRIGGER).toMatch(/if v_autopublicar and v_regla_motivo is null then\s+new\.estado := 'publicado';/)
    // La autopublicación va DESPUÉS de la regla que devuelve a revisión lo que no publica un moderador.
    expect(TRIGGER.indexOf("if new.estado in ('publicado', 'rechazado') then")).toBeLessThan(TRIGGER.indexOf('if v_autopublicar'))
  })

  it('las validaciones de la Redacción siguen antes y la publicación deja fecha e is_published', () => {
    expect(TRIGGER.indexOf('debe ser futura')).toBeLessThan(TRIGGER.indexOf('if v_autopublicar'))
    expect(TRIGGER).toMatch(/if new\.estado = 'publicado' and new\.fecha_publicacion is null then\s+new\.fecha_publicacion := now\(\);/)
    expect(TRIGGER).toMatch(/new\.is_published := \(new\.estado = 'publicado'\);/)
  })

  it('la reedición de título o descripción de una publicada sigue devolviéndola a revisión', () => {
    expect(TRIGGER).toMatch(/old\.estado = 'publicado'\s+and new\.estado = 'publicado'[\s\S]*?new\.estado := 'pendiente_revision';/)
  })
})

describe('migración 20261007090000 — cierre de vencidas', () => {
  it('cierra también las pendientes de revisión con plazo vencido', () => {
    expect(CODIGO).toMatch(/set estado = 'cerrado'\s+where estado in \('publicado', 'pendiente_revision'\)\s+and deadline is not null\s+and deadline < now\(\);/)
  })
})
