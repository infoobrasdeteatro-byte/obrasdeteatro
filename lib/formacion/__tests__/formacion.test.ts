import { describe, expect, it } from 'vitest'
import {
  CAMPOS_VACIOS, validarFormacion, aFilaFormacion, camposDesdeFila,
  lugarFormacion, precioFormacion, fechasFormacion, enlaceInscripcion, mensajeErrorFormacion,
} from '../formacion'
import { permisoFormacion } from '../permisos'

const base = { ...CAMPOS_VACIOS, titulo: 'Taller de clown', pais_code: 'ES', ciudad: 'Madrid', url_inscripcion: 'https://ejemplo.org/inscripcion' }

describe('permisoFormacion', () => {
  it('organizaciones con cualquier plan', () => {
    expect(permisoFormacion('escuela', 'gratuito')).toBe('puede')
    expect(permisoFormacion('compania', null)).toBe('puede')
  })
  it('profesionales necesitan plan de pago', () => {
    expect(permisoFormacion('actor', 'gratuito')).toBe('necesita_plan')
    expect(permisoFormacion('director', 'premium')).toBe('puede')
    expect(permisoFormacion('dramaturgo', 'empresas')).toBe('puede')
  })
  it('público no publica', () => {
    expect(permisoFormacion('publico', 'premium')).toBe('no_puede')
    expect(permisoFormacion(null, null)).toBe('no_puede')
  })
})

describe('validarFormacion', () => {
  it('acepta una formación completa', () => {
    expect(validarFormacion(base, true)).toBeNull()
  })
  it('presencial exige país y ciudad; en línea no', () => {
    expect(validarFormacion({ ...base, ciudad: '' }, false)).toMatch(/ciudad/)
    expect(validarFormacion({ ...base, modalidad: 'online', pais_code: '', ciudad: '' }, false)).toBeNull()
  })
  it('publicar exige vía de inscripción; el borrador no', () => {
    const sin = { ...base, url_inscripcion: '' }
    expect(validarFormacion(sin, false)).toBeNull()
    expect(validarFormacion(sin, true)).toMatch(/inscripción/)
    expect(validarFormacion({ ...sin, email_inscripcion: 'hola@escuela.es' }, true)).toBeNull()
  })
  it('rechaza fechas al revés, plazas y enlaces raros', () => {
    expect(validarFormacion({ ...base, fecha_inicio: '2026-11-10', fecha_fin: '2026-11-01' }, false)).toMatch(/fecha/)
    expect(validarFormacion({ ...base, plazas: '0' }, false)).toMatch(/plazas/)
    expect(validarFormacion({ ...base, url_inscripcion: 'javascript:alert(1)' }, false)).toMatch(/https/)
  })
})

describe('aFilaFormacion / camposDesdeFila', () => {
  it('gratuita no lleva precio ni moneda; precio con coma', () => {
    expect(aFilaFormacion({ ...base, es_gratuita: true, precio: '50' })).toMatchObject({ precio: null, moneda: null })
    expect(aFilaFormacion({ ...base, precio: '45,50', moneda: 'ARS' })).toMatchObject({ precio: 45.5, moneda: 'ARS' })
  })
  it('en línea descarta el lugar físico', () => {
    expect(aFilaFormacion({ ...base, modalidad: 'online', lugar: 'Sala 2' }).lugar).toBeNull()
  })
  it('ida y vuelta', () => {
    const fila = aFilaFormacion({ ...base, plazas: '12', precio: '100' })
    const campos = camposDesdeFila(fila)
    expect(campos.plazas).toBe('12')
    expect(campos.precio).toBe('100')
    expect(campos.titulo).toBe('Taller de clown')
  })
})

describe('presentación', () => {
  it('lugar según modalidad', () => {
    expect(lugarFormacion({ modalidad: 'presencial', ciudad: 'Madrid', pais_code: 'ES' })).toBe('Madrid, España')
    expect(lugarFormacion({ modalidad: 'online', ciudad: null, pais_code: null })).toBe('En línea')
  })
  it('precio', () => {
    expect(precioFormacion({ es_gratuita: true, precio: null, moneda: null })).toBe('Gratuita')
    expect(precioFormacion({ es_gratuita: false, precio: null, moneda: null })).toBeNull()
    expect(precioFormacion({ es_gratuita: false, precio: 120, moneda: 'EUR' })).toMatch(/120/)
  })
  it('fechas', () => {
    expect(fechasFormacion({ fecha_inicio: null, fecha_fin: null })).toBeNull()
    expect(fechasFormacion({ fecha_inicio: '2026-11-12', fecha_fin: '2026-11-12' })).toMatch(/12 nov/)
    expect(fechasFormacion({ fecha_inicio: '2026-11-12', fecha_fin: '2027-01-30' })).toMatch(/–/)
  })
  it('enlace de inscripción solo http(s) o correo', () => {
    expect(enlaceInscripcion({ url_inscripcion: 'https://a.org', email_inscripcion: null })).toBe('https://a.org')
    expect(enlaceInscripcion({ url_inscripcion: null, email_inscripcion: 'a@b.es' })).toBe('mailto:a@b.es')
    expect(enlaceInscripcion({ url_inscripcion: 'javascript:x', email_inscripcion: null })).toBeNull()
  })
  it('mensajes de error de la base', () => {
    expect(mensajeErrorFormacion('new row violates row-level security policy')).toMatch(/Premium/)
    expect(mensajeErrorFormacion('Para publicar formaciones necesitas …')).toMatch(/^Para publicar/)
  })
})
