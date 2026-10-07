'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/geo/countries'
import {
  BUCKET_LOGOS,
  MAX_DESCRIPCION,
  MAX_NOMBRE,
  TIPOS,
  type CamposColaborador,
  filaDeFormulario,
  intercambiarOrden,
  rutaLogo,
  urlSegura,
  validarColaborador,
  validarLogo,
} from '@/lib/colaboradores/colaboradores'

export type ColaboradorAdmin = {
  id: string
  nombre: string
  tipo: string
  descripcion: string | null
  pais_code: string | null
  url_web: string | null
  logo_url: string | null
  orden: number
  activo: boolean
  desde: string | null
  noticias_fuente_id: string | null
}

export type FuenteOpcion = { id: string; nombre: string; dominio: string }

const VACIO: CamposColaborador = {
  nombre: '', tipo: 'medio', descripcion: '', pais_code: '', url_web: '', desde: '', noticias_fuente_id: '',
}

function camposDe(c: ColaboradorAdmin): CamposColaborador {
  return {
    nombre: c.nombre,
    tipo: c.tipo,
    descripcion: c.descripcion ?? '',
    pais_code: c.pais_code ?? '',
    url_web: c.url_web ?? '',
    desde: c.desde ?? '',
    noticias_fuente_id: c.noticias_fuente_id ?? '',
  }
}

/** Ruta dentro del bucket a partir de la URL pública, para poder borrar el logo anterior. */
function rutaDesdeUrl(url: string | null): string | null {
  if (!url) return null
  const marca = `/storage/v1/object/public/${BUCKET_LOGOS}/`
  const i = url.indexOf(marca)
  return i === -1 ? null : decodeURIComponent(url.slice(i + marca.length))
}

/**
 * Crear, editar, ordenar, subir el logo y activar o desactivar colaboradores.
 *
 * Todo con la sesión del moderador (cliente de navegador): deciden la RLS de
 * la tabla y las políticas de Storage del bucket. Un colaborador nuevo nace
 * inactivo; «Activar» es una acción aparte y explícita.
 */
