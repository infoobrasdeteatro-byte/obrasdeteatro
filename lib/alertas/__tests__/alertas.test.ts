import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  MAX_POR_CORREO,
  coincidencias,
  construirHtml,
  crearTokenBaja,
  desdeDe,
  enlaceVerTodas,
  esLunesEnMadrid,
  tocaEnvio,
  verificarTokenBaja,
  asunto,
  coincidenciasCastings,
  hoyEnMadrid,
  type CastingAlerta,
  type ConvocatoriaAlerta,
  type FiltrosCastings,
} from '../alertas'
import { camposDeFormData, validarAlerta } from '../formulario'

const LUNES = new Date('2026-10-12T07:30:00Z')
const MARTES = new Date('2026-10-13T07:30:00Z')
const ID = '0b5c6d7e-1234-4abc-9def-0123456789ab'

const conv = (id: string, extra: Partial<ConvocatoriaAlerta> = {}): ConvocatoriaAlerta => ({
  id, title: `Convocatoria ${id}`, entidad_convocante: 'Entidad', pais_code: 'ES', location: null,
  category: 'festival', deadline: '2026-11-30T22:59:59Z', fecha_publicacion: '2026-10-10T10:00:00Z', ...extra,
})

beforeEach(() => { process.env.ALERTAS_CONVOCATORIAS_SECRET = 'secreto-alertas' })

describe('coincidencia de filtros', () => {
  const desde = new Date('2026-10-05T07:30:00Z')
  const lista = [
    conv('es-festival'),
    conv('mx-premio', { pais_code: 'MX', category: 'premio' }),
    conv('sin-pais', { pais_code: null }),
    conv('vencida', { deadline: '2026-10-11T00:00:00Z' }),
    conv('antigua', { fecha_publicacion: '2026-10-01T00:00:00Z' }),
    conv('sin-plazo', { deadline: null }),
    conv('pronto', { deadline: '2026-10-20T00:00:00Z' }),
  ]

  it('listas vacías = todo, menos vencidas y anteriores al último envío; ordenadas por plazo', () => {
    const r = coincidencias({ paises: [], categorias: [] }, lista, desde, LUNES).map(c => c.id)
    expect(r).toEqual(['pronto', 'es-festival', 'mx-premio', 'sin-pais', 'sin-plazo'])
  })

  it('filtra por país (y deja fuera las que no tienen país)', () => {
    expect(coincidencias({ paises: ['MX'], categorias: [] }, lista, desde, LUNES).map(c => c.id)).toEqual(['mx-premio'])
  })

  it('filtra por categoría', () => {
    expect(coincidencias({ paises: [], categorias: ['premio'] }, lista, desde, LUNES).map(c => c.id)).toEqual(['mx-premio'])
  })

  it('país y categoría a la vez', () => {
    expect(coincidencias({ paises: ['ES'], categorias: ['premio'] }, lista, desde, LUNES)).toEqual([])
  })

  it('desde: el último envío o, la primera vez, hace 7 días', () => {
    expect(desdeDe({ ultimo_envio_at: '2026-10-09T07:30:00Z' }, LUNES).toISOString()).toBe('2026-10-09T07:30:00.000Z')
    expect(desdeDe({ ultimo_envio_at: null }, LUNES).toISOString()).toBe('2026-10-05T07:30:00.000Z')
  })
})

