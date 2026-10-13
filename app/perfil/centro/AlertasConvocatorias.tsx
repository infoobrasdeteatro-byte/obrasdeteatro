'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { COUNTRIES } from '@/lib/geo/countries'
import { CATEGORIAS } from '@/components/convocatorias/vocabulario'
import { GENEROS_ALERTA } from '@/lib/alertas/formulario'
import { guardarAlertas, type EstadoGuardado } from './alertas-actions'

export type AlertaInicial = {
  activa: boolean; paises: string[]; categorias: string[]; frecuencia: string
  castings_activa: boolean; castings_paises: string[]; castings_disciplinas: string[]
  castings_edad: number | null; castings_genero: string | null; castings_solo_remunerados: boolean
}

const etiquetaGrupo = { fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '8px' }
const bloque = { border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px', margin: 0, display: 'flex', flexDirection: 'column' as const, gap: '16px' }
const tituloBloque = { fontSize: '13px', fontWeight: 700, color: 'var(--black)', fontFamily: 'var(--sans)', padding: '0 6px' }
const nota = { textTransform: 'none' as const, letterSpacing: 0, fontWeight: 400 }
const casilla = { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--sans)', cursor: 'pointer' }

/**
 * Bloque «Alertas de convocatorias y castings» del Centro Profesional. Un
 * solo correo con las dos cosas; cada una se activa por separado.
 *
 * Sin plan de pago, se ve bloqueado con un enlace a /precios (la RLS tampoco
 * dejaría guardar). Con plan, un formulario que guarda con la server action
 * guardarAlertas y la sesión del usuario.
 */
export default function AlertasConvocatorias({ puedeUsar, inicial, disciplinas }: {
  puedeUsar: boolean; inicial: AlertaInicial | null; disciplinas: { id: string; etiqueta: string }[]
}) {
  const [estado, accion, guardando] = useActionState<EstadoGuardado, FormData>(guardarAlertas, {})

  if (!puedeUsar) {
    return (
      <div style={{ padding: '16px 18px', background: 'var(--subtle)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--black)', fontFamily: 'var(--sans)', marginBottom: '4px' }}>
          🔒 Disponible a partir del plan Premium
        </p>
        <p style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '10px' }}>
          Recibe por correo las convocatorias y los castings nuevos que encajan contigo: país, categoría, disciplina, edad y género escénico.
        </p>
        <Link href="/precios" className="table-link" style={{ fontSize: '13px' }}>Ver planes →</Link>
      </div>
    )
  }

  const v: AlertaInicial = inicial ?? {
    activa: true, paises: [], categorias: [], frecuencia: 'semanal',
    castings_activa: true, castings_paises: [], castings_disciplinas: [], castings_edad: null, castings_genero: null, castings_solo_remunerados: false,
  }

  return (
    <form action={accion} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={etiquetaGrupo}>Frecuencia del correo</legend>
        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
          <label style={casilla}><input type="radio" name="frecuencia" value="diaria" defaultChecked={v.frecuencia === 'diaria'} /> Diaria</label>
          <label style={casilla}><input type="radio" name="frecuencia" value="semanal" defaultChecked={v.frecuencia !== 'diaria'} /> Semanal (los lunes)</label>
        </div>
      </fieldset>

      <fieldset style={bloque}>
      <legend style={tituloBloque}>Convocatorias</legend>
      <label style={casilla}>
        <input type="checkbox" name="activa" defaultChecked={v.activa} />
        Recibir alertas de convocatorias
      </label>

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
      </fieldset>

      <fieldset style={bloque}>
        <legend style={tituloBloque}>Castings</legend>
        <label style={casilla}>
          <input type="checkbox" name="castings_activa" defaultChecked={v.castings_activa} />
          Recibir alertas de castings
        </label>

        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={etiquetaGrupo}>Disciplinas <span style={nota}>(ninguna marcada = todas)</span></legend>
          <div style={{ display: 'flex', gap: '10px 18px', flexWrap: 'wrap' }}>
            {disciplinas.map(d => (
              <label key={d.id} style={casilla}>
                <input type="checkbox" name="castings_disciplinas" value={d.id} defaultChecked={v.castings_disciplinas.includes(d.id)} /> {d.etiqueta}
              </label>
            ))}
          </div>
        </fieldset>

        <div style={{ display: 'flex', gap: '14px 28px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label htmlFor="castings_edad" style={{ ...etiquetaGrupo, display: 'block' }}>Tu edad <span style={nota}>(opcional)</span></label>
            <input id="castings_edad" name="castings_edad" type="number" min={1} max={120} inputMode="numeric"
              className="ds-input" style={{ width: '110px' }} defaultValue={v.castings_edad ?? ''} />
          </div>
          <div>
            <label htmlFor="castings_genero" style={{ ...etiquetaGrupo, display: 'block' }}>Género escénico <span style={nota}>(opcional)</span></label>
            <select id="castings_genero" name="castings_genero" className="ds-input" style={{ width: '200px' }} defaultValue={v.castings_genero ?? ''}>
              <option value="">Cualquiera</option>
              {GENEROS_ALERTA.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--sans)', margin: '-6px 0 0' }}>
          Con edad, solo te llegan los castings cuyo rango la incluye (o que no piden edad). Los castings de género «Indistinto» te llegan siempre.
        </p>

        <label style={casilla}>
          <input type="checkbox" name="castings_solo_remunerados" defaultChecked={v.castings_solo_remunerados} />
          Solo castings remunerados
        </label>

        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={etiquetaGrupo}>Países <span style={nota}>(ninguno marcado = todos)</span></legend>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px 14px' }}>
            {COUNTRIES.map(p => (
              <label key={p.code} style={casilla}>
                <input type="checkbox" name="castings_paises" value={p.code} defaultChecked={v.castings_paises.includes(p.code)} /> {p.name}
              </label>
            ))}
          </div>
        </fieldset>
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
