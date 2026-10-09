'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES, getCountryByCode } from '@/lib/geo/countries'
import {
  ACCESIBILIDAD,
  COLUMNAS_ADMIN,
  DESCRIPCION_ORIGEN,
  ESTADOS,
  FUENTES,
  REDES,
  REDES_VACIAS,
  TITULARIDAD,
  type ClaveRed,
  MAX_DESCRIPCION,
  MAX_DIRECCION,
  MAX_MUNICIPIO,
  MAX_NOMBRE,
  TIPOS,
  type CamposEspacio,
  etiquetaTipo,
  filaDeFormulario,
  normalizar,
  redesParaFormulario,
  urlFuente,
  validarEspacio,
} from '@/lib/espacios/espacios'

export type EspacioAdmin = {
  id: string
  slug: string
  nombre: string
  tipo: string
  pais_code: string
  region: string
  provincia: string | null
  isla: string | null
  municipio: string
  direccion: string | null
  codigo_postal: string | null
  lat: number
  lon: number
  web: string | null
  telefono: string | null
  email: string | null
  redes: unknown
  aforo: number | null
  num_salas: number | null
  accesibilidad: string | null
  anio_inauguracion: number | null
  arquitecto: string | null
  titularidad: string | null
  wikidata_id: string | null
  imagen_url: string | null
  imagen_autor: string | null
  imagen_licencia: string | null
  imagen_fuente_url: string | null
  descripcion: string | null
  descripcion_origen: string | null
  fuente: string
  fuente_ref: string | null
  estado: 'publicado' | 'borrador' | 'retirado'
  gestionado_por: string | null
  verificado: boolean
  updated_at: string
}

type Persona = { nombre: string; slug: string | null; email: string }

const VACIO: CamposEspacio = {
  nombre: '', tipo: 'teatro', pais_code: 'ES', region: '', provincia: '', isla: '', municipio: '', direccion: '',
  codigo_postal: '', lat: '', lon: '', web: '', telefono: '', email: '', redes: REDES_VACIAS, aforo: '', num_salas: '',
  accesibilidad: '', anio_inauguracion: '', arquitecto: '', titularidad: '', wikidata_id: '', imagen_url: '',
  imagen_autor: '', imagen_licencia: '', imagen_fuente_url: '', descripcion: '', descripcion_origen: '',
  fuente: 'redaccion', fuente_ref: '',
}

const texto = (v: string | number | null) => (v === null ? '' : String(v))

function camposDe(e: EspacioAdmin): CamposEspacio {
  return {
    nombre: e.nombre, tipo: e.tipo, pais_code: e.pais_code, region: e.region, provincia: texto(e.provincia),
    isla: texto(e.isla), municipio: e.municipio, direccion: texto(e.direccion), codigo_postal: texto(e.codigo_postal),
    lat: String(e.lat), lon: String(e.lon), web: texto(e.web), telefono: texto(e.telefono), email: texto(e.email),
    redes: redesParaFormulario(e.redes), aforo: texto(e.aforo), num_salas: texto(e.num_salas),
    accesibilidad: texto(e.accesibilidad), anio_inauguracion: texto(e.anio_inauguracion), arquitecto: texto(e.arquitecto),
    titularidad: texto(e.titularidad), wikidata_id: texto(e.wikidata_id), imagen_url: texto(e.imagen_url),
    imagen_autor: texto(e.imagen_autor), imagen_licencia: texto(e.imagen_licencia), imagen_fuente_url: texto(e.imagen_fuente_url),
    descripcion: texto(e.descripcion), descripcion_origen: texto(e.descripcion_origen), fuente: e.fuente, fuente_ref: texto(e.fuente_ref),
  }
}

const MAX_FILAS = 200

/**
 * Alta, edición y cambio de estado de los espacios. Un espacio nuevo nace en
 * borrador; publicarlo es una acción aparte y explícita. El slug lo pone la
 * base al crear y no cambia (es la URL de la ficha).
 */
