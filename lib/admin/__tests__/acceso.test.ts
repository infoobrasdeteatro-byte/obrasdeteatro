import { describe, it, expect } from 'vitest'
import { accesoDesdeRoles, leerAcceso } from '../acceso'
import { seccionesVisibles, GRUPOS_SECCIONES } from '../secciones'
import { contar, elementosAtencion, totalColas } from '../colas'

describe('guard de roles del Master Control', () => {
  it('admin entra y ve lo de administración', () => {
    expect(accesoDesdeRoles(['admin'])).toEqual({ permitido: true, esAdmin: true })
    expect(accesoDesdeRoles(['moderator', 'admin'])).toEqual({ permitido: true, esAdmin: true })
  })
  it('moderator entra sin lo de administración', () => {
    expect(accesoDesdeRoles(['moderator'])).toEqual({ permitido: true, esAdmin: false })
  })
  it('sin rol de equipo no entra', () => {
    expect(accesoDesdeRoles([])).toEqual({ permitido: false, esAdmin: false })
    expect(accesoDesdeRoles(['editor', null, undefined])).toEqual({ permitido: false, esAdmin: false })
  })

  it('lee los roles con la sesión y filtra por la propia cuenta', async () => {
    const llamadas: unknown[][] = []
    const q = {
      select: (...a: unknown[]) => (llamadas.push(['select', ...a]), q),
      eq: (...a: unknown[]) => (llamadas.push(['eq', ...a]), q),
      in: (...a: unknown[]) => (llamadas.push(['in', ...a]), Promise.resolve({ data: [{ role: 'moderator' }], error: null })),
    }
    const supabase = { from: (t: string) => (llamadas.push(['from', t]), q) }
    expect(await leerAcceso(supabase as never, 'u1')).toEqual({ permitido: true, esAdmin: false })
    expect(llamadas).toContainEqual(['from', 'profile_roles'])
    expect(llamadas).toContainEqual(['eq', 'profile_id', 'u1'])
    expect(llamadas).toContainEqual(['in', 'role', ['admin', 'moderator']])
  })

  it('una lectura fallida no deja entrar', async () => {
    const q = { select: () => q, eq: () => q, in: () => Promise.resolve({ data: null, error: { message: 'x' } }) }
    expect(await leerAcceso({ from: () => q } as never, 'u1')).toEqual({ permitido: false, esAdmin: false })
  })
})

describe('secciones', () => {
  it('son 16 en cuatro grupos', () => {
    expect(GRUPOS_SECCIONES.flatMap(g => g.secciones)).toHaveLength(16)
    expect(GRUPOS_SECCIONES.map(g => g.titulo)).toEqual(['Moderación', 'Catálogos', 'Comunidad', 'Comunicación'])
  })
  it('moderación no ve Embajadores, Avisos de perfil, Recordatorio de confirmación ni Correo entrante', () => {
    const hrefs = seccionesVisibles(false).flatMap(g => g.secciones.map(s => s.href))
    expect(hrefs).toHaveLength(12)
    expect(hrefs).not.toContain('/admin/embajadores')
    expect(hrefs).not.toContain('/admin/avisos-perfil')
    expect(hrefs).not.toContain('/admin/recordatorio-confirmacion')
    expect(hrefs).not.toContain('/admin/correo')
    expect(seccionesVisibles(true).flatMap(g => g.secciones)).toHaveLength(16)
  })
})

describe('requiere tu atención', () => {
  it('solo las colas con pendientes, en singular o plural', () => {
    const e = elementosAtencion({ noticias: 3, castings: 0, reportes: 1 }, true)
    expect(e.map(x => x.texto)).toEqual(['3 noticias candidatas', '1 reporte de casting abierto'])
    expect(e[0].href).toBe('/admin/noticias')
  })
  it('vacío cuando todo está al día', () => {
    expect(elementosAtencion({ noticias: 0, castings: 0 }, true)).toEqual([])
  })
  it('una cola que no se pudo contar se avisa, no se oculta', () => {
    expect(elementosAtencion({ verificaciones: null }, false)[0].texto).toBe('No se pudo contar: verificaciones pendientes')
  })
  it('moderación no ve las colas de solo administración', () => {
    expect(elementosAtencion({ avisos: 4, recordatorios: 2, noticias: 1 }, false).map(x => x.clave)).toEqual(['noticias'])
    expect(elementosAtencion({ avisos: 4, recordatorios: 2 }, true).map(x => x.clave)).toEqual(['avisos', 'recordatorios'])
    expect(elementosAtencion({ correo: 3 }, false)).toEqual([])
    expect(elementosAtencion({ correo: 1 }, true)[0]).toMatchObject({ texto: '1 correo sin atender', href: '/admin/correo?estado=pendientes' })
  })
  it('totalColas suma las colas de una sección', () => {
    expect(totalColas({ reclamaciones: 2, sugerencias: 3 }, ['reclamaciones', 'sugerencias'])).toBe(5)
    expect(totalColas({ reclamaciones: null, sugerencias: 3 }, ['reclamaciones', 'sugerencias'])).toBe(3)
    expect(totalColas({}, ['noticias'])).toBeNull()
    expect(totalColas({ noticias: 2 })).toBeNull()
  })
})

describe('contar: un recuento vacío es un fallo, no un cero', () => {
  const r = (v: { count: number | null; error: unknown }) => Promise.resolve(v)
  it('un número vale tal cual, incluido el 0', async () => {
    expect(await contar(r({ count: 3, error: null }))).toBe(3)
    expect(await contar(r({ count: 0, error: null }))).toBe(0)
  })
  it('con error, null', async () => {
    expect(await contar(r({ count: null, error: { message: 'x' } }))).toBeNull()
  })
  it('sin error pero sin número (HEAD a una tabla que no existe), null', async () => {
    expect(await contar(r({ count: null, error: null }))).toBeNull()
  })
  it('y en el panel sale como «No se pudo contar», no desaparece', () => {
    expect(elementosAtencion({ correo: null }, true)[0].texto).toBe('No se pudo contar: correos sin atender')
  })
})
