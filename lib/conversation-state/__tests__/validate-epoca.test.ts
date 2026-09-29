import { describe, it, expect } from 'vitest'
import { parseConversationState } from '../index'

/**
 * SCENAIA-007 §6.4: el estado heredado se valida contra las ranuras
 * vigentes según el interruptor de época, que la ruta pasa como dato. Una
 * pareja incompatible invalida el estado COMPLETO (contrato "validación
 * total o descarte total"), nunca solo esa pareja.
 */
const ON = { epocaHabilitada: true } as const
const OFF = { epocaHabilitada: false } as const

function estado(slots: Record<string, string>) {
  return { conversationId: 'conv-epoca', activeDomain: 'Obras', occupancyByDomain: [{ domain: 'Obras', slots }] }
}

describe('parseConversationState — ranuras según el interruptor de época', () => {
  it('estado heredado {genero: CLASICO} con el interruptor encendido → null', () => {
    expect(parseConversationState(estado({ genero: 'CLASICO' }), ON)).toBeNull()
  })

  it('estado heredado {epoca: CLASICO} con el interruptor apagado → null (con opción o sin ella)', () => {
    expect(parseConversationState(estado({ epoca: 'CLASICO' }), OFF)).toBeNull()
    expect(parseConversationState(estado({ epoca: 'CLASICO' }))).toBeNull()
  })

  it('invalida el estado ENTERO, no solo la pareja: las demás ranuras válidas no sobreviven', () => {
    expect(parseConversationState(estado({ genero: 'CLASICO', duracion: 'CORTA', reparto: 'POCOS_ACTORES' }), ON)).toBeNull()
    expect(parseConversationState(estado({ epoca: 'BARROCO', genero: 'COMEDIA' }), OFF)).toBeNull()
  })

  it('una época nueva solo es válida con el interruptor encendido, y solo en la ranura epoca', () => {
    expect(parseConversationState(estado({ epoca: 'SIGLO_DE_ORO' }), ON)).toEqual(estado({ epoca: 'SIGLO_DE_ORO' }))
    expect(parseConversationState(estado({ epoca: 'SIGLO_DE_ORO' }), OFF)).toBeNull()
    expect(parseConversationState(estado({ epoca: 'SIGLO_DE_ORO' }))).toBeNull()
    expect(parseConversationState(estado({ genero: 'BARROCO' }), ON)).toBeNull()
  })

  it('las parejas coherentes con cada modo se aceptan tal cual', () => {
    const encendido = estado({ genero: 'COMEDIA', epoca: 'CLASICO', duracion: 'CORTA' })
    expect(parseConversationState(encendido, ON)).toEqual(encendido)

    const apagado = estado({ genero: 'CLASICO', epoca: 'CONTEMPORANEO', duracion: 'CORTA' })
    expect(parseConversationState(apagado, OFF)).toEqual(apagado)
    expect(parseConversationState(apagado)).toEqual(apagado)
  })

  it('una pareja que nunca fue coherente (p. ej. {epoca: COMEDIA}) se rechaza en los dos modos', () => {
    expect(parseConversationState(estado({ epoca: 'COMEDIA' }), ON)).toBeNull()
    expect(parseConversationState(estado({ epoca: 'COMEDIA' }))).toBeNull()
  })
})