export default function GestionEspacios({ inicial, personas }: { inicial: EspacioAdmin[]; personas: Record<string, Persona> }) {
  const router = useRouter()
  const [lista, setLista] = useState(inicial)
  const [editando, setEditando] = useState<string | 'nuevo' | null>(null)
  const [campos, setCampos] = useState<CamposEspacio>(VACIO)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [fEstado, setFEstado] = useState('')
  const [fPais, setFPais] = useState('')
  const [fRegion, setFRegion] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [fTexto, setFTexto] = useState('')

  const set = <K extends keyof CamposEspacio>(k: K, v: CamposEspacio[K]) => setCampos(p => ({ ...p, [k]: v }))
  const setRed = (k: ClaveRed, v: string) => setCampos(p => ({ ...p, redes: { ...p.redes, [k]: v } }))
  const regionesForm = getCountryByCode(campos.pais_code)?.regions ?? []
  const regionesFiltro = fPais ? [...new Set(lista.filter(e => e.pais_code === fPais).map(e => e.region))].sort((a, b) => a.localeCompare(b, 'es')) : []

  const filtrada = useMemo(() => {
    const q = normalizar(fTexto)
    return lista
      .filter(e =>
        (!fEstado || e.estado === fEstado) &&
        (!fPais || e.pais_code === fPais) &&
        (!fRegion || e.region === fRegion) &&
        (!fTipo || e.tipo === fTipo) &&
        (!q || normalizar(`${e.nombre} ${e.municipio}`).includes(q)))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [lista, fEstado, fPais, fRegion, fTipo, fTexto])

  const recuento = (estado: string) => lista.filter(e => e.estado === estado).length

  const abrir = (e: EspacioAdmin | null) => {
    setError('')
    setAviso('')
    setCampos(e ? camposDe(e) : VACIO)
    setEditando(e ? e.id : 'nuevo')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const recargar = async () => {
    const { data } = await createClient().from('espacios_escenicos').select(COLUMNAS_ADMIN).order('nombre', { ascending: true }).limit(5000)
    if (data) setLista(data as EspacioAdmin[])
    router.refresh()
  }

  const guardar = async () => {
    setError('')
    const anterior = editando && editando !== 'nuevo' ? lista.find(e => e.id === editando) ?? null : null
    const problema = validarEspacio(campos, anterior?.web ?? null)
    if (problema) { setError(problema); return }

    setOcupado(true)
    const supabase = createClient()
    const fila = filaDeFormulario(campos)
    const { error: err } = editando === 'nuevo'
      ? await supabase.from('espacios_escenicos').insert({ ...fila, estado: 'borrador' })
      : await supabase.from('espacios_escenicos').update(fila).eq('id', editando as string)
    setOcupado(false)
    if (err) { setError(err.message); return }

    setAviso(editando === 'nuevo' ? 'Creado en borrador: publícalo cuando esté listo.' : 'Cambios guardados.')
    setEditando(null)
    await recargar()
  }

  const cambiarEstado = async (e: EspacioAdmin, estado: EspacioAdmin['estado']) => {
    if (estado === 'retirado' && !window.confirm(`¿Retirar «${e.nombre}»? Dejará de verse en la web.`)) return
    setError('')
    setAviso('')
    setOcupado(true)
    const { error: err } = await createClient().from('espacios_escenicos').update({ estado }).eq('id', e.id)
    setOcupado(false)
    if (err) { setError(err.message); return }
    setAviso(`«${e.nombre}»: ${ESTADOS.find(x => x.value === estado)?.label.toLowerCase()}. La web lo reflejará en unos minutos.`)
    await recargar()
  }

  return (
    <section aria-labelledby="catalogo-titulo" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <h2 id="catalogo-titulo" style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)' }}>
          Catálogo
          <span style={{ fontFamily: 'var(--sans)', fontSize: '13px', color: 'var(--muted)', marginLeft: '10px' }}>
            {recuento('publicado')} publicados · {recuento('borrador')} en borrador · {recuento('retirado')} retirados
          </span>
        </h2>
        {editando === null && (
          <button type="button" className="ds-btn-primary" style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }} onClick={() => abrir(null)}>
            Nuevo espacio
          </button>
        )}
      </div>

      {aviso && <div className="ds-alert-success">{aviso}</div>}
      {error && editando === null && <div className="ds-alert-error">{error}</div>}

      {editando !== null && (
        <article className="account-card">
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--black)', marginBottom: '14px' }}>
            {editando === 'nuevo' ? 'Nuevo espacio' : 'Editar espacio'}
          </h3>
          <div className="ds-form-grid">
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-nombre">Nombre *</label>
              <input id="esp-nombre" className="ds-input" maxLength={MAX_NOMBRE} value={campos.nombre} onChange={e => set('nombre', e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-tipo-f">Tipo *</label>
              <select id="esp-tipo-f" className="ds-select" value={campos.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-pais-f">País *</label>
              <select id="esp-pais-f" className="ds-select" value={campos.pais_code}
                onChange={e => setCampos(p => ({ ...p, pais_code: e.target.value, region: '' }))}>
                {COUNTRIES.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-region-f">Región *</label>
              <select id="esp-region-f" className="ds-select" value={campos.region} onChange={e => set('region', e.target.value)}>
                <option value="">Elige una región</option>
                {regionesForm.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-provincia">Provincia</label>
              <input id="esp-provincia" className="ds-input" value={campos.provincia} onChange={e => set('provincia', e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-isla">Isla</label>
              <input id="esp-isla" className="ds-input" value={campos.isla} onChange={e => set('isla', e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-municipio-f">Municipio *</label>
              <input id="esp-municipio-f" className="ds-input" maxLength={MAX_MUNICIPIO} value={campos.municipio} onChange={e => set('municipio', e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-direccion">Dirección</label>
              <input id="esp-direccion" className="ds-input" maxLength={MAX_DIRECCION} value={campos.direccion} onChange={e => set('direccion', e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-cp">Código postal</label>
              <input id="esp-cp" className="ds-input" maxLength={10} value={campos.codigo_postal} onChange={e => set('codigo_postal', e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-lat">Latitud *</label>
              <input id="esp-lat" className="ds-input" inputMode="decimal" placeholder="28.46595" value={campos.lat} onChange={e => set('lat', e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-lon">Longitud *</label>
              <input id="esp-lon" className="ds-input" inputMode="decimal" placeholder="-16.25066" value={campos.lon} onChange={e => set('lon', e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-web">Web (https)</label>
              <input id="esp-web" className="ds-input" placeholder="https://" value={campos.web} onChange={e => set('web', e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-telefono">Teléfono general</label>
              <input id="esp-telefono" className="ds-input" inputMode="tel" placeholder="+34 922 000 000" value={campos.telefono} onChange={e => set('telefono', e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-email">Email general</label>
              <input id="esp-email" className="ds-input" type="email" placeholder="taquilla@teatro.es" value={campos.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-aforo">Aforo</label>
              <input id="esp-aforo" className="ds-input" inputMode="numeric" value={campos.aforo} onChange={e => set('aforo', e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-salas">Número de salas</label>
              <input id="esp-salas" className="ds-input" inputMode="numeric" value={campos.num_salas} onChange={e => set('num_salas', e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-accesibilidad">Accesibilidad</label>
              <select id="esp-accesibilidad" className="ds-select" value={campos.accesibilidad} onChange={e => set('accesibilidad', e.target.value)}>
                <option value="">Sin dato</option>
                {ACCESIBILIDAD.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-anio">Año de inauguración</label>
              <input id="esp-anio" className="ds-input" inputMode="numeric" maxLength={4} value={campos.anio_inauguracion} onChange={e => set('anio_inauguracion', e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-arquitecto">Arquitecto</label>
              <input id="esp-arquitecto" className="ds-input" maxLength={120} value={campos.arquitecto} onChange={e => set('arquitecto', e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-titularidad">Titularidad</label>
              <select id="esp-titularidad" className="ds-select" value={campos.titularidad} onChange={e => set('titularidad', e.target.value)}>
                <option value="">Sin dato</option>
                {TITULARIDAD.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-wikidata">Wikidata</label>
              <input id="esp-wikidata" className="ds-input" placeholder="Q123" value={campos.wikidata_id} onChange={e => set('wikidata_id', e.target.value)} />
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-fuente">Fuente *</label>
              <select id="esp-fuente" className="ds-select" value={campos.fuente} onChange={e => set('fuente', e.target.value)}>
                {FUENTES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div className="ds-form-group">
              <label className="ds-label" htmlFor="esp-fuente-ref">Referencia en la fuente</label>
              <input id="esp-fuente-ref" className="ds-input" placeholder="node/123 · way/123 · Q123" value={campos.fuente_ref} onChange={e => set('fuente_ref', e.target.value)} />
            </div>
          </div>

          <fieldset style={{ border: 'none', padding: 0, margin: '16px 0 0' }}>
            <legend className="ds-label" style={{ marginBottom: '8px' }}>Redes (URL https de cada red)</legend>
            <div className="ds-form-grid">
              {REDES.map(r => (
                <div key={r.clave} className="ds-form-group">
                  <label className="ds-label" htmlFor={`esp-red-${r.clave}`}>{r.label}</label>
                  <input id={`esp-red-${r.clave}`} className="ds-input" placeholder={`https://${r.dominios[0]}/…`}
                    value={campos.redes[r.clave]} onChange={e => setRed(r.clave, e.target.value)} />
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset style={{ border: 'none', padding: 0, margin: '16px 0 0' }}>
            <legend className="ds-label" style={{ marginBottom: '8px' }}>Foto de cabecera (solo Wikimedia Commons)</legend>
            <div className="ds-form-grid">
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="esp-img">URL de la imagen</label>
                <input id="esp-img" className="ds-input" placeholder="https://upload.wikimedia.org/…" value={campos.imagen_url} onChange={e => set('imagen_url', e.target.value)} />
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="esp-img-fuente">Página en Commons</label>
                <input id="esp-img-fuente" className="ds-input" placeholder="https://commons.wikimedia.org/wiki/File:…" value={campos.imagen_fuente_url} onChange={e => set('imagen_fuente_url', e.target.value)} />
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="esp-img-autor">Autor</label>
                <input id="esp-img-autor" className="ds-input" maxLength={160} value={campos.imagen_autor} onChange={e => set('imagen_autor', e.target.value)} />
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="esp-img-licencia">Licencia</label>
                <input id="esp-img-licencia" className="ds-input" maxLength={60} placeholder="CC BY-SA 4.0" value={campos.imagen_licencia} onChange={e => set('imagen_licencia', e.target.value)} />
              </div>
            </div>
            <p className="ds-form-hint">Con foto, la licencia y la página de Commons son obligatorias: la ficha muestra el crédito.</p>
          </fieldset>

          <div className="ds-form-group" style={{ marginTop: '12px' }}>
            <label className="ds-label" htmlFor="esp-desc">Descripción</label>
            <textarea id="esp-desc" className="ds-textarea" rows={4} maxLength={MAX_DESCRIPCION} value={campos.descripcion} onChange={e => set('descripcion', e.target.value)} />
            <p className="ds-form-hint">{campos.descripcion.length} / {MAX_DESCRIPCION} caracteres</p>
          </div>
          <div className="ds-form-group" style={{ marginTop: '12px', maxWidth: '320px' }}>
            <label className="ds-label" htmlFor="esp-desc-origen">Quién redactó la descripción</label>
            <select id="esp-desc-origen" className="ds-select" value={campos.descripcion_origen} onChange={e => set('descripcion_origen', e.target.value)}>
              <option value="">Sin indicar</option>
              {DESCRIPCION_ORIGEN.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </div>

          {error && <div className="ds-alert-error" style={{ marginTop: '12px' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="ds-btn-primary" disabled={ocupado} style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }} onClick={guardar}>
              {ocupado ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className="ds-btn-secondary" disabled={ocupado} style={{ padding: '9px 18px', fontSize: '13px' }}
              onClick={() => { setEditando(null); setError('') }}>
              Cancelar
            </button>
          </div>
          <p className="ds-form-hint" style={{ marginTop: '8px' }}>
            Guardar no publica: el estado se cambia con los botones de cada fila. El slug (la URL) se crea al dar de alta y no cambia.
          </p>
        </article>
      )}

      <div className="account-card">
        <div className="ds-form-grid">
          <div className="ds-form-group">
            <label className="ds-label" htmlFor="adm-estado">Estado</label>
            <select id="adm-estado" className="ds-select" value={fEstado} onChange={e => setFEstado(e.target.value)}>
              <option value="">Todos</option>
              {ESTADOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="ds-form-group">
            <label className="ds-label" htmlFor="adm-pais">País</label>
            <select id="adm-pais" className="ds-select" value={fPais} onChange={e => { setFPais(e.target.value); setFRegion('') }}>
              <option value="">Todos</option>
              {COUNTRIES.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </div>
          <div className="ds-form-group">
            <label className="ds-label" htmlFor="adm-region">Región</label>
            <select id="adm-region" className="ds-select" value={fRegion} disabled={!fPais} onChange={e => setFRegion(e.target.value)}>
              <option value="">Todas</option>
              {regionesFiltro.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="ds-form-group">
            <label className="ds-label" htmlFor="adm-tipo">Tipo</label>
            <select id="adm-tipo" className="ds-select" value={fTipo} onChange={e => setFTipo(e.target.value)}>
              <option value="">Todos</option>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="ds-form-group">
            <label className="ds-label" htmlFor="adm-texto">Nombre o municipio</label>
            <input id="adm-texto" className="ds-input" type="search" value={fTexto} onChange={e => setFTexto(e.target.value)} />
          </div>
        </div>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
        {filtrada.length} {filtrada.length === 1 ? 'espacio' : 'espacios'}
        {filtrada.length > MAX_FILAS && ` (se muestran los ${MAX_FILAS} primeros; afina los filtros)`}
      </p>

      {filtrada.slice(0, MAX_FILAS).map(e => {
        const fuente = urlFuente(e.fuente, e.fuente_ref)
        const gestor = e.gestionado_por ? personas[e.gestionado_por] : null
        return (
          <article key={e.id} className="account-card" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <p style={{ fontSize: '15px', color: 'var(--black)', fontWeight: 500 }}>
                {e.estado === 'publicado'
                  ? <a href={`/espacios/${e.slug}`} target="_blank" rel="noopener" className="table-link">{e.nombre}</a>
                  : e.nombre}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {etiquetaTipo(e.tipo)} · {e.municipio}{e.isla ? ` (${e.isla})` : ''} · {e.region}
                {' · '}
                {fuente
                  ? <a href={fuente} target="_blank" rel="noopener" className="table-link">{FUENTES.find(f => f.value === e.fuente)?.label}</a>
                  : FUENTES.find(f => f.value === e.fuente)?.label}
                {e.web?.startsWith('http://') && ' · web sin https'}
              </p>
              {e.verificado && <span className="esp-sello" style={{ marginTop: '4px' }}>Ficha verificada</span>}
              {e.gestionado_por && (
                <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Gestionado por {gestor ? `${gestor.nombre} (${gestor.email})` : 'un perfil'}
                </p>
              )}
            </div>
            <span className={`status-pill ${e.estado === 'publicado' ? 'status-pill--published' : 'status-pill--draft'}`}>
              {ESTADOS.find(s => s.value === e.estado)?.label ?? e.estado}
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button type="button" className="ds-btn-secondary" disabled={ocupado} style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => abrir(e)}>
                Editar
              </button>
              {ESTADOS.filter(s => s.value !== e.estado).map(s => (
                <button key={s.value} type="button" disabled={ocupado}
                  className={s.value === 'publicado' ? 'ds-btn-primary' : 'ds-btn-secondary'}
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
                  onClick={() => cambiarEstado(e, s.value)}>
                  {s.value === 'publicado' ? 'Publicar' : s.value === 'borrador' ? 'A borrador' : 'Retirar'}
                </button>
              ))}
            </div>
          </article>
        )
      })}
    </section>
  )
}
