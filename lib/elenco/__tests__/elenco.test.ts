import { describe, it, expect } from 'vitest'
import {
  distintivo, enlaceElenco, leerNumero, mensajeColegasElenco, mensajeInvitacion, numeroFundador, progresoEscalera,
  puntosColega, tokenDeInvitacionElenco,
} from '../textos'
import { ingresoMensual, origenPlan, filaCsv } from '../origen-plan'
import { construirPanel, csvFundadores, csvReferidos, estadoBono, type ColegaBD, type FundadorBD } from '../admin'
import { asuntoEscalon, textoEscalon, REMITENTE_ELENCO } from '../correo'

const TOKEN = 'a'.repeat(32)
const ENV = { STRIPE_PRICE_PREMIUM_ID: 'p_m', STRIPE_PRICE_PREMIUM_ANUAL_ID: 'p_a', STRIPE_PRICE_EMPRESAS_ID: 'e_m', STRIPE_PRICE_EMPRESAS_ANUAL_ID: 'e_a' }

describe('textos', () => {
  it('números de fundador 001–100', () => {
    expect(numeroFundador(7)).toBe('007')
    expect(distintivo(7)).toBe('Elenco Fundador nº 007')
    expect(enlaceElenco(7)).toBe('https://www.obrasdeteatro.com/elenco/007')
    expect([leerNumero('007'), leerNumero('7'), leerNumero('100'), leerNumero('000'), leerNumero('101'), leerNumero('x7'), leerNumero(null)])
      .toEqual([7, 7, 100, null, null, null, null])
  })

  it('reconoce la ruta de una invitación del Elenco', () => {
    expect(tokenDeInvitacionElenco(`/elenco/invitacion/${TOKEN}`)).toBe(TOKEN)
    expect(tokenDeInvitacionElenco(`/invitacion/${TOKEN}`)).toBeNull()
  })

  it('los mensajes llevan su enlace y nunca mencionan plazas ni a otros invitados', () => {
    const persona = mensajeInvitacion('persona', 'Lucía Pérez', TOKEN)
    const org = mensajeInvitacion('organizacion', 'Teatro del Sur', TOKEN)
    const colegas = mensajeColegasElenco('Lucía Pérez', 7)
    expect(persona).toMatch(/^Hola Lucía, soy Renee Bausson, de ObrasDeTeatro®/)
    expect(persona).toContain('tres meses de Premium')
    expect(persona).toContain(`/elenco/invitacion/${TOKEN}`)
    expect(org).toContain('tres meses del plan Empresas')
    expect(org).toMatch(/cartelera y vuestros castings/)
    expect(colegas).toMatch(/^Hola, soy Lucía Pérez y formo parte del Elenco Fundador/)
    expect(colegas).toContain('/elenco/007')
    for (const m of [persona, org, colegas]) {
      expect(m).not.toMatch(/\b100\b|plazas|otros invitados/i)
    }
  })

  it('progreso hasta el siguiente escalón', () => {
    expect(progresoEscalera(0)).toEqual({ siguiente: 5, anterior: 0, progreso: 0 })
    expect(progresoEscalera(7)).toMatchObject({ siguiente: 10, anterior: 5 })
    expect(progresoEscalera(7)!.progreso).toBeCloseTo(0.4)
    expect(progresoEscalera(50)).toBeNull()
    expect(puntosColega('actor')).toBe(1)
    expect(puntosColega('teatro')).toBe(3)
  })
})

describe('origen del plan de un referido', () => {
  const sub = (status: string, price = 'p_m', plan = 'premium') => ({ plan, status, stripe_price_id: price, created_at: '2026-10-01T00:00:00Z' })

  it('pago solo con suscripción active o trialing, nunca por profiles.plan', () => {
    expect(origenPlan('premium', sub('active'), null, ENV)).toMatchObject({ origen: 'pago', plan: 'premium', periodo: 'mensual', mensualEur: 2.99 })
    expect(origenPlan('premium', sub('trialing', 'p_a'), null, ENV)).toMatchObject({ origen: 'pago', periodo: 'anual', mensualEur: 2.49 })
    // Premium en el perfil sin suscripción activa: no es pago.
    expect(origenPlan('premium', sub('past_due'), null, ENV).origen).toBe('sin_pago_activo')
    expect(origenPlan('premium', null, null, ENV).origen).toBe('sin_pago_activo')
  })

  it('cortesía: membresía regalada vigente; si además paga, cuenta como pago', () => {
    expect(origenPlan('premium', null, 'premium', ENV)).toEqual({ origen: 'cortesia', plan: 'premium' })
    expect(origenPlan('empresas', sub('active', 'e_m', 'empresas'), 'premium', ENV).origen).toBe('pago')
    expect(origenPlan('gratuito', undefined, null, ENV)).toEqual({ origen: 'gratuito' })
  })

  it('ingresos mensuales: los anuales divididos entre 12', () => {
    expect(ingresoMensual('premium', 'mensual')).toBe(2.99)
    expect(ingresoMensual('premium', 'anual')).toBe(2.49)
    expect(ingresoMensual('empresas', 'anual')).toBe(12.49)
    expect(ingresoMensual('desconocido', 'mensual')).toBe(0)
  })
})

