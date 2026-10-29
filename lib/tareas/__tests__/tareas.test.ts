import { describe, it, expect } from 'vitest'
import {
  enlaceCrearTarea, enlaceInterno, estaVencida, hoyCanarias, leerAsignacion, ordenarTareas, validarNuevaTarea,
  type Tarea,
} from '../tareas'
import { autorizarAgente, actualizarTareaAgente, listarTareasAgente, COLUMNAS_AGENTE } from '../agente'
import { crearTarea, reasignarTarea } from '../crear'
import { correoAsignacion } from '../aviso'

const HOY = '2026-10-29'
const ADMIN = '00000000-0000-0000-0000-0000000000ad'
const MOD = '00000000-0000-0000-0000-00000000000a'
const OTRA = '00000000-0000-0000-0000-00000000000b'

const t = (over: Partial<Tarea>): Tarea => ({
  id: 'x', titulo: 't', descripcion: null, origen_tipo: 'manual', origen_ref: null, origen_enlace: null,
  asignado_tipo: null, asignado_a: null, estado: 'pendiente', prioridad: 'normal', fecha_limite: null,
  creado_por: null, resuelta_at: null, created_at: '2026-10-20T10:00:00Z', updated_at: '2026-10-20T10:00:00Z', ...over,
})

describe('orden y vencimiento', () => {
  it('vencida: abierta y con la fecha ya pasada (el día límite aún cuenta)', () => {
    expect(estaVencida(t({ fecha_limite: '2026-10-28' }), HOY)).toBe(true)
    expect(estaVencida(t({ fecha_limite: HOY }), HOY)).toBe(false)
    expect(estaVencida(t({ fecha_limite: '2026-10-28', estado: 'resuelta' }), HOY)).toBe(false)
  })
  it('hoy es el día de Canarias', () => {
    expect(hoyCanarias(new Date('2026-10-29T23:30:00Z'))).toBe('2026-10-29')
    expect(hoyCanarias(new Date('2026-07-14T23:30:00Z'))).toBe('2026-07-15') // verano: UTC+1
  })
  it('urgentes y vencidas primero; después por fecha límite; las cerradas al final', () => {
    const lista = [
      t({ id: 'sin-fecha' }),
      t({ id: 'cerrada', estado: 'resuelta', prioridad: 'urgente' }),
      t({ id: 'lejos', fecha_limite: '2026-12-01' }),
      t({ id: 'vencida', fecha_limite: '2026-10-01', prioridad: 'baja' }),
      t({ id: 'urgente', prioridad: 'urgente', fecha_limite: '2026-11-15' }),
      t({ id: 'pronto', fecha_limite: '2026-10-30' }),
    ]
    expect(ordenarTareas(lista, HOY).map(x => x.id)).toEqual(['vencida', 'urgente', 'pronto', 'lejos', 'sin-fecha', 'cerrada'])
  })
})

describe('formulario', () => {
  it('asignación', () => {
    expect(leerAsignacion('')).toEqual({ asignado_tipo: null, asignado_a: null })
    expect(leerAsignacion('agente')).toEqual({ asignado_tipo: 'agente', asignado_a: null })
    expect(leerAsignacion(`persona:${MOD}`)).toEqual({ asignado_tipo: 'persona', asignado_a: MOD })
    expect(leerAsignacion('persona:hola')).toBeNull()
  })
  it('valida título, fecha y enlace interno', () => {
    expect(validarNuevaTarea({ titulo: '  ' })).toEqual({ error: 'Escribe un título.' })
    expect(validarNuevaTarea({ titulo: 'x'.repeat(201) })).toMatchObject({ error: expect.stringContaining('200') })
    expect(validarNuevaTarea({ titulo: 'a', fecha_limite: '29/10/2026' })).toEqual({ error: 'La fecha límite no es válida.' })
    expect(validarNuevaTarea({ titulo: 'a', origen_enlace: 'https://malo.com' })).toMatchObject({ error: expect.stringContaining('ruta de la web') })
    expect(validarNuevaTarea({ titulo: 'a', origen_enlace: '//malo.com' })).toMatchObject({ error: expect.any(String) })
    const ok = validarNuevaTarea({ titulo: ' Revisar ', prioridad: 'urgente', fecha_limite: '2026-11-02', origen_tipo: 'cola', origen_ref: 'noticias', origen_enlace: '/admin/noticias', asignacion: 'agente' })
    expect(ok).toEqual({ datos: { titulo: 'Revisar', descripcion: null, prioridad: 'urgente', fecha_limite: '2026-11-02', origen_tipo: 'cola', origen_ref: 'noticias', origen_enlace: '/admin/noticias', asignado_tipo: 'agente', asignado_a: null } })
  })
  it('origen desconocido o prioridad desconocida: valores seguros', () => {
    expect(validarNuevaTarea({ titulo: 'a', origen_tipo: 'otra', origen_ref: 'x', prioridad: 'maxima' })).toMatchObject({ datos: { origen_tipo: 'manual', origen_ref: null, prioridad: 'normal' } })
  })
  it('enlace «Crear tarea» relleno y solo con rutas internas', () => {
    const u = new URL(enlaceCrearTarea({ origen_tipo: 'salud', origen_ref: 'latam', titulo: 'Revisar LATAM', origen_enlace: '/admin/convocatorias' }), 'https://x')
    expect(u.pathname).toBe('/admin/tareas/nueva')
    expect(Object.fromEntries(u.searchParams)).toEqual({ origen_tipo: 'salud', origen_ref: 'latam', titulo: 'Revisar LATAM', origen_enlace: '/admin/convocatorias' })
    expect(enlaceCrearTarea({ origen_tipo: 'cola', origen_enlace: 'https://malo.com' })).not.toContain('malo')
    expect(enlaceInterno('/\\malo.com')).toBeNull()
  })
})

