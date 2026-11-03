import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  CORTESIA_COLEGA_TEXTO, ESCALONES_EMBAJADOR, VISTA_PREVIA_REFERIDO, distintivoEmbajador, mensajeColegas, progresoEmbajador,
  recompensaEmbajador, tituloHonor,
} from '../textos'
import { asuntoEmbajador, htmlEmbajador, textoEmbajador, REMITENTE_EMBAJADORES, type AvisoEmbajador } from '../correo'
import { construirPanelEmbajadores, csvColegas, csvEmbajadores, situacionMembresia, type ColegaEmbajadorBD, type EmbajadorBD } from '../admin'
import { ordenarDirectorio } from '@/lib/directorio/orden'

const RAIZ = path.resolve(__dirname, '../../..')
const leer = (f: string) => readFileSync(path.join(RAIZ, f), 'utf8')
const AHORA = Date.parse('2026-11-03T12:00:00Z')

describe('textos de los colegas: tres meses, Premium o Empresas', () => {
  it('el mensaje para colegas y la vista previa del enlace', () => {
    const m = mensajeColegas('https://www.obrasdeteatro.com/r/ABCD2345')
    expect(m).toContain(CORTESIA_COLEGA_TEXTO)
    expect(m).toContain('tres meses gratis de Premium')
    expect(m).toContain('plan Empresas')
    expect(VISTA_PREVIA_REFERIDO.titulo).toBe('Te invitan a ObrasDeTeatro® · Tres meses gratis')
    expect(VISTA_PREVIA_REFERIDO.descripcion).toContain('plan Empresas para organizaciones')
  })

  it.each([
    'lib/embajadores/textos.ts', 'components/embajadores/TarjetaCortesia.tsx', 'app/auth/registro/page.tsx',
    'app/invitacion/[token]/page.tsx', 'app/r/[codigo]/route.ts', 'app/precios/page.tsx', 'lib/embajadores/correo.ts',
  ])('%s ya no promete «un mes» ni «1 mes» de Premium', (f) => {
    expect(leer(f)).not.toMatch(/\b(un|1) mes\b/i)
  })

  it('el aviso del registro habla de «ustedes» a las organizaciones', () => {
    const c = leer('app/auth/registro/page.tsx')
    expect(c).toContain('Vienen invitados por un/a Embajador/a de Escena: al confirmar su cuenta tendrán <strong>tres meses del plan Empresas gratis</strong>')
    expect(c).toContain('tendrás <strong>tres meses de Premium gratis</strong>')
  })

  it('la tarjeta de un colega organización, en «ustedes»', () => {
    const c = leer('components/embajadores/TarjetaCortesia.tsx')
    expect(c).toContain('Disfrutan del plan Empresas hasta el')
    expect(c).toContain('si lo desean, podrán suscribirse')
    expect(c).toContain('¿Seguro que quieren terminar ahora sus meses del plan Empresas?')
  })
})

describe('escalera del embajador', () => {
  it('escalones 5, 10 y 25 con su recompensa', () => {
    expect([...ESCALONES_EMBAJADOR]).toEqual([5, 10, 25])
    expect(recompensaEmbajador(5, 'f')).toBe('6 meses más de tu membresía Destacado')
    expect(recompensaEmbajador(10, 'm')).toBe('12 meses más de tu membresía Destacado')
    expect(recompensaEmbajador(25, 'f')).toBe('Embajadora de Honor: tu membresía Destacado para siempre')
    expect(recompensaEmbajador(25, 'm')).toBe('Embajador de Honor: tu membresía Destacado para siempre')
  })

  it('progreso hasta el siguiente escalón', () => {
    expect(progresoEmbajador(0)).toEqual({ siguiente: 5, anterior: 0, progreso: 0 })
    expect(progresoEmbajador(7)).toMatchObject({ siguiente: 10, anterior: 5 })
    expect(progresoEmbajador(7)!.progreso).toBeCloseTo(0.4)
    expect(progresoEmbajador(24)).toMatchObject({ siguiente: 25, anterior: 10 })
    expect(progresoEmbajador(25)).toBeNull()
  })

  it('distintivo: de Honor si lo es', () => {
    expect(distintivoEmbajador('f', false)).toBe('Embajadora de Escena')
    expect(distintivoEmbajador('m', true)).toBe('Embajador de Honor')
    expect(tituloHonor('f')).toBe('Embajadora de Honor')
  })
})