describe('frecuencia', () => {
  it('el 12-10-2026 es lunes en Madrid y el 13 no', () => {
    expect(esLunesEnMadrid(LUNES)).toBe(true)
    expect(esLunesEnMadrid(MARTES)).toBe(false)
  })

  it('diaria: todos los días, salvo si ya se envió en las últimas 20 h', () => {
    expect(tocaEnvio({ activa: true, frecuencia: 'diaria', ultimo_envio_at: null }, MARTES)).toBe(true)
    expect(tocaEnvio({ activa: true, frecuencia: 'diaria', ultimo_envio_at: '2026-10-12T07:30:00Z' }, MARTES)).toBe(true)
    expect(tocaEnvio({ activa: true, frecuencia: 'diaria', ultimo_envio_at: '2026-10-13T01:00:00Z' }, MARTES)).toBe(false)
  })

  it('semanal: solo los lunes, y no dos veces la misma semana', () => {
    expect(tocaEnvio({ activa: true, frecuencia: 'semanal', ultimo_envio_at: null }, LUNES)).toBe(true)
    expect(tocaEnvio({ activa: true, frecuencia: 'semanal', ultimo_envio_at: null }, MARTES)).toBe(false)
    expect(tocaEnvio({ activa: true, frecuencia: 'semanal', ultimo_envio_at: '2026-10-12T07:30:00Z' }, LUNES)).toBe(false)
  })

  it('inactiva: nunca; con solo castings activos, sí', () => {
    expect(tocaEnvio({ activa: false, frecuencia: 'diaria', ultimo_envio_at: null }, LUNES)).toBe(false)
    expect(tocaEnvio({ activa: false, castings_activa: true, frecuencia: 'diaria', ultimo_envio_at: null }, LUNES)).toBe(true)
  })
})

describe('token de baja', () => {
  it('válido: devuelve el usuario', () => {
    expect(verificarTokenBaja(crearTokenBaja(ID))).toBe(ID)
  })

  it('manipulado, de otro usuario o firmado con otro secreto: null', () => {
    const t = crearTokenBaja(ID)!
    const otro = Buffer.from('11111111-1234-4abc-9def-0123456789ab').toString('base64url')
    expect(verificarTokenBaja(`${otro}.${t.split('.')[1]}`)).toBeNull()
    expect(verificarTokenBaja(`${t}x`)).toBeNull()
    expect(verificarTokenBaja('basura')).toBeNull()
    process.env.ALERTAS_CONVOCATORIAS_SECRET = 'otro'
    expect(verificarTokenBaja(t)).toBeNull()
  })

  it('sin secreto: ni se crea ni se acepta', () => {
    const t = crearTokenBaja(ID)
    delete process.env.ALERTAS_CONVOCATORIAS_SECRET
    expect(crearTokenBaja(ID)).toBeNull()
    expect(verificarTokenBaja(t)).toBeNull()
  })
})

describe('correo', () => {
  it('como mucho 20, con enlace a cada ficha, «Ver todas», gestión y baja; texto escapado', () => {
    const lista = Array.from({ length: 25 }, (_, i) => conv(`c${i}`, { title: i === 0 ? 'Premio <b>X</b>' : `T${i}` }))
    const html = construirHtml({ paises: ['ES'] }, lista, 'TOKEN')
    expect(html.match(/Ver la convocatoria →/g)).toHaveLength(MAX_POR_CORREO)
    expect(html).toContain('https://www.obrasdeteatro.com/convocatoria/c0')
    expect(html).not.toContain('/convocatoria/c20"')
    expect(html).toContain('Te mostramos las 20 de cierre más próximo de 25 convocatorias.')
    expect(html).toContain('https://www.obrasdeteatro.com/convocatoria?pais=ES')
    expect(html).toContain('Gestionar mis alertas')
    expect(html).toContain('https://www.obrasdeteatro.com/alertas/baja?t=TOKEN')
    expect(html).toContain('Premio &lt;b&gt;X&lt;/b&gt;')
  })

  it('«Ver todas» sin país si la alerta tiene varios o ninguno', () => {
    expect(enlaceVerTodas({ paises: [] })).toBe('https://www.obrasdeteatro.com/convocatoria')
    expect(enlaceVerTodas({ paises: ['ES', 'MX'] })).toBe('https://www.obrasdeteatro.com/convocatoria')
  })
})