// ── Cliente falso de Supabase ───────────────────────────────────────────────
type Fila = Record<string, unknown>
function base(tablas: Record<string, Fila[]>) {
  const llamadas: { tabla: string; op: string; filtros: [string, string, unknown][]; valores?: Fila }[] = []
  const from = (tabla: string) => {
    const filtros: [string, string, unknown][] = []
    let op = 'select'; let valores: Fila | undefined; let uno = false
    const filas = () => (tablas[tabla] ?? []).filter(f => filtros.every(([o, c, v]) =>
      o === 'eq' ? f[c] === v : o === 'in' ? (v as unknown[]).includes(f[c]) : true))
    const q: Record<string, unknown> = {
      select: () => q, order: () => q, limit: () => q,
      eq: (c: string, v: unknown) => (filtros.push(['eq', c, v]), q),
      in: (c: string, v: unknown[]) => (filtros.push(['in', c, v]), q),
      maybeSingle: () => (uno = true, q), single: () => (uno = true, q),
      insert: (v: Fila) => { op = 'insert'; valores = v; return q },
      update: (v: Fila) => { op = 'update'; valores = v; return q },
      then: (ok: (r: unknown) => unknown) => {
        llamadas.push({ tabla, op, filtros: [...filtros], valores })
        if (op === 'insert') {
          const fila = { id: `nueva-${(tablas[tabla] ?? []).length + 1}`, estado: 'pendiente', ...valores }
          ;(tablas[tabla] ??= []).push(fila)
          return ok({ data: uno ? { id: fila.id } : [fila], error: null })
        }
        if (op === 'update') {
          const f = filas(); f.forEach(x => Object.assign(x, valores))
          return ok({ data: uno ? f[0] ?? null : f, error: null })
        }
        const f = filas()
        return ok({ data: uno ? f[0] ?? null : f, error: null })
      },
    }
    return q
  }
  return { cliente: { from } as never, llamadas, tablas }
}

describe('API del agente: autenticación', () => {
  it('sin ADMIN_AGENT_TOKEN, desactivada (404), aunque traiga cabecera', async () => {
    expect(autorizarAgente('Bearer algo', undefined)).toBe('desactivada')
    expect(autorizarAgente('Bearer algo', '  ')).toBe('desactivada')
    const r = await listarTareasAgente('desactivada', () => { throw new Error('no debe crear el cliente') })
    expect(r.status).toBe(404)
  })
  it('token inválido o ausente: 401, sin tocar la base', async () => {
    expect(autorizarAgente(null, 'secreto')).toBe('denegada')
    expect(autorizarAgente('Bearer otro', 'secreto')).toBe('denegada')
    expect(autorizarAgente('secreto', 'secreto')).toBe('denegada')
    const r = await actualizarTareaAgente('denegada', () => { throw new Error('no debe crear el cliente') }, 'x', {})
    expect(r.status).toBe(401)
  })
  it('token correcto', () => expect(autorizarAgente('Bearer secreto', 'secreto')).toBe('ok'))
})