describe('correo al subir de escalón', () => {
  const base: AvisoEmbajador = { recompensaId: 'x', para: 'a@b.es', nombre: 'Lucía Pérez', genero: 'f', escalon: 5, puntos: 6, hasta: '2027-04-28T10:00:00+00:00' }

  it('sale de no-reply y cuenta la recompensa y el nuevo fin de la membresía', () => {
    expect(REMITENTE_EMBAJADORES).toBe('ObrasDeTeatro® <no-reply@obrasdeteatro.com>')
    expect(asuntoEmbajador(base)).toBe('Has llegado a 5 puntos como Embajadora de Escena')
    const t = textoEmbajador(base)
    expect(t).toMatch(/^Hola Lucía:/)
    expect(t).toContain('ya tienes 6 puntos como Embajadora de Escena')
    expect(t).toContain('6 meses más de tu membresía Destacado')
    expect(t).toContain('llega ahora hasta el 28 de abril de 2027')
    expect(t).toContain('https://www.obrasdeteatro.com/perfil/centro')
  })

  it('25 puntos: Embajador/a de Honor, para siempre', () => {
    const a = { ...base, genero: 'm' as const, escalon: 25, puntos: 26, hasta: 'infinity' }
    expect(asuntoEmbajador(a)).toBe('Ya eres Embajador de Honor')
    expect(textoEmbajador(a)).toContain('es para siempre')
    expect(htmlEmbajador(a)).toContain('Embajador de Honor')
  })

  it('escapa el nombre en el HTML', () => {
    expect(htmlEmbajador({ ...base, nombre: '<b>x</b>' })).toContain('Hola &lt;b&gt;x&lt;/b&gt;:')
  })
})

