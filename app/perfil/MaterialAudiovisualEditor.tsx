'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { redimensionarImagen } from '@/lib/perfil-multimedia/redimensionar'
import {
  BUCKET_GALERIA,
  BUCKET_PORTADAS,
  MAX_CREDITO,
  MAX_DESCRIPCION_PROYECTO,
  MAX_FOTOS,
  MAX_PIE,
  MAX_PORTFOLIO,
  MAX_TITULO_PROYECTO,
  MAX_TITULO_VIDEO,
  MAX_VIDEOS,
  type CamposProyecto,
  analizarVideo,
  filaProyecto,
  intercambiarOrden,
  limiteAlcanzado,
  rutaDesdeUrl,
  rutaNueva,
  urlPublica,
  validarFoto,
  validarImagen,
  validarProyecto,
  validarVideo,
} from '@/lib/perfil-multimedia/multimedia'

export type Foto = { id: string; ruta: string; pie: string | null; credito: string | null; orden: number }
export type Video = { id: string; url: string; plataforma: string; titulo: string | null; orden: number }
export type Proyecto = {
  id: string; titulo: string; anio: number | null; rol: string | null; compania: string | null
  descripcion: string | null; imagen_ruta: string | null; enlace: string | null; orden: number
}

type Props = {
  profileId: string
  supabaseUrl: string
  coverUrl: string | null
  fotos: Foto[]
  videos: Video[]
  proyectos: Proyecto[]
}

const PROYECTO_VACIO: CamposProyecto = { titulo: '', anio: '', rol: '', compania: '', descripcion: '', enlace: '' }

/**
 * Bloque 5 del perfil: portada, galería de fotos, vídeos y portfolio.
 *
 * Todo con la sesión del usuario (cliente de navegador): la RLS de las tablas
 * y las políticas de Storage deciden (dueño + plan de pago para escribir; los
 * límites de 12 / 6 / 10 los comprueba un trigger). Las imágenes se reducen
 * en el navegador a 2000 px de lado largo antes de subirlas. Se publican al
 * momento: no hay cola de moderación.
 */