describe('formulario', () => {
  it('lee las casillas sin duplicados y valida', () => {
    const fd = new FormData()
    fd.set('activa', 'on'); fd.append('paises', 'ES'); fd.append('paises', 'ES'); fd.append('categorias', 'beca'); fd.set('frecuencia', 'diaria')
    const c = camposDeFormData(fd)
    expect(c).toEqual({
      activa: true, paises: ['ES'], categorias: ['beca'], frecuencia: 'diaria',
      castings_activa: false, castings_paises: [], castings_disciplinas: [], castings_edad: null, castings_genero: null, castings_solo_remunerados: false,
    })
    expect(validarAlerta(c)).toBeNull()
    expect(validarAlerta({ ...c, paises: ['US'] })).toMatch(/país/)
    expect(validarAlerta({ ...c, categorias: ['casting'] })).toMatch(/categoría/)
    expect(validarAlerta({ ...c, frecuencia: 'mensual' })).toMatch(/frecuencia/)
  })

  it('lee y valida los filtros de castings', () => {
    const fd = new FormData()
    fd.set('frecuencia', 'semanal'); fd.set('castings_activa', 'on'); fd.append('castings_paises', 'MX'); fd.append('castings_disciplinas', 'teatro')
    fd.set('castings_edad', '34'); fd.set('castings_genero', 'Femenino'); fd.set('castings_solo_remunerados', 'on')
    const c = camposDeFormData(fd)
    expect(c).toMatchObject({ activa: false, castings_activa: true, castings_paises: ['MX'], castings_disciplinas: ['teatro'], castings_edad: 34, castings_genero: 'Femenino', castings_solo_remunerados: true })
    expect(validarAlerta(c)).toBeNull()
    expect(validarAlerta({ ...c, castings_paises: ['US'] })).toMatch(/país/)
    expect(validarAlerta({ ...c, castings_edad: 0 })).toMatch(/edad/)
    expect(validarAlerta({ ...c, castings_edad: Number('abc') })).toMatch(/edad/)
    expect(validarAlerta({ ...c, castings_genero: 'Indistinto' })).toMatch(/género/)
    expect(validarAlerta({ ...c, castings_disciplinas: ['<x>'] })).toMatch(/disciplina/)
  })
})

describe('castings', () => {
  const desde = new Date('2026-10-05T07:30:00Z')
  const FILTROS: FiltrosCastings = {
    castings_activa: true, castings_paises: [], castings_disciplinas: [], castings_edad: null, castings_genero: null, castings_solo_remunerados: false,
  }
  const cast = (id: string, extra: Partial<CastingAlerta> = {}): CastingAlerta => ({
    id, titulo: `Casting ${id}`, entidad_organizadora: 'Compañía', pais: 'España', ciudad: 'Madrid', fecha_cierre: '2026-11-15',
    modalidad: 'Presencial', tipo_remuneracion: 'remunerado', categorias: ['teatro'], edad_min: null, edad_max: null,
    genero_escenico: 'Indistinto', publicado_at: '2026-10-10T10:00:00Z', ...extra,
  })
  const lista = [
    cast('es'),
    cast('mx-danza', { pais: 'México', categorias: ['danza'], fecha_cierre: '2026-10-20' }),
    cast('cierra-hoy', { fecha_cierre: '2026-10-12' }),
    cast('cerrado', { fecha_cierre: '2026-10-11' }),
    cast('antiguo', { publicado_at: '2026-10-01T00:00:00Z' }),
    cast('sin-publicar', { publicado_at: null }),
    cast('joven-fem', { edad_min: 18, edad_max: 25, genero_escenico: 'Femenino' }),
    cast('masc', { genero_escenico: 'Masculino', tipo_remuneracion: 'cooperativa' }),
    cast('sin-pais', { pais: null }),
  ]
  const ids = (f: Partial<FiltrosCastings>) => coincidenciasCastings({ ...FILTROS, ...f }, lista, desde, LUNES).map(c => c.id)

  it('sin filtros: todo lo publicado desde el último aviso con plazo abierto (hoy incluido), por cierre', () => {
    expect(hoyEnMadrid(LUNES)).toBe('2026-10-12')
    expect(ids({})).toEqual(['cierra-hoy', 'mx-danza', 'es', 'joven-fem', 'masc', 'sin-pais'])
  })
  it('desactivada: nada', () => {
    expect(ids({ castings_activa: false })).toEqual([])
  })
  it('país (por código; sin país queda fuera) y disciplina', () => {
    expect(ids({ castings_paises: ['MX'] })).toEqual(['mx-danza'])
    expect(ids({ castings_disciplinas: ['danza', 'opera'] })).toEqual(['mx-danza'])
  })
  it('edad dentro del rango; sin rango entra siempre', () => {
    expect(ids({ castings_edad: 40 })).not.toContain('joven-fem')
    expect(ids({ castings_edad: 20 })).toContain('joven-fem')
  })
  it('género: el mismo o «Indistinto»', () => {
    const r = ids({ castings_genero: 'Masculino' })
    expect(r).toContain('masc'); expect(r).toContain('es'); expect(r).not.toContain('joven-fem')
  })
  it('solo remunerados', () => {
    expect(ids({ castings_solo_remunerados: true })).not.toContain('masc')
  })
})