describe('panel de administración', () => {
  const emb = (id: string, extra: Partial<EmbajadorBD> = {}): EmbajadorBD =>
    ({ profile_id: id, nombre: `Emb ${id}`, genero: 'f', aceptada_at: '2026-10-01T00:00:00Z', hasta: '2027-10-01T00:00:00Z', renunciada_at: null, honor_at: null, ...extra })
  const col = (e: string, p: string, extra: Partial<ColegaEmbajadorBD> = {}): ColegaEmbajadorBD =>
    ({ embajador_id: e, profile_id: p, alta: '2026-10-20T00:00:00Z', nombre: `Colega ${p}`, tipo_perfil: 'actor', clase: 'persona', activo: false, puntos: 0, ...extra })

  const datos = () => ({
    embajadores: [emb('A'), emb('B', { hasta: 'infinity', honor_at: '2026-11-01T00:00:00Z', genero: 'm' })],
    colegas: [
      col('A', 'p1', { activo: true, puntos: 1 }),
      col('A', 'p2', { clase: 'organizacion', tipo_perfil: 'compania', activo: true, puntos: 3 }),
      col('A', 'p3'),
      col('B', 'p4', { activo: true, puntos: 3, clase: 'sala', tipo_perfil: 'teatro' }),
      col('A', 'p5'),
    ],
    planes: new Map([['p1', 'premium'], ['p2', 'empresas'], ['p3', 'destacado'], ['p4', 'empresas'], ['p5', 'premium']]),
    suscripciones: new Map([
      ['p1', { plan: 'premium', status: 'active', stripe_price_id: null, created_at: '2026-10-25T00:00:00Z' }],
      ['p4', { plan: 'empresas', status: 'trialing', stripe_price_id: null, created_at: null }],
      ['p5', { plan: 'premium', status: 'past_due', stripe_price_id: null, created_at: null }],
    ]),
    cortesias: new Map([['p2', 'empresas']]),
    escalones: new Map([['B', 25]]),
    ahora: AHORA,
  })

  it('registrados, activos, de pago (solo subscriptions active o trialing), puntos, escalón y fin', () => {
    const { filas, totales } = construirPanelEmbajadores(datos())
    const a = filas.find(f => f.id === 'A')!
    expect(a).toMatchObject({ registrados: 4, activos: 2, dePago: 1, puntos: 4, escalon: 0, situacion: 'activa', hasta: '2027-10-01T00:00:00Z' })
    const b = filas.find(f => f.id === 'B')!
    expect(b).toMatchObject({ registrados: 1, activos: 1, dePago: 1, puntos: 3, escalon: 25, situacion: 'honor', hasta: null, titulo: 'Embajador de Honor' })
    expect(totales).toEqual({ embajadores: 2, registrados: 5, activos: 3, dePago: 2 })
  })

  it('origen del plan de cada colega: pago, cortesía o gratuito (nunca deducido de profiles.plan)', () => {
    const { filas } = construirPanelEmbajadores(datos())
    const o = Object.fromEntries(filas.flatMap(f => f.colegas).map(c => [c.profileId, c.origen.origen]))
    expect(o).toEqual({ p1: 'pago', p2: 'cortesia', p3: 'sin_pago_activo', p4: 'pago', p5: 'sin_pago_activo' })
  })

  it('situación de la membresía', () => {
    expect(situacionMembresia({ hasta: '2026-11-01T00:00:00Z', renunciada_at: null, honor_at: null }, AHORA)).toBe('vencida')
    expect(situacionMembresia({ hasta: '2027-01-01T00:00:00Z', renunciada_at: '2026-10-30T00:00:00Z', honor_at: null }, AHORA)).toBe('renuncio')
  })

  it('CSV de embajadores y de colegas', () => {
    const { filas } = construirPanelEmbajadores(datos())
    const e = csvEmbajadores(filas).split('\r\n')
    expect(e[0]).toBe('Embajador/a;Distintivo;Membresía;Fin de la membresía;Registrados;Activos;De pago;Puntos;Escalón')
    expect(e).toContain('Emb A;Embajadora de Escena;Activa;2027-10-01;4;2;1;4;')
    expect(e).toContain('Emb B;Embajador de Honor;De Honor (para siempre);para siempre;1;1;1;3;25')
    const c = csvColegas(filas).split('\r\n')
    expect(c).toHaveLength(6)
    expect(c).toContain('Emb A;Colega p2;Organización;2026-10-20;sí;3;empresas;Cortesía · empresas;;')
  })
})

describe('directorio: los embajadores, los primeros', () => {
  const p = (id: string, nombre: string, plan = 'gratuito', verificado_profesional = false) => ({ id, nombre, plan, verificado_profesional })
  const lista = [
    p('1', 'Ana', 'destacado'), p('2', 'Bruno', 'gratuito', true), p('3', 'Carla'), p('4', 'Diego', 'empresas'),
    p('5', 'Elena', 'gratuito'), p('6', 'Félix', 'premium', true),
  ]

  it('sin embajadores, el orden de siempre (plan prioritario, verificado, nombre)', () => {
    expect(ordenarDirectorio(lista, new Set()).map(x => x.nombre)).toEqual(['Ana', 'Diego', 'Bruno', 'Félix', 'Carla', 'Elena'])
  })

  it('los embajadores van delante; entre ellos y en el resto, el mismo orden de siempre', () => {
    expect(ordenarDirectorio(lista, new Set(['5', '6', '4'])).map(x => x.nombre)).toEqual(['Diego', 'Félix', 'Elena', 'Ana', 'Bruno', 'Carla'])
  })

  it('el directorio pide los distintivos de todos los resultados antes de ordenar', () => {
    const c = leer('app/directorio/page.tsx')
    expect(c).toContain("supabase.rpc('embajadores_distintivos', { p_perfiles: profileIds })")
    expect(c.indexOf("rpc('embajadores_distintivos'")).toBeLessThan(c.indexOf('ordenarDirectorio(perfilesRaw'))
  })
})
