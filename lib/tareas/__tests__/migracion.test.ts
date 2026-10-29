import { describe, it, expect, beforeAll } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { baseConMigraciones, MOD, U1, type Resultado } from '@/lib/espacios/__tests__/pglite'

/**
 * Tareas (20261029150000_tareas_admin) en PGlite: RLS por rol, el trigger
 * (quién resuelve, solo el estado para moderación y agente, a quién se puede
 * asignar), notas automáticas, una sola tarea abierta por origen y el borrado
 * de un perfil.
 */

let db: PGlite
let como: (rol: 'anon' | 'authenticated', uid: string | null, sql: string) => Promise<Resultado>

const ADMIN = '00000000-0000-0000-0000-0000000000ad'
const MOD2 = '00000000-0000-0000-0000-00000000000b'

const PREVIO = `
  -- Como en Supabase: service_role se salta la RLS.
  create role service_role nologin bypassrls;
  grant usage on schema public to service_role;
  alter table public.profiles add column apellidos text, add column nombre_artistico text;
`

const como1 = async (uid: string | null, sql: string) => {
  const r = await como(uid ? 'authenticated' : 'anon', uid, sql)
  return r
}
const nueva = async (uid: string, valores: string) => {
  const r = await como1(uid, `insert into tareas_admin (titulo, origen_tipo, origen_ref, asignado_tipo, asignado_a) values (${valores}) returning id`)
  if (r.error) throw new Error(r.error)
  return String(r.filas[0].id)
}
const notas = async (id: string) =>
  (await db.query<{ tipo: string; texto: string; autor_tipo: string; autor: string | null }>(
    `select tipo, texto, autor_tipo, autor from tareas_admin_notas where tarea_id = '${id}' order by created_at, texto`)).rows

let deMod: string     // asignada al moderador, origen cola
let deCorreo: string  // origen correo, asignada a admin
let deAgente: string  // asignada al agente

beforeAll(async () => {
  ({ db, como } = await baseConMigraciones(['20261029120000_correos_entrantes.sql', '20261029150000_tareas_admin.sql'], PREVIO))
  await db.exec(`
    insert into profiles (id, nombre, nombre_artistico) values ('${ADMIN}', 'Renee', null), ('${MOD2}', 'Otra', 'La Otra');
    insert into profile_roles values ('${ADMIN}', 'admin'), ('${MOD2}', 'moderator');
  `)
  deMod = await nueva(ADMIN, `'Revisar noticias', 'cola', 'noticias', 'persona', '${MOD}'`)
  deCorreo = await nueva(ADMIN, `'Responder a la compañía', 'correo', 'correo-1', 'persona', '${ADMIN}'`)
  deAgente = await nueva(ADMIN, `'Reintentar importación', 'salud', 'mediateca-1', 'agente', null`)
})

