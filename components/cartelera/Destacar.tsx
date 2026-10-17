'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { mensajeErrorCartelera } from '@/lib/cartelera/cartelera'
import { sumarDias } from '@/lib/cartelera/listado'
import { destacadosDe, diaCorto, diaSugerido, semanasUsadas, type Destacado } from '@/lib/cartelera/destacados'

const nombreMes = (dia: string) =>
  new Intl.DateTimeFormat('es-ES', { month: 'long', timeZone: 'UTC' }).format(new Date(`${dia}T12:00:00Z`))

/**
 * «Destacar» en Mis espectáculos: elige la semana (7 días desde el día
 * elegido) y gasta una del cupo mensual del plan. La base lo vuelve a
 * comprobar todo; aquí solo se enseña y se avisa antes.
 */
export default function Destacar({ espectaculoId, cupo, destacados, hoy, proximaDia, conFunciones }: {
  espectaculoId: string
  /** Semanas al mes del plan (0 = no incluye). */
  cupo: number
  /** Todos los destacados de la cuenta (para contar el cupo). */
  destacados: Destacado[]
  hoy: string
  proximaDia: string | null
  conFunciones: boolean
}) {
  const router = useRouter()
  const maxDia = sumarDias(hoy, 60)
  const [abierto, setAbierto] = useState(false)
  const [desde, setDesde] = useState(() => diaSugerido(proximaDia, hoy, maxDia))
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { enCurso, proximos } = destacadosDe(destacados, espectaculoId, hoy)

  const mes = desde.slice(0, 7)
  const quedan = Math.max(cupo - semanasUsadas(destacados, mes), 0)

  const confirmar = async () => {
    setOcupado(true); setError(null)
    const { error: e } = await createClient().rpc('cartelera_destacar', { p_espectaculo: espectaculoId, p_desde: desde })
    setOcupado(false)
    if (e) { setError(mensajeErrorCartelera(e.message)); return }
    setAbierto(false)
    router.refresh()
  }
  const quitar = async (id: string) => {
    if (!confirm('¿Quitar esta semana de destacado? Vuelve a tu cupo del mes.')) return
    const { error: e } = await createClient().rpc('cartelera_quitar_destacado', { p_id: id })
    if (e) { setError(mensajeErrorCartelera(e.message)); return }
    router.refresh()
  }

  return (
    <div className="dest">
      {(enCurso || proximos.length > 0) && (
        <ul className="dest-lista">
          {enCurso && <li><span className="dest-pill dest-pill--on">★ Destacado hasta el {diaCorto(enCurso.hasta)}</span></li>}
          {proximos.map(d => (
            <li key={d.id}>
              <span className="dest-pill">★ Destacado del {diaCorto(d.desde)} al {diaCorto(d.hasta)}</span>
              {d.origen === 'plan' && <button type="button" className="table-link table-link--danger" onClick={() => quitar(d.id)}>Quitar</button>}
            </li>
          ))}
        </ul>
      )}

      {cupo === 0 ? (
        <p className="ds-form-hint" style={{ margin: 0 }}>
          ★ Con el plan Premium puedes destacar tu espectáculo una semana al mes en la cartelera y en la portada.{' '}
          <Link href="/precios" className="table-link">Ver planes</Link>
        </p>
      ) : !abierto ? (
        <button type="button" className="ds-btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}
          disabled={!conFunciones} title={conFunciones ? undefined : 'Necesita funciones próximas'}
          onClick={() => { setAbierto(true); setError(null) }}>
          ★ Destacar una semana
        </button>
      ) : (
        <div className="dest-panel">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label className="ds-label" htmlFor={`dest-${espectaculoId}`}>Primer día de la semana</label>
              <input id={`dest-${espectaculoId}`} type="date" className="ds-input" value={desde} min={hoy} max={maxDia}
                onChange={e => setDesde(e.target.value || hoy)} />
            </div>
            <button type="button" className="ds-btn-primary" style={{ width: 'auto', padding: '10px 18px', fontSize: '13px' }}
              disabled={ocupado || quedan === 0} onClick={confirmar}>
              {ocupado ? 'Destacando…' : 'Destacar'}
            </button>
            <button type="button" className="table-link" onClick={() => setAbierto(false)}>Cancelar</button>
          </div>
          <p className="ds-form-hint" style={{ marginTop: '8px' }}>
            Saldrá destacado del {diaCorto(desde)} al {diaCorto(sumarDias(desde, 6))}, primero en la cartelera de su ciudad y en la portada.{' '}
            {quedan > 0
              ? <>Te {quedan === 1 ? 'queda' : 'quedan'} <strong>{quedan} de {cupo}</strong> semana{cupo === 1 ? '' : 's'} en {nombreMes(desde)}.</>
              : <strong>Ya has usado tu{cupo === 1 ? '' : 's'} semana{cupo === 1 ? '' : 's'} de {nombreMes(desde)}: elige un día de otro mes.</strong>}
          </p>
        </div>
      )}
      {error && <div className="ds-alert-error" style={{ marginTop: '8px' }}>{error}</div>}
    </div>
  )
}
