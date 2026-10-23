import { describe, expect, it } from 'vitest'
import { motivoEscribir, textoErrorEnvio, textoNoPuede } from '../mensajes'

describe('mensajes', () => {
  it('motivo desconocido = no disponible', () => {
    expect(motivoEscribir('si')).toBe('si')
    expect(motivoEscribir('bloqueado')).toBe('bloqueado')
    expect(motivoEscribir('raro')).toBe('no_disponible')
    expect(motivoEscribir(null)).toBe('no_disponible')
  })
  it('textos para quien no puede escribir', () => {
    expect(textoNoPuede('si', 'Ana')).toBeNull()
    expect(textoNoPuede('plan', 'Ana')).toContain('plan de pago')
    expect(textoNoPuede('solo_contactos', 'Ana')).toBe('Ana solo recibe mensajes de sus contactos. Conecta primero para poder escribirle.')
    expect(textoNoPuede('bloqueado', 'Ana')).toContain('Has bloqueado a Ana')
  })
  it('errores de envío', () => {
    expect(textoErrorEnvio('limite')).toContain('muchos mensajes')
    expect(textoErrorEnvio('x')).toContain('No se pudo enviar')
  })
})