describe('RLS de tareas_admin', () => {
  it('admin ve todas', async () => {
    expect((await como1(ADMIN, 'select id from tareas_admin')).filas).toHaveLength(3)
  })
  it('moderator ve solo las asignadas a sí mismo y nunca las de un correo', async () => {
    expect((await como1(MOD, 'select titulo from tareas_admin')).filas).toEqual([{ titulo: 'Revisar noticias' }])
    expect((await como1(MOD2, 'select id from tareas_admin')).filas).toHaveLength(0)
  })
  it('una cuenta normal y anon no ven nada', async () => {
    expect((await como1(U1, 'select id from tareas_admin')).filas).toHaveLength(0)
    expect((await como('anon', null, 'select id from tareas_admin')).error).toMatch(/permission denied/)
    expect((await como('anon', null, 'select id from tareas_admin_notas')).error).toMatch(/permission denied/)
  })
  it('una cuenta normal no puede crear tareas', async () => {
    const r = await como1(U1, `insert into tareas_admin (titulo) values ('x')`)
    expect(r.error).toMatch(/row-level security/)
  })
  it('moderator crea tareas para sí mismo, no para otros ni para el agente ni de un correo', async () => {
    expect((await como1(MOD, `insert into tareas_admin (titulo, asignado_tipo, asignado_a) values ('Mía', 'persona', '${MOD}') returning creado_por`)).filas[0])
      .toEqual({ creado_por: MOD })
    expect((await como1(MOD, `insert into tareas_admin (titulo, asignado_tipo, asignado_a) values ('Para otra', 'persona', '${MOD2}')`)).error).toMatch(/row-level security/)
    expect((await como1(MOD, `insert into tareas_admin (titulo, asignado_tipo) values ('Agente', 'agente')`)).error).toMatch(/row-level security/)
    expect((await como1(MOD, `insert into tareas_admin (titulo, origen_tipo, asignado_tipo, asignado_a) values ('Correo', 'correo', 'persona', '${MOD}')`)).error).toMatch(/row-level security|solo se puede asignar a administración/)
  })
  it('moderator cambia el estado de las suyas, pero nada más', async () => {
    const ok = await como1(MOD, `update tareas_admin set estado = 'en_curso' where id = '${deMod}' returning estado`)
    expect(ok.filas[0]).toEqual({ estado: 'en_curso' })
    const mal = await como1(MOD, `update tareas_admin set prioridad = 'urgente' where id = '${deMod}'`)
    expect(mal.error).toMatch(/Solo administración/)
    const reasignar = await como1(MOD, `update tareas_admin set asignado_a = '${MOD2}' where id = '${deMod}'`)
    expect(reasignar.error).toMatch(/Solo administración|row-level security/)
  })
  it('moderator no toca las de otros ni las de un correo (0 filas)', async () => {
    expect((await como1(MOD, `update tareas_admin set estado = 'resuelta' where id in ('${deCorreo}', '${deAgente}') returning id`)).filas).toHaveLength(0)
  })
  it('nadie con sesión cambia columnas protegidas (creado_por, resuelta_por)', async () => {
    expect((await como1(ADMIN, `update tareas_admin set creado_por = '${MOD}' where id = '${deMod}'`)).error).toMatch(/permission denied/)
  })
  it('solo admin borra', async () => {
    const t = await nueva(ADMIN, `'Borrar', 'manual', null, null, null`)
    expect((await como1(MOD, `delete from tareas_admin where id = '${t}' returning id`)).filas).toHaveLength(0)
    expect((await como1(ADMIN, `delete from tareas_admin where id = '${t}' returning id`)).filas).toHaveLength(1)
  })
})

