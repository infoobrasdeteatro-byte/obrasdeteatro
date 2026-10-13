'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/geo/countries'
import { PROGRAMA_VACIO, filaPrograma, validarPrograma, type CamposPrograma } from '@/lib/mediateca/programa-form'
import { rutaEpisodio, rutaPrograma, fechaEpisodio } from '@/lib/mediateca/mediateca'
import { importarAhora } from './acciones'

export type ProgramaAdmin = {
  id: string
  slug: string
  nombre: string
  descripcion: string | null
  pais_code: string | null
  url_web: string | null
  imagen_url: string | null
  colaborador_id: string | null
  youtube_channel_id: string | null
  rss_url: string | null
  spotify_url: string | null
  activo: boolean
  orden: number
  ultima_importacion_at: string | null
  ultimo_error: string | null
}

export type EpisodioAdmin = {
  id: string
  slug: string
  titulo: string
  fecha_publicacion: string
  estado: string
  motivo_retirada: string | null
  programa_id: string
  youtube_video_id: string | null
  audio_url: string | null
}

const camposDe = (p: ProgramaAdmin): CamposPrograma => ({
  nombre: p.nombre, descripcion: p.descripcion ?? '', pais_code: p.pais_code ?? '', url_web: p.url_web ?? '',
  imagen_url: p.imagen_url ?? '', colaborador_id: p.colaborador_id ?? '', youtube: p.youtube_channel_id ?? '',
  rss_url: p.rss_url ?? '', spotify_url: p.spotify_url ?? '',
})

/**
 * Programas (alta, edición, activar, importar ahora) y episodios (retirar /
 * restaurar). Con la sesión del moderador; «Importar ahora» va por una
 * acción de servidor que comprueba el rol antes de usar la clave de servicio.
 */