export default function GestionColaboradores({ inicial, fuentes }: { inicial: ColaboradorAdmin[]; fuentes: FuenteOpcion[] }) {
  const router = useRouter()
  const [lista, setLista] = useState(inicial)
  const [editando, setEditando] = useState<string | 'nuevo' | null>(null)
  const [campos, setCampos] = useState<CamposColaborador>(VACIO)
  const [logo, setLogo] = useState<File | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  const ordenada = [...lista].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'))
  const set = <K extends keyof CamposColaborador>(k: K, v: CamposColaborador[K]) => setCampos(p => ({ ...p, [k]: v }))

  const abrir = (c: ColaboradorAdmin | null) => {
    setError('')
    setAviso('')
    setLogo(null)
    setCampos(c ? camposDe(c) : VACIO)
    setEditando(c ? c.id : 'nuevo')
  }

  const recargar = async () => {
    const { data } = await createClient()
      .from('colaboradores')
      .select('id, nombre, tipo, descripcion, pais_code, url_web, logo_url, orden, activo, desde, noticias_fuente_id')
    if (data) setLista(data as ColaboradorAdmin[])
    router.refresh()
  }

  const guardar = async () => {
    setError('')
    const problema = validarColaborador(campos) ?? (logo ? validarLogo(logo) : null)
    if (problema) { setError(problema); return }

    setOcupado(true)
    const supabase = createClient()
    const fila = filaDeFormulario(campos)

    let id: string
    let logoAnterior: string | null = null
    if (editando === 'nuevo') {
      const orden = ordenada.length > 0 ? ordenada[ordenada.length - 1].orden + 10 : 10
      const { data, error: err } = await supabase.from('colaboradores').insert({ ...fila, orden }).select('id').single()
      if (err || !data) { setOcupado(false); setError(err?.message ?? 'No se pudo crear.'); return }
      id = data.id
    } else {
      id = editando as string
      logoAnterior = lista.find(c => c.id === id)?.logo_url ?? null
      const { error: err } = await supabase.from('colaboradores').update(fila).eq('id', id)
      if (err) { setOcupado(false); setError(err.message); return }
    }

    if (logo) {
      const ruta = rutaLogo(id, logo.type)
      const { error: errSubida } = await supabase.storage.from(BUCKET_LOGOS).upload(ruta, logo, { contentType: logo.type })
      if (errSubida) {
        setOcupado(false)
        setError(`Datos guardados, pero el logo no se pudo subir: ${errSubida.message}`)
        await recargar()
        return
      }
      const { data: { publicUrl } } = supabase.storage.from(BUCKET_LOGOS).getPublicUrl(ruta)
      const { error: errUrl } = await supabase.from('colaboradores').update({ logo_url: publicUrl }).eq('id', id)
      if (errUrl) { setOcupado(false); setError(errUrl.message); await recargar(); return }
      // El anterior ya no lo usa nadie. Si no se puede borrar, solo queda un archivo huérfano.
      const anterior = rutaDesdeUrl(logoAnterior)
      if (anterior) await supabase.storage.from(BUCKET_LOGOS).remove([anterior])
    }

    setOcupado(false)
    setEditando(null)
    setAviso(editando === 'nuevo' ? 'Creado. Está inactivo: actívalo cuando quieras que se vea.' : 'Cambios guardados.')
    await recargar()
  }

  const alternarActivo = async (c: ColaboradorAdmin) => {
    setError('')
    setOcupado(true)
    const { error: err } = await createClient().from('colaboradores').update({ activo: !c.activo }).eq('id', c.id)
    setOcupado(false)
    if (err) { setError(err.message); return }
    setAviso(c.activo ? `«${c.nombre}» desactivado.` : `«${c.nombre}» activado: aparecerá en la web en unos minutos.`)
    await recargar()
  }

  const mover = async (indice: number, direccion: -1 | 1) => {
    const a = ordenada[indice]
    const b = ordenada[indice + direccion]
    if (!a || !b) return
    setError('')
    setOcupado(true)
    const supabase = createClient()
    for (const cambio of intercambiarOrden(a, b)) {
      const { error: err } = await supabase.from('colaboradores').update({ orden: cambio.orden }).eq('id', cambio.id)
      if (err) { setOcupado(false); setError(err.message); await recargar(); return }
    }
    setOcupado(false)
    await recargar()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {aviso && <div className="ds-alert-success">{aviso}</div>}
      {error && editando === null && <div className="ds-alert-error">{error}</div>}

      {editando === null && (
        <div>
          <button type="button" className="ds-btn-primary" style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }}
            onClick={() => abrir(null)}>
            Nuevo colaborador
          </button>
        </div>
      )}

      {editando !== null && (
        <article className="account-card">
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--black)', marginBottom: '14px' }}>
            {editando === 'nuevo' ? 'Nuevo colaborador' : 'Editar colaborador'}
          </h2>
          <div className="ds-form-grid">
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="colab-nombre">Nombre *</label>
              <input id="colab-nombre" className="ds-input" maxLength={MAX_NOMBRE}
                value={campos.nombre} onChange={e => set('nombre', e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="colab-tipo">Tipo *</label>
              <select id="colab-tipo" className="ds-select" value={campos.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="colab-web">Web * (https)</label>
              <input id="colab-web" className="ds-input" placeholder="https://"
                value={campos.url_web} onChange={e => set('url_web', e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="colab-pais">País</label>
              <select id="colab-pais" className="ds-select" value={campos.pais_code} onChange={e => set('pais_code', e.target.value)}>
                <option value="">Sin país</option>
                {COUNTRIES.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="colab-desde">Colabora desde</label>
              <input id="colab-desde" className="ds-input" type="date"
                value={campos.desde} onChange={e => set('desde', e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="colab-fuente">Fuente de Noticias vinculada</label>
              <select id="colab-fuente" className="ds-select" value={campos.noticias_fuente_id}
                onChange={e => set('noticias_fuente_id', e.target.value)}>
                <option value="">Ninguna</option>
                {fuentes.map(f => <option key={f.id} value={f.id}>{f.nombre} ({f.dominio})</option>)}
              </select>
              <p className="ds-form-hint">Sus noticias llevarán el distintivo «Medio colaborador» mientras esté activo.</p>
            </div>
          </div>

          <div className="ds-form-group" style={{ marginTop: '12px' }}>
            <label className="ds-label" htmlFor="colab-desc">Descripción</label>
            <textarea id="colab-desc" className="ds-textarea" rows={3} maxLength={MAX_DESCRIPCION}
              value={campos.descripcion} onChange={e => set('descripcion', e.target.value)} />
            <p className="ds-form-hint">{campos.descripcion.length} / {MAX_DESCRIPCION} caracteres</p>
          </div>

          <div className="ds-form-group" style={{ marginTop: '12px' }}>
            <label className="ds-label" htmlFor="colab-logo">Logo (SVG, PNG o WebP; máx. 500 KB)</label>
            <input id="colab-logo" type="file" accept="image/svg+xml,image/png,image/webp"
              onChange={e => setLogo(e.target.files?.[0] ?? null)} />
            <p className="ds-form-hint">Si ya tiene logo y no eliges archivo, se conserva el actual.</p>
          </div>

          {error && <div className="ds-alert-error" style={{ marginTop: '12px' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="ds-btn-primary" disabled={ocupado}
              style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }} onClick={guardar}>
              {ocupado ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className="ds-btn-secondary" disabled={ocupado}
              style={{ padding: '9px 18px', fontSize: '13px' }} onClick={() => { setEditando(null); setError('') }}>
              Cancelar
            </button>
          </div>
          <p className="ds-form-hint" style={{ marginTop: '8px' }}>Guardar no activa: la visibilidad se cambia con «Activar».</p>
        </article>
      )}

      {ordenada.length === 0 ? (
        <div className="obras-empty"><p className="obras-empty-text" style={{ marginBottom: 0 }}>Todavía no hay colaboradores.</p></div>
      ) : ordenada.map((c, i) => {
        const logoUrl = urlSegura(c.logo_url)
        return (
          <article key={c.id} className="account-card" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: '96px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--subtle)', borderRadius: '8px', flexShrink: 0 }}>
              {logoUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={logoUrl} alt="" style={{ maxWidth: '88px', maxHeight: '40px', objectFit: 'contain' }} />
                : <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Sin logo</span>}
            </div>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <p style={{ fontSize: '15px', color: 'var(--black)', fontWeight: 500 }}>{c.nombre}</p>
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {TIPOS.find(t => t.value === c.tipo)?.label ?? c.tipo}
                {c.url_web && ` · ${c.url_web.replace(/^https:\/\//, '')}`}
              </p>
            </div>
            <span className={`status-pill ${c.activo ? 'status-pill--published' : 'status-pill--draft'}`}>
              {c.activo ? 'Activo' : 'Inactivo'}
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button type="button" className="ds-btn-secondary" disabled={ocupado || i === 0} aria-label={`Subir ${c.nombre}`}
                style={{ padding: '6px 10px', fontSize: '13px' }} onClick={() => mover(i, -1)}>↑</button>
              <button type="button" className="ds-btn-secondary" disabled={ocupado || i === ordenada.length - 1} aria-label={`Bajar ${c.nombre}`}
                style={{ padding: '6px 10px', fontSize: '13px' }} onClick={() => mover(i, 1)}>↓</button>
              <button type="button" className="ds-btn-secondary" disabled={ocupado}
                style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => abrir(c)}>Editar</button>
              <button type="button" className={c.activo ? 'ds-btn-secondary' : 'ds-btn-primary'} disabled={ocupado}
                style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }} onClick={() => alternarActivo(c)}>
                {c.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}
