'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/geo/countries'
import { MAX_RESUMEN, MAX_TITULAR, esUrlHttp } from '@/lib/noticias/importacion'

type Opcion = { id: string; etiqueta: string }
type FuenteActiva = { id: string; nombre: string; pais_code: string }

type Campos = {
  fuente_id: string
  categoria_id: string
  pais_code: string
  titular: string
  resumen: string
  url_original: string
  fecha_original: string
  publicar: boolean
}

const VACIO: Campos = {
  fuente_id: '',
  categoria_id: '',
  pais_code: '',
  titular: '',
  resumen: '',
  url_original: '',
  fecha_original: '',
  publicar: false,
}

/**
 * Alta manual de una noticia (modelo: ConvocatoriaForm), para fuentes públicas
 * sin RSS. Origen 'manual'.
 *
 * NO DUPLICA REGLAS DE NEGOCIO. Que solo moderación publique, el límite de 3
 * al día y la fuente activa los decide noticias_guarda(); la URL duplicada, el
 * índice único. Aquí solo se valida lo que quien escribe puede corregir antes
 * de enviar, y después se enseña lo que la base respondió.
 */
export default function AltaManualForm({
  fuentes,
  categorias,
  limiteAgotado,
}: {
  fuentes: FuenteActiva[]
  categorias: Opcion[]
  limiteAgotado: boolean
}) {
  const router = useRouter()
  const [c, setC] = useState<Campos>(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const set = <K extends keyof Campos>(k: K, v: Campos[K]) => setC(p => ({ ...p, [k]: v }))

  // Al elegir la fuente se propone su país; se puede cambiar.
  const elegirFuente = (id: string) => {
    const f = fuentes.find(x => x.id === id)
    setC(p => ({ ...p, fuente_id: id, pais_code: p.pais_code || f?.pais_code || '' }))
  }

  const validar = (): string | null => {
    if (!c.fuente_id) return 'Elige la fuente.'
    if (!c.categoria_id) return 'Elige la categoría.'
    if (!c.pais_code) return 'Elige el país.'
    if (c.titular.trim() === '') return 'La noticia necesita un titular.'
    if (c.resumen.trim() === '') return 'La noticia necesita un resumen propio.'
    if (c.resumen.trim().length > MAX_RESUMEN) return `El resumen no puede pasar de ${MAX_RESUMEN} caracteres.`
    if (!esUrlHttp(c.url_original.trim())) return 'La URL original debe empezar por http:// o https://.'
    return null
  }

  const enviar = async () => {
    setError('')
    setExito('')
    const problema = validar()
    if (problema) {
      setError(problema)
      return
    }

    setGuardando(true)
    const { data, error: err } = await createClient()
      .from('noticias')
      .insert({
        fuente_id: c.fuente_id,
        categoria_id: c.categoria_id,
        pais_code: c.pais_code,
        titular: c.titular.trim(),
        resumen: c.resumen.trim(),
        url_original: c.url_original.trim(),
        // Solo el día: mediodía UTC para que ninguna zona horaria lo mueva de fecha.
        fecha_original: c.fecha_original ? `${c.fecha_original}T12:00:00.000Z` : null,
        origen: 'manual',
        estado: c.publicar ? 'publicada' : 'candidata',
      })
      .select('id, estado')
      .single()
    setGuardando(false)

    if (err || !data) {
      setError(mensajeDeError(err?.message, err?.code))
      return
    }

    setC(VACIO)
    setExito(data.estado === 'publicada'
      ? 'Publicada. Ya aparece en /noticias.'
      : 'Guardada como candidata. Aparece en la cola de arriba.')
    router.refresh()
  }

  const restantes = MAX_RESUMEN - c.resumen.length

  if (fuentes.length === 0) {
    return (
      <div className="obras-empty" style={{ padding: '32px 24px' }}>
        <p className="obras-empty-text" style={{ marginBottom: 0 }}>
          No hay ninguna fuente activa. Activa una en la sección «Fuentes» para poder dar de alta noticias.
        </p>
      </div>
    )
  }

  return (
    <form className="account-card" onSubmit={e => { e.preventDefault(); enviar() }}
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="alta-fuente">Fuente *</label>
          <select id="alta-fuente" className="ds-select" value={c.fuente_id} onChange={e => elegirFuente(e.target.value)}>
            <option value="">Elige una fuente activa</option>
            {fuentes.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
          </select>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="alta-categoria">Categoría *</label>
          <select id="alta-categoria" className="ds-select" value={c.categoria_id} onChange={e => set('categoria_id', e.target.value)}>
            <option value="">Elige una categoría</option>
            {categorias.map(x => <option key={x.id} value={x.id}>{x.etiqueta}</option>)}
          </select>
        </div>
      </div>

      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="alta-pais">País *</label>
          <select id="alta-pais" className="ds-select" value={c.pais_code} onChange={e => set('pais_code', e.target.value)}>
            <option value="">Elige un país</option>
            {COUNTRIES.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
          <p className="ds-form-hint">El país de la noticia, que no tiene por qué ser el de la fuente.</p>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="alta-fecha">Fecha original</label>
          <input id="alta-fecha" type="date" className="ds-input"
            value={c.fecha_original} onChange={e => set('fecha_original', e.target.value)} />
          <p className="ds-form-hint">Opcional: la fecha de la nota en la fuente.</p>
        </div>
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="alta-titular">Titular *</label>
        <input id="alta-titular" className="ds-input" maxLength={MAX_TITULAR}
          value={c.titular} onChange={e => set('titular', e.target.value)}
          placeholder="El INAEM abre la convocatoria de ayudas a la creación escénica 2027" />
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="alta-resumen">Resumen *</label>
        <textarea id="alta-resumen" className="ds-textarea" rows={4} maxLength={MAX_RESUMEN}
          value={c.resumen} onChange={e => set('resumen', e.target.value)}
          placeholder="Resumen breve y propio. No copies el texto de la fuente." />
        <p className="ds-form-hint" aria-live="polite"
          style={{ color: restantes < 40 ? 'var(--red-h)' : undefined }}>
          {c.resumen.length} / {MAX_RESUMEN} caracteres
        </p>
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="alta-url">URL original *</label>
        <input id="alta-url" className="ds-input" type="url" inputMode="url"
          value={c.url_original} onChange={e => set('url_original', e.target.value)}
          placeholder="https://www.cultura.gob.es/actualidad/..." />
      </div>

      <div className="ds-form-group">
        <label htmlFor="alta-publicar"
          style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
          <input type="checkbox" id="alta-publicar" checked={c.publicar}
            onChange={e => set('publicar', e.target.checked)}
            style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: 'var(--black)' }} />
          <span>
            Publicar directamente
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              {limiteAgotado
                ? 'Hoy ya se ha alcanzado el límite de 3: si la marcas, la base rechazará el alta. Déjala como candidata.'
                : 'Si no la marcas, entra como candidata en la cola de revisión.'}
            </span>
          </span>
        </label>
      </div>

      {error && <div className="ds-alert-error">{error}</div>}
      {exito && <div className="ds-alert-success">{exito}</div>}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
        <button type="submit" className="ds-btn-primary" disabled={guardando}
          style={{ width: 'auto', padding: '11px 24px', fontSize: '13px' }}>
          {guardando ? 'Guardando…' : c.publicar ? 'Dar de alta y publicar' : 'Dar de alta como candidata'}
        </button>
      </div>
    </form>
  )
}

/**
 * Los mensajes del trigger (límite diario, fuente inactiva) pasan tal cual.
 * La URL duplicada llega como violación del índice único: se explica.
 */
function mensajeDeError(mensaje?: string, codigo?: string): string {
  if (!mensaje) return 'No se pudo guardar. Inténtalo de nuevo.'
  if (codigo === '23505' || mensaje.includes('noticias_url_original_unica')) {
    return 'Ya hay una noticia con esta URL original (aunque sea con http/https o www distintos).'
  }
  if (mensaje.includes('row-level security')) {
    return 'Tu cuenta no tiene permiso de moderación para dar de alta noticias.'
  }
  if (mensaje.includes('noticias_resumen_longitud')) return `El resumen debe tener entre 1 y ${MAX_RESUMEN} caracteres.`
  if (mensaje.includes('noticias_titular_longitud')) return `El titular debe tener entre 1 y ${MAX_TITULAR} caracteres.`
  return mensaje
}