export default function MaterialAudiovisualEditor(p: Props) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const ok = (texto: string) => setMensaje({ tipo: 'ok', texto })
  const fallo = (texto: string) => setMensaje({ tipo: 'error', texto })
  const traducir = (m: string) =>
    m.includes('máximo') ? m
      : m.includes('row-level security') ? 'Esta función es del plan Premium o superior.'
        : m

  async function conOcupado(fn: () => Promise<void>) {
    setOcupado(true)
    setMensaje(null)
    try { await fn() } catch (e) { fallo(e instanceof Error ? traducir(e.message) : 'Algo ha fallado.') }
    setOcupado(false)
    router.refresh()
  }

  async function subirImagen(archivo: File, bucket: string, carpeta: 'fotos' | 'portfolio' | 'portada'): Promise<string> {
    const problema = validarImagen(archivo)
    if (problema) throw new Error(problema)
    const { blob, tipo, ext } = await redimensionarImagen(archivo)
    const ruta = rutaNueva(p.profileId, carpeta, ext)
    const { error } = await createClient().storage.from(bucket).upload(ruta, blob, { contentType: tipo })
    if (error) throw new Error(traducir(error.message))
    return ruta
  }

  async function reordenar(tabla: 'perfil_galeria_fotos' | 'perfil_galeria_videos' | 'perfil_portfolio', a: { id: string; orden: number }, b: { id: string; orden: number }) {
    await conOcupado(async () => {
      const supabase = createClient()
      for (const c of intercambiarOrden(a, b)) {
        const { error } = await supabase.from(tabla).update({ orden: c.orden }).eq('id', c.id)
        if (error) throw new Error(error.message)
      }
    })
  }

  const siguienteOrden = (l: { orden: number }[]) => (l.length ? Math.max(...l.map(x => x.orden)) + 10 : 10)

  // ── Portada ─────────────────────────────────────────────────────────────
  const [portada, setPortada] = useState<File | null>(null)

  const guardarPortada = () => conOcupado(async () => {
    if (!portada) throw new Error('Elige una imagen.')
    const ruta = await subirImagen(portada, BUCKET_PORTADAS, 'portada')
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ cover_url: urlPublica(p.supabaseUrl, BUCKET_PORTADAS, ruta) }).eq('id', p.profileId)
    if (error) { await supabase.storage.from(BUCKET_PORTADAS).remove([ruta]); throw new Error(error.message) }
    const anterior = rutaDesdeUrl(p.coverUrl, BUCKET_PORTADAS)
    if (anterior) await supabase.storage.from(BUCKET_PORTADAS).remove([anterior])
    setPortada(null)
    ok('Portada actualizada.')
  })

  const quitarPortada = () => conOcupado(async () => {
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ cover_url: null }).eq('id', p.profileId)
    if (error) throw new Error(error.message)
    const anterior = rutaDesdeUrl(p.coverUrl, BUCKET_PORTADAS)
    if (anterior) await supabase.storage.from(BUCKET_PORTADAS).remove([anterior])
    ok('Portada quitada.')
  })

  // ── Fotos ───────────────────────────────────────────────────────────────
  const [foto, setFoto] = useState<File | null>(null)
  const [pie, setPie] = useState('')
  const [credito, setCredito] = useState('')
  const fotosOrdenadas = [...p.fotos].sort((a, b) => a.orden - b.orden)

  const anadirFoto = () => conOcupado(async () => {
    const problema = limiteAlcanzado(p.fotos.length, MAX_FOTOS) ?? validarFoto({ pie, credito }) ?? (foto ? null : 'Elige una foto.')
    if (problema) throw new Error(problema)
    const ruta = await subirImagen(foto!, BUCKET_GALERIA, 'fotos')
    const supabase = createClient()
    const { error } = await supabase.from('perfil_galeria_fotos').insert({
      profile_id: p.profileId, ruta, pie: pie.trim() || null, credito: credito.trim() || null, orden: siguienteOrden(p.fotos),
    })
    if (error) { await supabase.storage.from(BUCKET_GALERIA).remove([ruta]); throw new Error(error.message) }
    setFoto(null); setPie(''); setCredito('')
    ok('Foto añadida y publicada.')
  })

  const borrarFoto = (f: Foto) => conOcupado(async () => {
    const supabase = createClient()
    const { error } = await supabase.from('perfil_galeria_fotos').delete().eq('id', f.id)
    if (error) throw new Error(error.message)
    await supabase.storage.from(BUCKET_GALERIA).remove([f.ruta])
    ok('Foto borrada.')
  })

  // ── Vídeos ──────────────────────────────────────────────────────────────
  const [urlVideo, setUrlVideo] = useState('')
  const [tituloVideo, setTituloVideo] = useState('')
  const videosOrdenados = [...p.videos].sort((a, b) => a.orden - b.orden)

  const anadirVideo = () => conOcupado(async () => {
    const problema = limiteAlcanzado(p.videos.length, MAX_VIDEOS) ?? validarVideo({ url: urlVideo, titulo: tituloVideo })
    if (problema) throw new Error(problema)
    const v = analizarVideo(urlVideo)!
    const { error } = await createClient().from('perfil_galeria_videos').insert({
      profile_id: p.profileId, url: v.url, plataforma: v.plataforma, titulo: tituloVideo.trim() || null, orden: siguienteOrden(p.videos),
    })
    if (error) throw new Error(error.message)
    setUrlVideo(''); setTituloVideo('')
    ok('Vídeo añadido.')
  })

  const borrarVideo = (v: Video) => conOcupado(async () => {
    const { error } = await createClient().from('perfil_galeria_videos').delete().eq('id', v.id)
    if (error) throw new Error(error.message)
    ok('Vídeo borrado.')
  })

  // ── Portfolio ───────────────────────────────────────────────────────────
  const [editando, setEditando] = useState<string | 'nuevo' | null>(null)
  const [proyecto, setProyecto] = useState<CamposProyecto>(PROYECTO_VACIO)
  const [imagenProyecto, setImagenProyecto] = useState<File | null>(null)
  const proyectosOrdenados = [...p.proyectos].sort((a, b) => a.orden - b.orden)
  const setP = <K extends keyof CamposProyecto>(k: K, v: string) => setProyecto(x => ({ ...x, [k]: v }))

  const abrirProyecto = (x: Proyecto | null) => {
    setMensaje(null)
    setImagenProyecto(null)
    setProyecto(x ? {
      titulo: x.titulo, anio: x.anio?.toString() ?? '', rol: x.rol ?? '', compania: x.compania ?? '',
      descripcion: x.descripcion ?? '', enlace: x.enlace ?? '',
    } : PROYECTO_VACIO)
    setEditando(x ? x.id : 'nuevo')
  }

  const guardarProyecto = () => conOcupado(async () => {
    const problema = (editando === 'nuevo' ? limiteAlcanzado(p.proyectos.length, MAX_PORTFOLIO) : null) ?? validarProyecto(proyecto)
    if (problema) throw new Error(problema)
    const supabase = createClient()
    const nuevaRuta = imagenProyecto ? await subirImagen(imagenProyecto, BUCKET_GALERIA, 'portfolio') : null
    const anterior = editando !== 'nuevo' ? p.proyectos.find(x => x.id === editando)?.imagen_ruta ?? null : null
    const fila = { ...filaProyecto(proyecto), ...(nuevaRuta ? { imagen_ruta: nuevaRuta } : {}) }

    const { error } = editando === 'nuevo'
      ? await supabase.from('perfil_portfolio').insert({ ...fila, profile_id: p.profileId, orden: siguienteOrden(p.proyectos) })
      : await supabase.from('perfil_portfolio').update(fila).eq('id', editando as string)
    if (error) {
      if (nuevaRuta) await supabase.storage.from(BUCKET_GALERIA).remove([nuevaRuta])
      throw new Error(error.message)
    }
    if (nuevaRuta && anterior) await supabase.storage.from(BUCKET_GALERIA).remove([anterior])
    setEditando(null)
    ok(editando === 'nuevo' ? 'Proyecto añadido.' : 'Proyecto guardado.')
  })

  const borrarProyecto = (x: Proyecto) => conOcupado(async () => {
    const supabase = createClient()
    const { error } = await supabase.from('perfil_portfolio').delete().eq('id', x.id)
    if (error) throw new Error(error.message)
    if (x.imagen_ruta) await supabase.storage.from(BUCKET_GALERIA).remove([x.imagen_ruta])
    ok('Proyecto borrado.')
  })

  // ── Render ──────────────────────────────────────────────────────────────
  const botonFlecha = { padding: '4px 9px', fontSize: '12px' }
  const titulo = (t: string, extra?: string) => (
    <h2 style={{ fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--black)', marginBottom: '4px' }}>
      {t}{extra && <span style={{ fontFamily: 'var(--sans)', fontSize: '12px', color: 'var(--muted)', marginLeft: '8px' }}>{extra}</span>}
    </h2>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {mensaje && <div className={mensaje.tipo === 'ok' ? 'ds-alert-success' : 'ds-alert-error'} role="status">{mensaje.texto}</div>}

      {/* Portada */}
      <section className="account-card">
        {titulo('Imagen de portada')}
        <p className="ds-form-hint" style={{ marginBottom: '12px' }}>Cabecera de tu perfil público. Formato apaisado; se reduce a 2000 px.</p>
        {p.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.coverUrl} alt="Portada actual" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: 'var(--radius)', marginBottom: '12px' }} />
        )}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Imagen de portada"
            onChange={e => setPortada(e.target.files?.[0] ?? null)} />
          <button type="button" className="ds-btn-primary" disabled={ocupado || !portada}
            style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }} onClick={guardarPortada}>
            {p.coverUrl ? 'Cambiar portada' : 'Subir portada'}
          </button>
          {p.coverUrl && (
            <button type="button" className="ds-btn-secondary" disabled={ocupado}
              style={{ padding: '8px 16px', fontSize: '13px' }} onClick={quitarPortada}>Quitar</button>
          )}
        </div>
      </section>

      {/* Fotos */}
      <section className="account-card">
        {titulo('Galería de fotos', `${p.fotos.length} / ${MAX_FOTOS}`)}
        <p className="ds-form-hint" style={{ marginBottom: '12px' }}>JPEG, PNG o WebP. Se publican al momento en tu perfil.</p>
        {fotosOrdenadas.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
            {fotosOrdenadas.map((f, i) => (
              <li key={f.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--white)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urlPublica(p.supabaseUrl, BUCKET_GALERIA, f.ruta)} alt={f.pie ?? ''} style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '6px 8px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--muted)', minHeight: '16px' }}>{f.pie ?? 'Sin pie'}</p>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <button type="button" className="ds-btn-secondary" style={botonFlecha} disabled={ocupado || i === 0} aria-label="Subir foto"
                      onClick={() => reordenar('perfil_galeria_fotos', f, fotosOrdenadas[i - 1])}>↑</button>
                    <button type="button" className="ds-btn-secondary" style={botonFlecha} disabled={ocupado || i === fotosOrdenadas.length - 1} aria-label="Bajar foto"
                      onClick={() => reordenar('perfil_galeria_fotos', f, fotosOrdenadas[i + 1])}>↓</button>
                    <button type="button" className="ds-btn-secondary" style={{ ...botonFlecha, marginLeft: 'auto' }} disabled={ocupado}
                      onClick={() => borrarFoto(f)}>Borrar</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {p.fotos.length < MAX_FOTOS ? (
          <div className="ds-form-grid">
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="foto-archivo">Foto</label>
              <input id="foto-archivo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFoto(e.target.files?.[0] ?? null)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="foto-pie">Pie de foto</label>
              <input id="foto-pie" className="ds-input" maxLength={MAX_PIE} value={pie} onChange={e => setPie(e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="foto-credito">Crédito o autoría</label>
              <input id="foto-credito" className="ds-input" maxLength={MAX_CREDITO} value={credito} onChange={e => setCredito(e.target.value)} placeholder="© Nombre" />
            </div>
            <div className="ds-form-group" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="ds-btn-primary" disabled={ocupado || !foto}
                style={{ width: 'auto', padding: '9px 16px', fontSize: '13px' }} onClick={anadirFoto}>
                {ocupado ? 'Subiendo…' : 'Añadir foto'}
              </button>
            </div>
          </div>
        ) : <p className="ds-form-hint">Has llegado al máximo de {MAX_FOTOS} fotos.</p>}
      </section>

      {/* Vídeos */}
      <section className="account-card">
        {titulo('Vídeos', `${p.videos.length} / ${MAX_VIDEOS}`)}
        <p className="ds-form-hint" style={{ marginBottom: '12px' }}>Enlaces de YouTube o Vimeo. No se suben archivos.</p>
        {videosOrdenados.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {videosOrdenados.map((v, i) => (
              <li key={v.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' }}>
                <span className="status-pill" style={{ background: 'var(--subtle)', color: 'var(--text)' }}>{v.plataforma === 'youtube' ? 'YouTube' : 'Vimeo'}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.titulo ?? v.url}</span>
                <button type="button" className="ds-btn-secondary" style={botonFlecha} disabled={ocupado || i === 0} aria-label="Subir vídeo"
                  onClick={() => reordenar('perfil_galeria_videos', v, videosOrdenados[i - 1])}>↑</button>
                <button type="button" className="ds-btn-secondary" style={botonFlecha} disabled={ocupado || i === videosOrdenados.length - 1} aria-label="Bajar vídeo"
                  onClick={() => reordenar('perfil_galeria_videos', v, videosOrdenados[i + 1])}>↓</button>
                <button type="button" className="ds-btn-secondary" style={botonFlecha} disabled={ocupado} onClick={() => borrarVideo(v)}>Borrar</button>
              </li>
            ))}
          </ul>
        )}
        {p.videos.length < MAX_VIDEOS ? (
          <div className="ds-form-grid">
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="video-url">Enlace</label>
              <input id="video-url" className="ds-input" value={urlVideo} onChange={e => setUrlVideo(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="video-titulo">Título</label>
              <input id="video-titulo" className="ds-input" maxLength={MAX_TITULO_VIDEO} value={tituloVideo} onChange={e => setTituloVideo(e.target.value)} />
            </div>
            <div className="ds-form-group" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="ds-btn-primary" disabled={ocupado || urlVideo.trim() === ''}
                style={{ width: 'auto', padding: '9px 16px', fontSize: '13px' }} onClick={anadirVideo}>Añadir vídeo</button>
            </div>
          </div>
        ) : <p className="ds-form-hint">Has llegado al máximo de {MAX_VIDEOS} vídeos.</p>}
      </section>

      {/* Portfolio */}
      <section className="account-card">
        {titulo('Portfolio de proyectos y espectáculos', `${p.proyectos.length} / ${MAX_PORTFOLIO}`)}
        {proyectosOrdenados.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {proyectosOrdenados.map((x, i) => (
              <li key={x.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontWeight: 500 }}>{x.titulo}</strong>
                  {x.anio && <span style={{ color: 'var(--muted)' }}> · {x.anio}</span>}
                </span>
                <button type="button" className="ds-btn-secondary" style={botonFlecha} disabled={ocupado || i === 0} aria-label="Subir proyecto"
                  onClick={() => reordenar('perfil_portfolio', x, proyectosOrdenados[i - 1])}>↑</button>
                <button type="button" className="ds-btn-secondary" style={botonFlecha} disabled={ocupado || i === proyectosOrdenados.length - 1} aria-label="Bajar proyecto"
                  onClick={() => reordenar('perfil_portfolio', x, proyectosOrdenados[i + 1])}>↓</button>
                <button type="button" className="ds-btn-secondary" style={botonFlecha} disabled={ocupado} onClick={() => abrirProyecto(x)}>Editar</button>
                <button type="button" className="ds-btn-secondary" style={botonFlecha} disabled={ocupado} onClick={() => borrarProyecto(x)}>Borrar</button>
              </li>
            ))}
          </ul>
        )}

        {editando === null ? (
          p.proyectos.length < MAX_PORTFOLIO
            ? <button type="button" className="ds-btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => abrirProyecto(null)}>Añadir proyecto</button>
            : <p className="ds-form-hint">Has llegado al máximo de {MAX_PORTFOLIO} proyectos.</p>
        ) : (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
            <div className="ds-form-grid">
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="pr-titulo">Título *</label>
                <input id="pr-titulo" className="ds-input" maxLength={MAX_TITULO_PROYECTO} value={proyecto.titulo} onChange={e => setP('titulo', e.target.value)} />
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="pr-anio">Año</label>
                <input id="pr-anio" className="ds-input" inputMode="numeric" value={proyecto.anio} onChange={e => setP('anio', e.target.value)} />
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="pr-rol">Rol en el proyecto</label>
                <input id="pr-rol" className="ds-input" value={proyecto.rol} onChange={e => setP('rol', e.target.value)} />
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="pr-compania">Compañía o producción</label>
                <input id="pr-compania" className="ds-input" value={proyecto.compania} onChange={e => setP('compania', e.target.value)} />
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="pr-enlace">Enlace (https)</label>
                <input id="pr-enlace" className="ds-input" value={proyecto.enlace} onChange={e => setP('enlace', e.target.value)} placeholder="https://" />
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="pr-imagen">Imagen</label>
                <input id="pr-imagen" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setImagenProyecto(e.target.files?.[0] ?? null)} />
              </div>
            </div>
            <div className="ds-form-group" style={{ marginTop: '10px' }}>
              <label className="ds-label" htmlFor="pr-desc">Descripción</label>
              <textarea id="pr-desc" className="ds-textarea" rows={3} maxLength={MAX_DESCRIPCION_PROYECTO} value={proyecto.descripcion} onChange={e => setP('descripcion', e.target.value)} />
              <p className="ds-form-hint">{proyecto.descripcion.length} / {MAX_DESCRIPCION_PROYECTO}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="ds-btn-primary" disabled={ocupado} style={{ width: 'auto', padding: '9px 16px', fontSize: '13px' }} onClick={guardarProyecto}>
                {ocupado ? 'Guardando…' : 'Guardar proyecto'}
              </button>
              <button type="button" className="ds-btn-secondary" disabled={ocupado} style={{ padding: '9px 16px', fontSize: '13px' }} onClick={() => setEditando(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
