'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/geo/countries'
import {
  TIPOS, DISCIPLINAS, NIVELES, MODALIDADES, MONEDAS, CAMPOS_VACIOS,
  validarFormacion, aFilaFormacion, mensajeErrorFormacion, type CamposFormacion,
} from '@/lib/formacion/formacion'

/**
 * Formulario de formación, compartido por alta y edición.
 *
 * Se publica SIN revisión previa (decisión de Dirección): «Publicar» guarda
 * con estado «publicado» y la base decide si el perfil puede hacerlo
 * (puede_publicar_formaciones en la política y en el trigger). Aquí solo se
 * valida lo que el usuario puede corregir antes de enviar.
 */
export default function FormacionForm({
  profileId,
  inicial,
  formacion,
}: {
  profileId: string
  inicial?: CamposFormacion
  formacion?: { id: string; estado: string; slug: string }
}) {
  const router = useRouter()
  const editando = Boolean(formacion)
  const [c, setC] = useState<CamposFormacion>(inicial ?? CAMPOS_VACIOS)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const set = <K extends keyof CamposFormacion>(k: K, v: CamposFormacion[K]) => setC(p => ({ ...p, [k]: v }))
  const online = c.modalidad === 'online'
  const publicada = formacion?.estado === 'publicado'

  const guardar = async (publicar: boolean) => {
    setError(''); setExito('')
    const problema = validarFormacion(c, publicar || publicada)
    if (problema) { setError(problema); return }

    setGuardando(true)
    const supabase = createClient()
    const fila = aFilaFormacion(c)

    if (!editando) {
      const { data, error: e } = await supabase
        .from('formaciones')
        .insert({ ...fila, profile_id: profileId, estado: publicar ? 'publicado' : 'borrador' })
        .select('id, estado')
        .single()
      setGuardando(false)
      if (e || !data) { setError(mensajeErrorFormacion(e?.message)); return }
      router.push(`/mis-formaciones?resultado=${data.estado === 'publicado' ? 'publicada' : 'borrador'}`)
      return
    }

    const datos = publicar ? { ...fila, estado: 'publicado' } : fila
    const { data, error: e } = await supabase
      .from('formaciones')
      .update(datos)
      .eq('id', formacion!.id)
      .select('estado, slug')
      .single()
    setGuardando(false)
    if (e || !data) { setError(mensajeErrorFormacion(e?.message)); return }
    setExito(data.estado === 'publicado'
      ? (publicar ? 'Publicada. Tu formación ya es visible en la web.' : 'Cambios guardados. Ya se ven en la ficha pública.')
      : 'Cambios guardados.')
    router.refresh()
  }

  const puedePublicar = !editando || formacion!.estado === 'borrador' || formacion!.estado === 'cancelado'

  return (
    <form className="account-card" onSubmit={e => e.preventDefault()}
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      <Seccion titulo="La formación" />

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="titulo">Título *</label>
        <input id="titulo" className="ds-input" required maxLength={160}
          value={c.titulo} onChange={e => set('titulo', e.target.value)}
          placeholder="Taller intensivo de clown" />
      </div>

      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="tipo">Tipo *</label>
          <select id="tipo" className="ds-select" value={c.tipo} onChange={e => set('tipo', e.target.value)}>
            {TIPOS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="disciplina">Disciplina *</label>
          <select id="disciplina" className="ds-select" value={c.disciplina} onChange={e => set('disciplina', e.target.value)}>
            {DISCIPLINAS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="nivel">Nivel</label>
          <select id="nivel" className="ds-select" value={c.nivel} onChange={e => set('nivel', e.target.value)}>
            <option value="">Sin indicar</option>
            {NIVELES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="imparte">Imparte</label>
          <input id="imparte" className="ds-input" maxLength={300}
            value={c.imparte} onChange={e => set('imparte', e.target.value)}
            placeholder="Nombre de la profesora o del equipo docente" />
        </div>
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="descripcion">Descripción</label>
        <textarea id="descripcion" className="ds-textarea" rows={7} maxLength={5000}
          value={c.descripcion} onChange={e => set('descripcion', e.target.value)}
          placeholder="Qué se trabaja, a quién va dirigida, metodología y qué se lleva el alumnado." />
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="requisitos">Requisitos</label>
        <textarea id="requisitos" className="ds-textarea" rows={3} maxLength={1000}
          value={c.requisitos} onChange={e => set('requisitos', e.target.value)}
          placeholder="Experiencia previa, edad mínima, material, prueba de acceso…" />
      </div>

      <Seccion titulo="Dónde y cuándo" />

      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="modalidad">Modalidad *</label>
          <select id="modalidad" className="ds-select" value={c.modalidad} onChange={e => set('modalidad', e.target.value)}>
            {MODALIDADES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="pais_code">País {online ? '' : '*'}</label>
          <select id="pais_code" className="ds-select" value={c.pais_code} onChange={e => set('pais_code', e.target.value)}>
            <option value="">{online ? 'Sin indicar' : 'Elige un país'}</option>
            {COUNTRIES.map(x => <option key={x.code} value={x.code}>{x.name}</option>)}
          </select>
          {online && <p className="ds-form-hint">En línea: indica el país solo si va dirigida a un país concreto.</p>}
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="ciudad">Ciudad {online ? '' : '*'}</label>
          <input id="ciudad" className="ds-input" maxLength={120}
            value={c.ciudad} onChange={e => set('ciudad', e.target.value)} placeholder="Madrid" />
        </div>
        {!online && (
          <div className="ds-form-group">
            <label className="ds-label" htmlFor="lugar">Lugar</label>
            <input id="lugar" className="ds-input" maxLength={200}
              value={c.lugar} onChange={e => set('lugar', e.target.value)}
              placeholder="Sala, escuela o dirección" />
          </div>
        )}
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="fecha_inicio">Fecha de inicio</label>
          <input id="fecha_inicio" type="date" className="ds-input"
            value={c.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} />
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="fecha_fin">Fecha de fin</label>
          <input id="fecha_fin" type="date" className="ds-input"
            value={c.fecha_fin} onChange={e => set('fecha_fin', e.target.value)} />
          <p className="ds-form-hint">Al día siguiente de esta fecha la formación pasa sola a «Finalizada».</p>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="horario">Horario</label>
          <input id="horario" className="ds-input" maxLength={200}
            value={c.horario} onChange={e => set('horario', e.target.value)}
            placeholder="Martes y jueves, de 18:00 a 21:00" />
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="duracion">Duración</label>
          <input id="duracion" className="ds-input" maxLength={100}
            value={c.duracion} onChange={e => set('duracion', e.target.value)} placeholder="20 horas" />
        </div>
      </div>

      <Seccion titulo="Precio e inscripción" />

      <div className="ds-form-group">
        <label htmlFor="es_gratuita" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
          <input type="checkbox" id="es_gratuita" checked={c.es_gratuita}
            onChange={e => set('es_gratuita', e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: 'var(--black)' }} />
          Formación gratuita
        </label>
      </div>

      <div className="ds-form-grid">
        {!c.es_gratuita && (
          <>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="precio">Precio</label>
              <input id="precio" className="ds-input" inputMode="decimal"
                value={c.precio} onChange={e => set('precio', e.target.value)} placeholder="120" />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="moneda">Moneda</label>
              <select id="moneda" className="ds-select" value={c.moneda} onChange={e => set('moneda', e.target.value)}>
                {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </>
        )}
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="plazas">Plazas</label>
          <input id="plazas" className="ds-input" inputMode="numeric"
            value={c.plazas} onChange={e => set('plazas', e.target.value)} placeholder="15" />
        </div>
      </div>

      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="url_inscripcion">Enlace de inscripción</label>
          <input id="url_inscripcion" className="ds-input" type="url" maxLength={500}
            value={c.url_inscripcion} onChange={e => set('url_inscripcion', e.target.value)}
            placeholder="https://tuescuela.com/inscripcion" />
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="email_inscripcion">Correo de inscripción</label>
          <input id="email_inscripcion" className="ds-input" type="email" maxLength={254}
            value={c.email_inscripcion} onChange={e => set('email_inscripcion', e.target.value)}
            placeholder="inscripciones@tuescuela.com" />
        </div>
      </div>
      <p className="ds-form-hint" style={{ marginTop: '-8px' }}>
        Para publicar hace falta al menos uno de los dos. La inscripción y el pago los gestionas tú:
        ObrasDeTeatro solo enlaza.
      </p>

      {error && <div className="ds-alert-error">{error}</div>}
      {exito && <div className="ds-alert-success">{exito}</div>}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
        <button type="button" className="ds-btn-secondary" disabled={guardando}
          style={{ padding: '11px 22px', fontSize: '13px' }} onClick={() => guardar(false)}>
          {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar borrador'}
        </button>
        {puedePublicar && (
          <button type="button" className="ds-btn-primary" disabled={guardando}
            style={{ width: 'auto', padding: '11px 24px', fontSize: '13px' }} onClick={() => guardar(true)}>
            {guardando ? 'Publicando…' : 'Publicar formación'}
          </button>
        )}
        {publicada && (
          <Link href={`/formacion/${formacion!.slug}`} className="table-link">Ver ficha pública</Link>
        )}
        <Link href="/mis-formaciones" className="table-link" style={{ marginLeft: 'auto' }}>Volver a mis formaciones</Link>
      </div>

      {puedePublicar && (
        <p className="ds-form-hint">
          «Publicar formación» la hace visible al momento en la sección Formación. El equipo de
          ObrasDeTeatro puede retirar las que no cumplan las normas de la comunidad.
        </p>
      )}
    </form>
  )
}

function Seccion({ titulo }: { titulo: string }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginTop: '8px' }}>
      <span className="obras-stat-label">{titulo}</span>
    </div>
  )
}