export default function GestionMediateca({ programas, episodios, colaboradores }: {
  programas: ProgramaAdmin[]
  episodios: EpisodioAdmin[]
  colaboradores: { id: string; nombre: string }[]
}) {
  const router = useRouter()
  const [editando, setEditando] = useState<string | 'nuevo' | null>(null)
  const [campos, setCampos] = useState<CamposPrograma>(PROGRAMA_VACIO)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [filtro, setFiltro] = useState('')
  const [retirando, setRetirando] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')

  const programaDe = Object.fromEntries(programas.map(p => [p.id, p]))
  const set = (k: keyof CamposPrograma) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setCampos(c => ({ ...c, [k]: ev.target.value }))

  const abrir = (p: ProgramaAdmin | null) => {
    setAviso(null)
    setEditando(p ? p.id : 'nuevo')
    setCampos(p ? camposDe(p) : PROGRAMA_VACIO)
  }

  const guardar = async () => {
    const fallo = validarPrograma(campos)
    if (fallo) { setAviso({ tipo: 'error', texto: fallo }); return }
    setOcupado('form')
    const supabase = createClient()
    const fila = filaPrograma(campos)
    const { error } = editando === 'nuevo'
      ? await supabase.from('mediateca_programas').insert({ ...fila, orden: (programas.length + 1) * 10 })
      : await supabase.from('mediateca_programas').update(fila).eq('id', editando!)
    setOcupado(null)
    if (error) { setAviso({ tipo: 'error', texto: error.message }); return }
    setAviso({ tipo: 'ok', texto: `«${fila.nombre}» guardado. Pulsa «Importar ahora» para traer sus episodios y «Activar» para publicarlo.` })
    setEditando(null)
    router.refresh()
  }

  const activar = async (p: ProgramaAdmin) => {
    setOcupado(p.id)
    const { error } = await createClient().from('mediateca_programas').update({ activo: !p.activo }).eq('id', p.id)
    setOcupado(null)
    setAviso(error ? { tipo: 'error', texto: error.message } : { tipo: 'ok', texto: `«${p.nombre}» ${p.activo ? 'desactivado' : 'activado: ya se ve en la Mediateca'}.` })
    router.refresh()
  }

  const importar = async (p: ProgramaAdmin) => {
    setOcupado(p.id)
    setAviso(null)
    const r = await importarAhora(p.id)
    setOcupado(null)
    if ('programa' in r) {
      setAviso({
        tipo: r.error ? 'error' : 'ok',
        texto: `${r.programa}: ${r.nuevos} episodios nuevos, ${r.actualizados} completados.${r.error ? ` Avisos: ${r.error}` : ''}`,
      })
    } else {
      setAviso({ tipo: 'error', texto: r.error })
    }
    router.refresh()
  }

  const cambiarEpisodio = async (e: EpisodioAdmin, estado: 'publicado' | 'retirado') => {
    setOcupado(e.id)
    const { error } = await createClient().from('mediateca_episodios')
      .update({ estado, motivo_retirada: estado === 'retirado' ? motivo.trim() : null }).eq('id', e.id)
    setOcupado(null)
    if (error) { setAviso({ tipo: 'error', texto: error.message }); return }
    setRetirando(null)
    setMotivo('')
    router.refresh()
  }

  const visibles = episodios.filter(e => !filtro || e.programa_id === filtro)

  return (
    <>
      {aviso && <div className={aviso.tipo === 'ok' ? 'ds-alert-success' : 'ds-alert-error'} style={{ marginBottom: '16px' }}>{aviso.texto}</div>}

      <section style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)' }}>Programas</h2>
          <button type="button" className="ds-btn-primary" style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }} onClick={() => abrir(null)}>
            Nuevo programa
          </button>
        </div>

        {editando && (
          <div className="account-card" style={{ marginBottom: '16px' }}>
            <div className="ds-form-grid">
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="m-nombre">Nombre *</label>
                <input id="m-nombre" className="ds-input" value={campos.nombre} onChange={set('nombre')} maxLength={120} />
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="m-pais">País</label>
                <select id="m-pais" className="ds-select" value={campos.pais_code} onChange={set('pais_code')}>
                  <option value="">Sin país</option>
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="m-youtube">Canal de YouTube (ID que empieza por UC)</label>
                <input id="m-youtube" className="ds-input" value={campos.youtube} onChange={set('youtube')} placeholder="UC9BFlzXJ2JIj4RB1D1vtVCQ" />
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="m-rss">RSS del podcast (iVoox, Spotify for Creators…)</label>
                <input id="m-rss" className="ds-input" value={campos.rss_url} onChange={set('rss_url')} placeholder="https://www.ivoox.com/feed_fg_…_filtro_1.xml" />
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="m-spotify">Spotify (enlace del programa)</label>
                <input id="m-spotify" className="ds-input" value={campos.spotify_url} onChange={set('spotify_url')} placeholder="https://open.spotify.com/show/…" />
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="m-web">Web</label>
                <input id="m-web" className="ds-input" value={campos.url_web} onChange={set('url_web')} placeholder="https://" />
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="m-imagen">Imagen (si se deja vacía, se toma la portada del podcast)</label>
                <input id="m-imagen" className="ds-input" value={campos.imagen_url} onChange={set('imagen_url')} placeholder="https://" />
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="m-colab">Colaborador vinculado</label>
                <select id="m-colab" className="ds-select" value={campos.colaborador_id} onChange={set('colaborador_id')}>
                  <option value="">Ninguno</option>
                  {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="m-desc">Descripción</label>
              <textarea id="m-desc" className="ds-input" rows={3} maxLength={600} value={campos.descripcion} onChange={set('descripcion')} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="ds-btn-primary" disabled={ocupado === 'form'} style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }} onClick={guardar}>
                {ocupado === 'form' ? 'Guardando…' : 'Guardar'}
              </button>
              <button type="button" className="ds-btn-secondary" style={{ padding: '9px 18px', fontSize: '13px' }} onClick={() => setEditando(null)}>Cancelar</button>
            </div>
            <p className="ds-form-hint" style={{ marginTop: '8px' }}>Guardar no publica: el programa se ve en la web al pulsar «Activar».</p>
          </div>
        )}

        {programas.length === 0 ? (
          <div className="obras-empty"><p className="obras-empty-text" style={{ marginBottom: 0 }}>Todavía no hay programas.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {programas.map(p => (
              <article key={p.id} className="account-card" style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.imagen_url && <img src={p.imagen_url} alt="" style={{ width: '52px', height: '52px', borderRadius: 'var(--radius)', objectFit: 'cover' }} />}
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--black)' }}>{p.nombre}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {[p.youtube_channel_id && 'YouTube', p.rss_url && 'Podcast', p.spotify_url && 'Spotify'].filter(Boolean).join(' · ')}
                    {' · '}{p.ultima_importacion_at ? `Última importación: ${new Date(p.ultima_importacion_at).toLocaleString('es-ES', { timeZone: 'Atlantic/Canary' })}` : 'Sin importar todavía'}
                  </div>
                  {p.ultimo_error && <div style={{ fontSize: '12px', color: 'var(--red-h)', marginTop: '4px' }}>{p.ultimo_error}</div>}
                </div>
                <span className="status-pill" style={p.activo ? undefined : { background: 'var(--subtle)', color: 'var(--muted)' }}>
                  {p.activo ? 'Activo' : 'Inactivo'}
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="button" className="ds-btn-secondary" disabled={ocupado === p.id} style={{ padding: '7px 12px', fontSize: '13px' }} onClick={() => importar(p)}>
                    {ocupado === p.id ? 'Importando…' : 'Importar ahora'}
                  </button>
                  <button type="button" className="ds-btn-secondary" style={{ padding: '7px 12px', fontSize: '13px' }} onClick={() => abrir(p)}>Editar</button>
                  <button type="button" className={p.activo ? 'ds-btn-secondary' : 'ds-btn-primary'} disabled={ocupado === p.id}
                    style={{ width: 'auto', padding: '7px 12px', fontSize: '13px' }} onClick={() => activar(p)}>
                    {p.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  {p.activo && <Link href={rutaPrograma(p.slug)} target="_blank" className="table-link" style={{ alignSelf: 'center' }}>Ver →</Link>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)' }}>Episodios ({visibles.length})</h2>
          {programas.length > 1 && (
            <select className="ds-select" style={{ maxWidth: '260px' }} value={filtro} onChange={e => setFiltro(e.target.value)}>
              <option value="">Todos los programas</option>
              {programas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          )}
        </div>
        {visibles.length === 0 ? (
          <div className="obras-empty"><p className="obras-empty-text" style={{ marginBottom: 0 }}>Sin episodios. Usa «Importar ahora» en un programa.</p></div>
        ) : (
          <div className="account-card" style={{ padding: 0 }}>
            {visibles.map(e => {
              const p = programaDe[e.programa_id]
              return (
                <div key={e.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                      <div style={{ fontSize: '14px', color: 'var(--black)' }}>{e.titulo}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        {p?.nombre} · {fechaEpisodio(e.fecha_publicacion)} · {[e.youtube_video_id && 'vídeo', e.audio_url && 'audio'].filter(Boolean).join(' + ')}
                        {e.estado === 'retirado' && e.motivo_retirada && <span style={{ color: 'var(--red-h)' }}> · Retirado: {e.motivo_retirada}</span>}
                      </div>
                    </div>
                    {e.estado === 'publicado' && p?.activo && (
                      <Link href={rutaEpisodio(p.slug, e.slug)} target="_blank" className="table-link">Ver</Link>
                    )}
                    {e.estado === 'publicado' ? (
                      <button type="button" className="table-link table-link--danger" onClick={() => { setRetirando(e.id); setMotivo('') }}>Retirar</button>
                    ) : (
                      <button type="button" className="table-link" disabled={ocupado === e.id} onClick={() => cambiarEpisodio(e, 'publicado')}>Restaurar</button>
                    )}
                  </div>
                  {retirando === e.id && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      <input className="ds-input" style={{ flex: '1 1 260px' }} placeholder="Motivo (p. ej.: no es de artes escénicas)" maxLength={500}
                        value={motivo} onChange={ev => setMotivo(ev.target.value)} />
                      <button type="button" className="ds-btn-primary" disabled={motivo.trim().length < 3 || ocupado === e.id}
                        style={{ width: 'auto', padding: '8px 14px', fontSize: '12px' }} onClick={() => cambiarEpisodio(e, 'retirado')}>Confirmar</button>
                      <button type="button" className="table-link" onClick={() => setRetirando(null)}>Cancelar</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