describe('panel de administración', () => {
  const AHORA = Date.parse('2026-11-01T00:00:00Z')
  const fundador = (o: Partial<FundadorBD>): FundadorBD => ({
    id: 'f1', numero: 1, token: TOKEN, nombre: 'Ana', tipo: 'persona', oficio: 'Interpretación', telefono: '+34600000000', email: null,
    nota: null, estado: 'aceptada', creada_at: '2026-10-01T00:00:00Z', aceptada_por: 'pa', aceptada_at: '2026-10-02T00:00:00Z',
    bono_activado_at: null, ...o,
  })
  const colega = (o: Partial<ColegaBD>): ColegaBD => ({
    fundador_id: 'f1', profile_id: 'r1', alta: '2026-10-10T00:00:00Z', nombre: 'R', tipo_perfil: 'actor', clase: 'persona', activo: true, puntos: 1, ...o,
  })

  it('totales, de pago frente a cortesía e ingresos', () => {
    const { filas, totales } = construirPanel({
      fundadores: [fundador({}), fundador({ id: 'f2', numero: 2, estado: 'pendiente', aceptada_por: null, aceptada_at: null }), fundador({ id: 'f3', numero: 3, estado: 'anulada' })],
      colegas: [
        colega({ profile_id: 'r1' }),
        colega({ profile_id: 'r2', activo: false, puntos: 0 }),
        colega({ profile_id: 'r3', tipo_perfil: 'compania', clase: 'organizacion', puntos: 3 }),
        colega({ profile_id: 'r4' }),
      ],
      planes: new Map([['r1', 'premium'], ['r2', 'gratuito'], ['r3', 'empresas'], ['r4', 'premium']]),
      suscripciones: new Map([
        ['r1', { plan: 'premium', status: 'active', stripe_price_id: 'p_m', created_at: '2026-10-20T00:00:00Z' }],
        ['r3', { plan: 'empresas', status: 'active', stripe_price_id: 'e_a', created_at: '2026-10-21T00:00:00Z' }],
      ]),
      cortesias: new Map([['r4', 'premium']]),
      escalones: new Map([['f1', 5]]),
      semanasPendientes: new Map(),
      bonoHasta: new Map(),
      ahora: AHORA,
      env: ENV,
    })
    expect(filas.map(f => f.numero)).toEqual([1, 2])
    expect(filas[0]).toMatchObject({ registrados: 4, activos: 3, dePago: 2, puntos: 5, escalon: 5, bono: 'disponible' })
    expect(filas[0].referidos.find(r => r.profileId === 'r4')!.origen.origen).toBe('cortesia')
    expect(filas[1].bono).toBe('pendiente')
    expect(totales).toEqual({ fundadores: 1, registrados: 4, activos: 3, dePago: 2, ingresosMensuales: 15.48 })

    const csv = csvFundadores(filas).split('\r\n')
    expect(csv[0]).toBe('Número;Nombre;Tipo;Oficio;Estado;Fecha;Registrados;Activos;De pago;Puntos;Escalón;Bono')
    expect(csv[1]).toBe('001;Ana;Persona;Interpretación;Aceptada;2026-10-02;4;3;2;5;5;disponible')
    const ref = csvReferidos(filas)
    expect(ref).toContain('001;R;persona;2026-10-10;sí;premium;Pago · premium mensual;mensual;2026-10-20;2.99')
    expect(ref).toContain('Cortesía · premium')
  })

  it('estado del bono: disponible, activo, disfrutado y caducado a los 12 meses', () => {
    const f = { estado: 'aceptada', aceptada_at: '2026-10-02T00:00:00Z', bono_activado_at: null }
    expect(estadoBono(f, undefined, AHORA)).toBe('disponible')
    expect(estadoBono(f, undefined, Date.parse('2027-10-03T00:00:00Z'))).toBe('caducado')
    const activado = { ...f, bono_activado_at: '2026-10-20T00:00:00Z' }
    expect(estadoBono(activado, '2027-01-20T00:00:00Z', AHORA)).toBe('activo')
    expect(estadoBono(activado, '2027-01-20T00:00:00Z', Date.parse('2027-02-01T00:00:00Z'))).toBe('usado')
  })

  it('CSV con comillas cuando hace falta', () => {
    expect(filaCsv(['a;b', 'c"d', null, 3])).toBe('"a;b";"c""d";;3')
  })
})

describe('correo al subir de escalón', () => {
  it('sale de no-reply y describe la recompensa', () => {
    const a = { recompensaId: 'x', para: 'a@b.es', nombre: 'Ana López', numero: 7, tipo: 'organizacion' as const, escalon: 25, puntos: 27 }
    expect(REMITENTE_ELENCO).toBe('ObrasDeTeatro® <no-reply@obrasdeteatro.com>')
    expect(asuntoEscalon(a)).toBe('Has llegado a 25 puntos en el Elenco Fundador')
    expect(asuntoEscalon({ escalon: 50 })).toBe('Eres Miembro de Honor del Elenco Fundador')
    const t = textoEscalon(a)
    expect(t).toMatch(/^Hola Ana:/)
    expect(t).toContain('Elenco Fundador nº 007')
    expect(t).toContain('4 semanas de destacado en Cartelera')
  })
})