describe('correo combinado', () => {
  it('asunto según lo que haya', () => {
    expect(asunto(2)).toBe('2 convocatorias nuevas para ti')
    expect(asunto(0, 1)).toBe('1 casting nuevo para ti')
    expect(asunto(0, 3)).toBe('3 castings nuevos para ti')
    expect(asunto(1, 2)).toBe('Tus alertas: 2 castings y 1 convocatoria')
  })
  it('dos secciones con sus enlaces; disciplina con su etiqueta', () => {
    const c: CastingAlerta = {
      id: 'k1', titulo: 'Actriz <30', entidad_organizadora: 'Cía', pais: 'Chile', ciudad: 'Santiago', fecha_cierre: '2026-11-01',
      modalidad: null, tipo_remuneracion: 'remunerado', categorias: ['teatro'], edad_min: null, edad_max: 30, genero_escenico: 'Femenino', publicado_at: null,
    }
    const html = construirHtml({ paises: [] }, [conv('a')], 'T', [c], new Map([['teatro', 'Teatro']]))
    expect(html).toContain('Castings (1)')
    expect(html).toContain('Convocatorias (1)')
    expect(html).toContain('https://www.obrasdeteatro.com/castings/k1')
    expect(html).toContain('Actriz &lt;30')
    expect(html).toContain('Santiago, Chile · Remunerado · Cierra: 1 de noviembre de 2026')
    expect(html).toContain('>Teatro<')
    expect(html.indexOf('/castings/k1')).toBeLessThan(html.indexOf('/convocatoria/a'))
    const solo = construirHtml({ paises: [] }, [], 'T', [c])
    expect(solo).not.toContain('Ver todas las convocatorias')
    expect(solo).toContain('Castings publicados desde')
  })
})

describe('migración 20261008090000 — contratos', () => {
  const CODIGO = readFileSync(
    join(__dirname, '..', '..', '..', 'supabase', 'migrations', '20261008090000_alertas_convocatorias.sql'), 'utf-8',
  ).replace(/--.*$/gm, '')

  it('una fila por usuario, borrada con su perfil; frecuencia semanal por defecto', () => {
    expect(CODIGO).toMatch(/profile_id uuid primary key references public\.profiles \(id\) on delete cascade/)
    expect(CODIGO).toMatch(/frecuencia text not null default 'semanal'/)
    expect(CODIGO).toMatch(/frecuencia in \('diaria', 'semanal'\)/)
  })

  it('cada uno su fila, y escribir exige plan de pago', () => {
    expect(CODIGO).toMatch(/for select\s+using \(profile_id = auth\.uid\(\)\)/)
    expect(CODIGO).toMatch(/for insert\s+with check \(profile_id = auth\.uid\(\) and public\.plan_de_pago\(\)\)/)
    expect(CODIGO).toMatch(/for update\s+using \(profile_id = auth\.uid\(\)\)\s+with check \(profile_id = auth\.uid\(\) and public\.plan_de_pago\(\)\)/)
  })

  it('el usuario no puede escribir ultimo_envio_at', () => {
    expect(CODIGO).toMatch(/revoke insert, update, truncate on public\.alertas_convocatorias from authenticated/)
    expect(CODIGO).toMatch(/grant update \(activa, paises, categorias, frecuencia\)/)
    expect(CODIGO).not.toMatch(/grant [^;]*ultimo_envio_at/)
  })
})