describe('API del agente: alcance', () => {
  const ID_AGENTE = '11111111-1111-1111-1111-111111111111'
  const ID_PERSONA = '22222222-2222-2222-2222-222222222222'
  const datos = () => base({
    tareas_admin: [
      { id: ID_AGENTE, titulo: 'Del agente', asignado_tipo: 'agente', estado: 'pendiente', origen_tipo: 'correo', origen_ref: 'correo-secreto' },
      { id: ID_PERSONA, titulo: 'De una persona', asignado_tipo: 'persona', asignado_a: ADMIN, estado: 'pendiente' },
    ],
    tareas_admin_notas: [],
  })

  it('GET: solo sus tareas abiertas y solo los campos permitidos (sin el origen)', async () => {
    const d = datos()
    const r = await listarTareasAgente('ok', () => d.cliente)
    expect(r.status).toBe(200)
    expect(d.llamadas[0].filtros).toContainEqual(['eq', 'asignado_tipo', 'agente'])
    expect(d.llamadas[0].filtros).toContainEqual(['in', 'estado', ['pendiente', 'en_curso']])
    expect(COLUMNAS_AGENTE).not.toMatch(/origen_ref|origen_tipo|asignado_a|creado_por/)
    expect(COLUMNAS_AGENTE).toContain('origen_enlace')
  })

  it('PATCH: cambia el estado y añade la nota como agente', async () => {
    const d = datos()
    const r = await actualizarTareaAgente('ok', () => d.cliente, ID_AGENTE, { estado: 'resuelta', nota: 'Reimportado sin errores.' })
    expect(r.status).toBe(200)
    expect(d.tablas.tareas_admin[0].estado).toBe('resuelta')
    expect(d.tablas.tareas_admin_notas[0]).toMatchObject({ tarea_id: ID_AGENTE, autor: null, autor_tipo: 'agente', tipo: 'comentario', texto: 'Reimportado sin errores.' })
    const update = d.llamadas.find(l => l.op === 'update')!
    expect(update.valores).toEqual({ estado: 'resuelta' }) // nada más que el estado
    expect(update.filtros).toContainEqual(['eq', 'asignado_tipo', 'agente'])
  })

  it('PATCH: una tarea de una persona es «no encontrada» y no se toca', async () => {
    const d = datos()
    const r = await actualizarTareaAgente('ok', () => d.cliente, ID_PERSONA, { estado: 'resuelta' })
    expect(r.status).toBe(404)
    expect(d.tablas.tareas_admin[1].estado).toBe('pendiente')
    expect(d.llamadas.some(l => l.op !== 'select')).toBe(false)
  })

  it('PATCH: no acepta otros estados ni campos, ni notas enormes', async () => {
    const d = datos()
    expect((await actualizarTareaAgente('ok', () => d.cliente, ID_AGENTE, { estado: 'pendiente' })).status).toBe(400)
    expect((await actualizarTareaAgente('ok', () => d.cliente, ID_AGENTE, { titulo: 'otro', asignado_tipo: 'persona' })).status).toBe(400)
    expect((await actualizarTareaAgente('ok', () => d.cliente, ID_AGENTE, { nota: 'x'.repeat(4001) })).status).toBe(400)
    expect((await actualizarTareaAgente('ok', () => d.cliente, 'no-es-un-id', { estado: 'resuelta' })).status).toBe(404)
    expect(d.llamadas.some(l => l.op !== 'select')).toBe(false)
  })
})

