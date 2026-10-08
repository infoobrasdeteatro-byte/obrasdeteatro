'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { COUNTRIES } from '@/lib/geo/countries'
import { CATEGORIAS } from '@/components/convocatorias/vocabulario'
import { guardarAlertas, type EstadoGuardado } from './alertas-actions'

export type AlertaInicial = { activa: boolean; paises: string[]; categorias: string[]; frecuencia: string }

const etiquetaGrupo = { fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '8px' }
const casilla = { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--sans)', cursor: 'pointer' }

/**
 * Bloque «Alertas de convocatorias» del Centro Profesional.
 *
 * Sin plan de pago, se ve bloqueado con un enlace a /precios (la RLS tampoco
 * dejaría guardar). Con plan, un formulario que guarda con la server action
 * guardarAlertas y la sesión del usuario.
 */
export default function AlertasConvocatorias({ puedeUsar, inicial }: { puedeUsar: boolean; inicial: AlertaInicial | null }) {
  const [estado, accion, guardando] = useActionState<EstadoGuardado, FormData>(guardarAlertas, {})

  if (!puedeUsar) {
    return (
      <div style={{ padding: '16px 18px', background: 'var(--subtle)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--black)', fontFamily: 'var(--sans)', marginBottom: '4px' }}>
          🔒 Disponible a partir del plan Premium
        </p>
        <p style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '10px' }}>
          Recibe por correo las convocatorias nuevas de los países y categorías que te interesan.
        </p>
        <Link href="/precios" className="table-link" style={{ fontSize: '13px' }}>Ver planes →</Link>
      </div>
    )
  }

  const v = inicial ?? { activa: true, paises: [], categorias: [], frecuencia: 'semanal' }

  return (
    <form action={accion} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <label style={casilla}>
        <input type="checkbox" name="activa" defaultChecked={v.activa} />
        Recibir alertas por correo
      </label>

      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={etiquetaGrupo}>Frecuencia</legend>
        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
          <label style={casilla}><input type="radio" name="frecuencia" value="diaria" defaultChecked={v.frecuencia === 'diaria'} /> Diaria</label>
          <label style={casilla}><input type="radio" name="frecuencia" value="semanal" defaultChecked={v.frecuencia !== 'diaria'} /> Semanal (los lunes)</label>
        </div>
      </fieldset>

      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={etiquetaGrupo}>Categorías <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(ninguna marcada = todas)</span></legend>
        <div style={{ display: 'flex', gap: '10px 18px', flexWrap: 'wrap' }}>
          {CATEGORIAS.map(c => (
            <label key={c.value} style={casilla}>
              <input type="checkbox" name="categorias" value={c.value} defaultChecked={v.categorias.includes(c.value)} /> {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={etiquetaGrupo}>Países <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(ninguno marcado = todos)</span></legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px 14px' }}>
          {COUNTRIES.map(p => (
            <label key={p.code} style={casilla}>
              <input type="checkbox" name="paises" value={p.code} defaultChecked={v.paises.includes(p.code)} /> {p.name}
            </label>
          ))}
        </div>
      </fieldset>

      {estado.error && <div className="ds-alert-error">{estado.error}</div>}
      {estado.ok && <div className="ds-alert-success">{estado.ok}</div>}

      <div>
        <button type="submit" className="ds-btn-primary" disabled={guardando}
          style={{ width: 'auto', padding: '9px 20px', fontSize: '13px' }}>
          {guardando ? 'Guardando…' : 'Guardar alertas'}
        </button>
      </div>
    </form>
  )
}
