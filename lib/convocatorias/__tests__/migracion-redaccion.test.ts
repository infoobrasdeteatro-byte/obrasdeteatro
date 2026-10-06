import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Contratos de la migración de las convocatorias de la Redacción.
 *
 * El repositorio no tiene una base de datos de pruebas: estas comprobaciones
 * leen el SQL y fijan que cada regla pedida esté escrita, y escrita donde
 * tiene efecto. El comportamiento real del trigger se verifica contra la base
 * después de aplicar la migración.
 */
const SQL = readFileSync(
  join(__dirname, '..', '..', '..', 'supabase', 'migrations', '20261006130000_convocatorias_redaccion.sql'),
  'utf-8',
)
// Solo el código, sin comentarios: un comentario que nombre una regla no la cumple.
const CODIGO = SQL.replace(/--.*$/gm, '')

const TRIGGER = CODIGO.slice(
  CODIGO.indexOf('create or replace function public.calls_sync_estado()'),
  CODIGO.indexOf('drop trigger if exists trg_calls_sync_estado'),
)

describe('migración 20261006130000 — columnas y vocabulario', () => {
  it('origen con default usuario y CHECK usuario|redaccion', () => {
    expect(CODIGO).toMatch(/add column origen text not null default 'usuario'/)
    expect(CODIGO).toMatch(/calls_origen_check check \(origen in \('usuario', 'redaccion'\)\)/)
  })

  it('pais_code con la misma lista de 20 países que noticias', () => {
    const lista = CODIGO.match(/calls_pais_check check \(pais_code is null or pais_code in \(([\s\S]*?)\)\)/)?.[1] ?? ''
    expect(lista.match(/'[A-Z]{2}'/g)).toHaveLength(20)
  })

  it('url_bases solo https', () => {
    expect(CODIGO).toMatch(/calls_url_bases_https check \(url_bases is null or url_bases ~\* '\^https:\/\//)
  })

  it('índice único parcial de bases normalizadas para origen redaccion', () => {
    expect(CODIGO).toMatch(/create unique index calls_url_bases_redaccion_unica\s+on public\.calls \(url_bases_normalizada\)\s+where origen = 'redaccion'/)
  })

  it('categoría ayuda en calls_category_check', () => {
    expect(CODIGO).toMatch(/calls_category_check check \(category in \('festival', 'premio', 'residencia', 'beca', 'ayuda'\)\)/)
  })

  it('perfil de la Redacción: por correo, sin roles y fuera del directorio', () => {
    expect(CODIGO).toMatch(/lower\(email\) = 'redaccion@obrasdeteatro\.com'/)
    expect(CODIGO).toMatch(/from public\.profile_roles where profile_id = v_id/)
    expect(CODIGO).toMatch(/slug\s+= 'redaccion'/)
    expect(CODIGO).toMatch(/perfil_publico = false/)
  })
})

describe('calls_sync_estado() — reglas de la Redacción', () => {
  it('origen redaccion desde otro perfil → rechazo', () => {
    expect(TRIGGER).toMatch(/if new\.origen = 'redaccion' then\s+if new\.profile_id is distinct from public\.perfil_redaccion_id\(\) then\s+raise exception/)
  })

  it('al insertar entra siempre en pendiente_revision', () => {
    expect(TRIGGER).toMatch(/if tg_op = 'INSERT' then\s+new\.estado := 'pendiente_revision';/)
  })

  it('sin bases, sin entidad, sin país o sin fecha → rechazo', () => {
    expect(TRIGGER).toMatch(/new\.url_bases[\s\S]*?is null then\s+raise exception/)
    expect(TRIGGER).toMatch(/new\.entidad_convocante[\s\S]*?is null then\s+raise exception/)
    expect(TRIGGER).toMatch(/if new\.pais_code is null then\s+raise exception/)
    expect(TRIGGER).toMatch(/if new\.deadline is null then\s+raise exception/)
  })

  it('fecha futura al insertar, al cambiarla y al publicar (no en el cierre por plazo)', () => {
    expect(TRIGGER).toMatch(/if new\.deadline <= now\(\)\s+and \(\s+tg_op = 'INSERT'\s+or new\.deadline is distinct from old\.deadline\s+or \(new\.estado = 'publicado' and old\.estado is distinct from 'publicado'\)/)
  })

  it('el cupo mensual no se aplica a la Redacción', () => {
    expect(TRIGGER).toMatch(/if new\.origen <> 'redaccion'\s+and public\.cupo_mensual_convocatorias_agotado\(new\.profile_id\)/)
  })

  it('las reglas de siempre siguen ahí: moderación, filtro, destacado y publicación', () => {
    expect(TRIGGER).toMatch(/if not public\.es_moderador\(\) then\s+new\.estado := 'pendiente_revision';/)
    expect(TRIGGER).toMatch(/from public\.moderacion_reglas/)
    expect(TRIGGER).toMatch(/public\.plan_destacado_o_superior\(new\.profile_id\)/)
    expect(TRIGGER).toMatch(/new\.is_published := \(new\.estado = 'publicado'\);/)
  })

  it('location «Ciudad, País» y bases normalizadas con la función de Noticias', () => {
    expect(TRIGGER).toMatch(/new\.location := nullif\(concat_ws\(', ', nullif\(btrim\(new\.ciudad\), ''\), public\.pais_nombre\(new\.pais_code\)\), ''\);/)
    expect(TRIGGER).toMatch(/public\.noticias_normalizar_url\(new\.url_bases\)/)
  })

  it('el trigger se dispara también con las columnas nuevas', () => {
    const lista = CODIGO.match(/before insert or update of([\s\S]*?)on public\.calls/)?.[1] ?? ''
    for (const col of ['estado', 'is_featured', 'title', 'description', 'origen', 'profile_id', 'pais_code', 'ciudad', 'entidad_convocante', 'url_bases', 'deadline']) {
      expect(lista).toMatch(new RegExp(`\\b${col}\\b`))
    }
  })

  it('perfil_redaccion_id() no se expone a anon ni a authenticated', () => {
    expect(CODIGO).toMatch(/revoke all on function public\.perfil_redaccion_id\(\) from public, anon, authenticated;/)
  })
})