describe('crear y asignar', () => {
  const equipo = () => base({
    tareas_admin: [{ id: 'abierta', titulo: 'Revisar noticias', origen_tipo: 'cola', origen_ref: 'noticias', estado: 'en_curso' }],
    profiles: [{ id: OTRA, email: 'otra@obrasdeteatro.com', nombre: 'Otra', nombre_artistico: null }, { id: ADMIN, email: 'renee@x.com', nombre: 'Renee', nombre_artistico: null }],
  })
  const datosBase = { titulo: 'Contestar', descripcion: null, prioridad: 'alta' as const, fecha_limite: null, origen_tipo: 'cola' as const, origen_ref: 'castings', origen_enlace: '/admin/castings' }

  it('no duplica: si hay una tarea abierta del mismo origen, devuelve esa', async () => {
    const d = equipo()
    const r = await crearTarea({ sesion: d.cliente, servicio: d.cliente, usuario: { id: ADMIN, esAdmin: true }, datos: { ...datosBase, origen_ref: 'noticias', asignado_tipo: null, asignado_a: null } })
    expect(r).toEqual({ existente: { id: 'abierta', titulo: 'Revisar noticias' } })
    expect(d.llamadas.some(l => l.op === 'insert')).toBe(false)
  })

  it('al asignar a otra persona, le avisa por correo; a sí misma, no', async () => {
    const d = equipo(); const avisos: unknown[] = []
    const enviar = async (a: unknown) => (avisos.push(a), true)
    const r = await crearTarea({ sesion: d.cliente, servicio: d.cliente, usuario: { id: ADMIN, esAdmin: true }, datos: { ...datosBase, asignado_tipo: 'persona', asignado_a: OTRA }, enviar })
    expect(r).toMatchObject({ ok: true, aviso: 'enviado' })
    expect(avisos[0]).toMatchObject({ para: 'otra@obrasdeteatro.com', nombre: 'Otra', titulo: 'Contestar', prioridad: 'alta' })
    const r2 = await crearTarea({ sesion: d.cliente, servicio: d.cliente, usuario: { id: ADMIN, esAdmin: true }, datos: { ...datosBase, origen_ref: 'otra-cola', asignado_tipo: 'persona', asignado_a: ADMIN }, enviar })
    expect(r2).toMatchObject({ ok: true, aviso: null })
    expect(avisos).toHaveLength(1)
  })

  it('si el correo falla, la tarea queda creada y se avisa', async () => {
    const d = equipo()
    const r = await crearTarea({ sesion: d.cliente, servicio: d.cliente, usuario: { id: ADMIN, esAdmin: true }, datos: { ...datosBase, asignado_tipo: 'persona', asignado_a: OTRA }, enviar: async () => false })
    expect(r).toMatchObject({ ok: true, aviso: 'fallo' })
    expect(d.tablas.tareas_admin).toHaveLength(2)
  })

  it('moderator: solo para sí y nunca de un correo', async () => {
    const d = equipo()
    const mod = { id: MOD, esAdmin: false }
    expect(await crearTarea({ sesion: d.cliente, servicio: d.cliente, usuario: mod, datos: { ...datosBase, asignado_tipo: 'persona', asignado_a: OTRA } })).toMatchObject({ error: expect.stringContaining('Solo puedes crear tareas para ti') })
    expect(await crearTarea({ sesion: d.cliente, servicio: d.cliente, usuario: mod, datos: { ...datosBase, asignado_tipo: 'agente', asignado_a: null } })).toMatchObject({ error: expect.any(String) })
    expect(await crearTarea({ sesion: d.cliente, servicio: d.cliente, usuario: mod, datos: { ...datosBase, origen_tipo: 'correo', origen_ref: 'c1', asignado_tipo: 'persona', asignado_a: MOD } })).toMatchObject({ error: expect.stringContaining('correo') })
    expect(d.llamadas.some(l => l.op === 'insert')).toBe(false)
  })

  it('reasignar es solo de admin y avisa a la nueva persona', async () => {
    const d = equipo(); const avisos: unknown[] = []
    expect(await reasignarTarea({ sesion: d.cliente, servicio: d.cliente, usuario: { id: MOD, esAdmin: false }, id: 'abierta', asignado_tipo: 'persona', asignado_a: OTRA })).toMatchObject({ error: expect.any(String) })
    const r = await reasignarTarea({ sesion: d.cliente, servicio: d.cliente, usuario: { id: ADMIN, esAdmin: true }, id: 'abierta', asignado_tipo: 'persona', asignado_a: OTRA, enviar: async a => (avisos.push(a), true) })
    expect(r).toMatchObject({ ok: true, aviso: 'enviado' })
    expect(avisos).toHaveLength(1)
  })
})

describe('correo de asignación', () => {
  it('título, prioridad y enlace a la tarea; nada del origen; escapa el HTML', () => {
    const c = correoAsignacion({ para: 'otra@x.com', nombre: 'Otra', tareaId: 'abc', titulo: 'Responder <b>ya</b>', prioridad: 'urgente', fechaLimite: '2026-11-02' })
    expect(c.from).toBe('ObrasDeTeatro® <no-reply@obrasdeteatro.com>')
    expect(c.subject).toBe('[Urgente] Tarea asignada: Responder <b>ya</b>')
    expect(c.text).toContain('Prioridad: Urgente')
    expect(c.text).toContain('Fecha límite: 2 de noviembre de 2026')
    expect(c.text).toContain('https://www.obrasdeteatro.com/admin/tareas/abc')
    expect(c.html).toContain('Responder &lt;b&gt;ya&lt;/b&gt;')
    expect(c.html).not.toContain('<b>ya</b>')
  })
})
