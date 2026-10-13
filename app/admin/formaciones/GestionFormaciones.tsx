'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { etiquetaTipo, lugarFormacion, fechasFormacion, rutaFormacion } from '@/lib/formacion/formacion'
import { PildoraEstado } from '@/app/mis-formaciones/MisFormacionesList'

export type FormacionAdmin = {
  id: string
  slug: string
  titulo: string
  tipo: string
  modalidad: string
  ciudad: string | null
  pais_code: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  estado: string
  motivo_retirada: string | null
  created_at: string
  persona: { nombre: string; slug: string | null; email: string } | null
}

const FILTROS = [
  { value: 'publicado', label: 'Publicadas' },
  { value: 'retirado', label: 'Retiradas' },
  { value: 'todas', label: 'Todas' },
] as const

/**
 * Las formaciones se publican sin revisión previa. Moderación solo retira
 * (con motivo, que ve el autor) o restaura. Todo con la sesión del moderador:
 * lo autoriza la política «Moderación gestiona formaciones».
 */
export default function GestionFormaciones({ inicial }: { inicial: FormacionAdmin[] }) {
  const router = useRouter()
  const [lista, setLista] = useState(inicial)
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]['value']>('publicado')
  const [texto, setTexto] = useState('')
  const [retirando, setRetirando] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [error, setError] = useState('')

  const visibles = useMemo(() => {
    const t = texto.trim().toLowerCase()
    return lista.filter(f =>
      (filtro === 'todas' || f.estado === filtro) &&
      (!t || f.titulo.toLowerCase().includes(t) || (f.persona?.nombre ?? '').toLowerCase().includes(t)))
  }, [lista, filtro, texto])

  const guardar = async (f: FormacionAdmin, cambio: { estado: string; motivo_retirada: string | null }) => {
    setError('')
    setOcupado(f.id)
    const { data, error: err } = await createClient()
      .from('formaciones').update(cambio).eq('id', f.id).select('estado, motivo_retirada')
    setOcupado(null)
    if (err) { setError(err.message); return }
    if (!data || data.length === 0) { setError('No se pudo cambiar: recarga la página.'); return }
    setLista(l => l.map(x => (x.id === f.id ? { ...x, ...data[0] } : x)))
    setRetirando(null)
    setMotivo('')
    router.refresh()
  }

  return (
    <section>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
        {FILTROS.map(x => (
          <button key={x.value} type="button" onClick={() => setFiltro(x.value)}
            className={filtro === x.value ? 'ds-btn-primary' : 'ds-btn-secondary'}
            style={{ width: 'auto', padding: '7px 14px', fontSize: '12px' }}>
            {x.label} ({x.value === 'todas' ? lista.length : lista.filter(f => f.estado === x.value).length})
          </button>
        ))}
        <input className="ds-input" style={{ maxWidth: '280px', marginLeft: 'auto' }} placeholder="Buscar por título o autor"
          value={texto} onChange={e => setTexto(e.target.value)} />
      </div>

      {error && <div className="ds-alert-error" style={{ marginBottom: '14px' }}>{error}</div>}

      {visibles.length === 0 ? (
        <div className="obras-empty"><p className="obras-empty-text" style={{ marginBottom: 0 }}>No hay formaciones en esta vista.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {visibles.map(f => {
            const fechas = fechasFormacion(f)
            const enCurso = ocupado === f.id
            return (
              <article key={f.id} className="account-card">
                <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontFamily: 'var(--serif)', fontSize: '17px', color: 'var(--black)', lineHeight: 1.25 }}>{f.titulo}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                      {etiquetaTipo(f.tipo)} · {lugarFormacion(f)}{fechas && ` · ${fechas}`}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                      Publica:{' '}
                      {f.persona?.slug
                        ? <Link href={`/perfil/${f.persona.slug}`} className="table-link">{f.persona.nombre}</Link>
                        : f.persona?.nombre ?? 'Perfil desconocido'}
                      {f.persona?.email && ` · ${f.persona.email}`}
                    </p>
                    {f.estado === 'retirado' && f.motivo_retirada && (
                      <p style={{ fontSize: '12px', color: 'var(--red-h)', marginTop: '6px' }}>Motivo: {f.motivo_retirada}</p>
                    )}
                  </div>
                  <PildoraEstado estado={f.estado} />
                </header>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginTop: '12px' }}>
                  {f.estado === 'publicado' && (
                    <Link href={rutaFormacion(f.slug)} className="table-link" target="_blank">Ver ficha →</Link>
                  )}
                  {f.estado !== 'retirado' && retirando !== f.id && (
                    <button type="button" className="table-link table-link--danger" style={{ marginLeft: 'auto' }}
                      onClick={() => { setRetirando(f.id); setMotivo('') }}>
                      Retirar
                    </button>
                  )}
                  {f.estado === 'retirado' && (
                    <button type="button" className="ds-btn-secondary" disabled={enCurso}
                      style={{ padding: '7px 14px', fontSize: '12px', marginLeft: 'auto' }}
                      onClick={() => guardar(f, { estado: 'publicado', motivo_retirada: null })}>
                      {enCurso ? '…' : 'Restaurar y publicar'}
                    </button>
                  )}
                </div>

                {retirando === f.id && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    <label className="ds-label" htmlFor={`motivo-${f.id}`}>Motivo de la retirada (lo verá quien la publicó)</label>
                    <textarea id={`motivo-${f.id}`} className="ds-input" rows={2} maxLength={500}
                      value={motivo} onChange={e => setMotivo(e.target.value)}
                      placeholder="Ej.: no es una formación de artes escénicas" />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button type="button" className="ds-btn-primary" disabled={enCurso || motivo.trim().length < 3}
                        style={{ width: 'auto', padding: '8px 16px', fontSize: '12px' }}
                        onClick={() => guardar(f, { estado: 'retirado', motivo_retirada: motivo.trim() })}>
                        {enCurso ? 'Retirando…' : 'Confirmar retirada'}
                      </button>
                      <button type="button" className="table-link" onClick={() => setRetirando(null)}>Cancelar</button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