describe('trigger y notas automáticas', () => {
  it('al resolver: quién y cuándo; al reabrir, se borra', async () => {
    await como1(ADMIN, `update tareas_admin set estado = 'resuelta' where id = '${deCorreo}'`)
    let f = (await db.query<{ resuelta_por: string | null; resuelta_at: string | null }>(`select resuelta_por, resuelta_at from tareas_admin where id = '${deCorreo}'`)).rows[0]
    expect(f.resuelta_por).toBe(ADMIN)
    expect(f.resuelta_at).not.toBeNull()
    await como1(ADMIN, `update tareas_admin set estado = 'pendiente' where id = '${deCorreo}'`)
    f = (await db.query<{ resuelta_por: string | null; resuelta_at: string | null }>(`select resuelta_por, resuelta_at from tareas_admin where id = '${deCorreo}'`)).rows[0]
    expect(f).toEqual({ resuelta_por: null, resuelta_at: null })
  })
  it('cada cambio de estado o asignación deja una nota', async () => {
    const t = await nueva(ADMIN, `'Historial', 'manual', null, null, null`)
    await como1(ADMIN, `update tareas_admin set asignado_tipo = 'persona', asignado_a = '${MOD2}' where id = '${t}'`)
    await como1(ADMIN, `update tareas_admin set estado = 'en_curso' where id = '${t}'`)
    await como1(ADMIN, `update tareas_admin set asignado_tipo = 'agente', asignado_a = null where id = '${t}'`)
    expect((await notas(t)).map(n => [n.tipo, n.texto, n.autor])).toEqual([
      ['asignacion', 'Asignada a La Otra', ADMIN],
      ['estado', 'Estado: pendiente → en curso', ADMIN],
      ['asignacion', 'Asignada a el agente automático', ADMIN],
    ])
  })
  it('solo se asigna a cuentas del equipo; las de un correo, solo a admin', async () => {
    expect((await como1(ADMIN, `update tareas_admin set asignado_a = '${U1}' where id = '${deMod}'`)).error).toMatch(/rol admin o moderator/)
    expect((await como1(ADMIN, `update tareas_admin set asignado_a = '${MOD}' where id = '${deCorreo}'`)).error).toMatch(/solo se puede asignar a administración/)
  })
  it('el agente (clave de servicio, sin sesión) solo cambia el estado, y la nota es del agente', async () => {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); set role service_role;`)
    try {
      await db.exec(`update tareas_admin set estado = 'en_curso' where id = '${deAgente}' and asignado_tipo = 'agente'`)
      await expect(db.exec(`update tareas_admin set titulo = 'otro' where id = '${deAgente}'`)).rejects.toThrow(/Solo administración/)
    } finally { await db.exec('reset role') }
    expect((await notas(deAgente)).at(-1)).toMatchObject({ tipo: 'estado', autor_tipo: 'agente', autor: null, texto: 'Estado: pendiente → en curso' })
  })
  it('una sola tarea abierta por origen; resuelta, se puede abrir otra', async () => {
    await expect(nueva(ADMIN, `'Otra vez', 'cola', 'noticias', null, null`)).rejects.toThrow(/duplicate key/)
    await como1(ADMIN, `update tareas_admin set estado = 'resuelta' where id = '${deMod}'`)
    await expect(nueva(ADMIN, `'Otra vez', 'cola', 'noticias', null, null`)).resolves.toBeTruthy()
  })
  it('el enlace de origen solo puede ser una ruta interna', async () => {
    for (const e of ['https://malo.com', '//malo.com', '/\\malo.com', 'javascript:alert(1)']) {
      expect((await como1(ADMIN, `insert into tareas_admin (titulo, origen_enlace) values ('x', '${e}')`)).error).toMatch(/check constraint/)
    }
    expect((await como1(ADMIN, `insert into tareas_admin (titulo, origen_enlace) values ('x', '/admin/correo?id=1')`)).error).toBeNull()
  })
})

describe('notas', () => {
  it('moderator lee y comenta solo sus tareas; no puede firmar como otro ni como agente', async () => {
    const mia = await nueva(ADMIN, `'Comentar', 'manual', null, 'persona', '${MOD}'`)
    expect((await como1(MOD, `insert into tareas_admin_notas (tarea_id, autor, autor_tipo, texto) values ('${mia}', '${MOD}', 'persona', 'Hecho a medias')`)).error).toBeNull()
    expect((await como1(MOD, `insert into tareas_admin_notas (tarea_id, autor, autor_tipo, texto) values ('${deCorreo}', '${MOD}', 'persona', 'x')`)).error).toMatch(/row-level security/)
    expect((await como1(MOD, `insert into tareas_admin_notas (tarea_id, autor, autor_tipo, texto) values ('${mia}', null, 'agente', 'x')`)).error).toMatch(/row-level security/)
    expect((await como1(MOD, `insert into tareas_admin_notas (tarea_id, autor, autor_tipo, tipo, texto) values ('${mia}', '${MOD}', 'persona', 'estado', 'falsa')`)).error).toMatch(/row-level security/)
    expect((await como1(MOD, `select texto from tareas_admin_notas where tarea_id = '${deCorreo}'`)).filas).toHaveLength(0)
  })
})

describe('borrar un perfil', () => {
  it('no lo impiden sus tareas: quedan sin asignar y sin nota nueva', async () => {
    const BAJA = '00000000-0000-0000-0000-0000000000cc'
    await db.exec(`insert into profiles (id, nombre) values ('${BAJA}', 'Baja'); insert into profile_roles values ('${BAJA}', 'moderator');`)
    const t = await nueva(ADMIN, `'De la baja', 'manual', null, 'persona', '${BAJA}'`)
    const antes = (await notas(t)).length
    // Como en producción: la baja la hace el servidor, sin sesión de usuario.
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); delete from profile_roles where profile_id = '${BAJA}'; delete from profiles where id = '${BAJA}';`)
    expect((await db.query(`select asignado_tipo, asignado_a from tareas_admin where id = '${t}'`)).rows[0]).toEqual({ asignado_tipo: null, asignado_a: null })
    expect((await notas(t)).length).toBe(antes)
  })
})
