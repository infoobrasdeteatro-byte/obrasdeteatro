'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'
import { TIPOS_ENTIDAD, TIPOS_REMUNERACION, GENEROS_ESCENICOS, MODALIDADES, IDIOMAS } from './vocabulario'

type Casting = Database['public']['Tables']['castings']['Row']

export type Categoria = { id: string; etiqueta: string }

/**
 * Formulario de convocatoria, compartido por creación y edición.
 *
 * Una sola pieza para los dos modos, a diferencia de Obras (que tiene
 * NuevaObraForm y EditarObraForm separados): aquí son treinta campos con sus
 * validaciones, y mantener dos copias sincronizadas sería una fuente seria de
 * divergencia.
 *
 * No duplica NINGUNA regla de negocio. El plan de pago, el filtro de
 * contenido, el cupo por plan y quién puede fijar `publicado` viven en la base
 * de datos y siguen decidiendo allí; este formulario solo valida lo que el
 * usuario puede corregir antes de enviar y enseña lo que el servidor responde.
 *
 * Las categorías tampoco viven aquí: llegan de public.casting_categorias, de
 * modo que ampliar el vocabulario es un INSERT y no un despliegue.
 */

type Campos = {
  titulo: string
  nombre_proyecto: string
  entidad_organizadora: string
  tipo_entidad: string
  descripcion: string
  sinopsis: string
  categorias: string[]
  tipo_otro: string
  perfil_nombre: string
  perfil_descripcion: string
  edad_min: string
  edad_max: string
  genero_escenico: string
  idiomas_requeridos: string[]
  experiencia_requerida: string
  formacion_requerida: string
  habilidades_especiales: string
  tipo_remuneracion: string
  importe: string
  fechas_previstas: string
  lugar_trabajo: string
  pais: string
  ciudad: string
  fecha_apertura: string
  fecha_cierre: string
  modalidad: string
  descripcion_proceso: string
  forma_candidatura: string
  email_recepcion: string
  url_externa: string
  telefono_contacto: string
}

function camposIniciales(casting?: Casting): Campos {
  return {
    titulo: casting?.titulo ?? '',
    nombre_proyecto: casting?.nombre_proyecto ?? '',
    entidad_organizadora: casting?.entidad_organizadora ?? '',
    tipo_entidad: casting?.tipo_entidad ?? '',
    descripcion: casting?.descripcion ?? '',
    sinopsis: casting?.sinopsis ?? '',
    categorias: casting?.categorias ?? [],
    tipo_otro: casting?.tipo_otro ?? '',
    perfil_nombre: casting?.perfil_nombre ?? '',
    perfil_descripcion: casting?.perfil_descripcion ?? '',
    edad_min: casting?.edad_min?.toString() ?? '',
    edad_max: casting?.edad_max?.toString() ?? '',
    genero_escenico: casting?.genero_escenico ?? '',
    idiomas_requeridos: casting?.idiomas_requeridos ?? [],
    experiencia_requerida: casting?.experiencia_requerida ?? '',
    formacion_requerida: casting?.formacion_requerida ?? '',
    habilidades_especiales: casting?.habilidades_especiales ?? '',
    tipo_remuneracion: casting?.tipo_remuneracion ?? '',
    importe: casting?.importe ?? '',
    fechas_previstas: casting?.fechas_previstas ?? '',
    lugar_trabajo: casting?.lugar_trabajo ?? '',
    pais: casting?.pais ?? '',
    ciudad: casting?.ciudad ?? '',
    fecha_apertura: casting?.fecha_apertura ?? '',
    fecha_cierre: casting?.fecha_cierre ?? '',
    modalidad: casting?.modalidad ?? '',
    descripcion_proceso: casting?.descripcion_proceso ?? '',
    forma_candidatura: casting?.forma_candidatura ?? '',
    email_recepcion: casting?.email_recepcion ?? '',
    url_externa: casting?.url_externa ?? '',
    telefono_contacto: casting?.telefono_contacto ?? '',
  }
}

/** Devuelve el primer problema que el usuario puede arreglar, o null. */
function validar(c: Campos): string | null {
  if (c.categorias.length === 0) {
    return 'Marca al menos una categoría de proyecto.'
  }

  if (c.categorias.includes('otro') && c.tipo_otro.trim() === '') {
    return 'Has marcado «Otro»: describe de qué tipo de proyecto se trata.'
  }

  if (c.tipo_remuneracion === '') {
    return 'Indica la condición económica de la convocatoria.'
  }

  if (c.edad_min && c.edad_max && Number(c.edad_min) > Number(c.edad_max)) {
    return 'La edad mínima no puede ser mayor que la máxima.'
  }

  if (!c.fecha_apertura || !c.fecha_cierre) {
    return 'Indica las fechas de apertura y cierre de la convocatoria.'
  }

  if (c.fecha_cierre <= c.fecha_apertura) {
    return 'La fecha de cierre debe ser posterior a la de apertura.'
  }

  const hoy = new Date().toISOString().slice(0, 10)
  if (c.fecha_cierre < hoy) {
    return 'La fecha de cierre ya ha pasado. Elige una fecha futura.'
  }

  const sinContacto =
    c.email_recepcion.trim() === '' &&
    c.url_externa.trim() === '' &&
    c.telefono_contacto.trim() === ''
  if (sinContacto) {
    return 'Indica al menos un medio de contacto: email, URL o teléfono. Sin ninguno, nadie puede presentarse.'
  }

  return null
}

/** Traduce los campos del formulario a la fila de `castings`. */
function aFila(c: Campos, userId: string) {
  const vacioANulo = (v: string) => (v.trim() === '' ? null : v.trim())

  return {
    user_id: userId,
    titulo: c.titulo.trim(),
    nombre_proyecto: c.nombre_proyecto.trim(),
    entidad_organizadora: c.entidad_organizadora.trim(),
    tipo_entidad: vacioANulo(c.tipo_entidad),
    descripcion: c.descripcion.trim(),
    sinopsis: vacioANulo(c.sinopsis),
    categorias: c.categorias,
    // `tipo_otro` solo tiene sentido acompañando a la categoría 'otro'.
    tipo_otro: c.categorias.includes('otro') ? vacioANulo(c.tipo_otro) : null,
    perfil_nombre: c.perfil_nombre.trim(),
    perfil_descripcion: c.perfil_descripcion.trim(),
    edad_min: c.edad_min ? Number(c.edad_min) : null,
    edad_max: c.edad_max ? Number(c.edad_max) : null,
    genero_escenico: vacioANulo(c.genero_escenico),
    idiomas_requeridos: c.idiomas_requeridos.length > 0 ? c.idiomas_requeridos : null,
    experiencia_requerida: vacioANulo(c.experiencia_requerida),
    formacion_requerida: vacioANulo(c.formacion_requerida),
    habilidades_especiales: vacioANulo(c.habilidades_especiales),
    tipo_remuneracion: c.tipo_remuneracion,
    // El importe solo existe si la convocatoria es remunerada: si se cambia a
    // otra condición, se borra en vez de quedar un importe huérfano.
    importe: c.tipo_remuneracion === 'remunerado' ? vacioANulo(c.importe) : null,
    fechas_previstas: vacioANulo(c.fechas_previstas),
    lugar_trabajo: vacioANulo(c.lugar_trabajo),
    pais: vacioANulo(c.pais),
    ciudad: vacioANulo(c.ciudad),
    fecha_apertura: c.fecha_apertura,
    fecha_cierre: c.fecha_cierre,
    modalidad: vacioANulo(c.modalidad),
    descripcion_proceso: vacioANulo(c.descripcion_proceso),
    forma_candidatura: vacioANulo(c.forma_candidatura),
    email_recepcion: vacioANulo(c.email_recepcion),
    url_externa: vacioANulo(c.url_externa),
    telefono_contacto: vacioANulo(c.telefono_contacto),
  }
}

export default function CastingForm({
  userId,
  categorias,
  casting,
}: {
  userId: string
  categorias: Categoria[]
  casting?: Casting
}) {
  const router = useRouter()
  const editando = casting !== undefined

  const [c, setC] = useState<Campos>(() => camposIniciales(casting))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [exito, setExito] = useState('')

  const set = <K extends keyof Campos>(campo: K, valor: Campos[K]) =>
    setC(previo => ({ ...previo, [campo]: valor }))

  const alternarEnLista = (campo: 'categorias' | 'idiomas_requeridos', valor: string) =>
    setC(previo => ({
      ...previo,
      [campo]: previo[campo].includes(valor)
        ? previo[campo].filter(v => v !== valor)
        : [...previo[campo], valor],
    }))

  const limpiarMensajes = () => {
    setError('')
    setAviso('')
    setExito('')
  }

  /**
   * Guarda el formulario. `publicar` decide si además se envía a revisión, en
   * la MISMA escritura: así el usuario no tiene que guardar primero y buscar
   * el borrador después, y no se pierde ninguna edición por el camino.
   */
  const guardar = async (publicar: boolean) => {
    limpiarMensajes()

    const problema = validar(c)
    if (problema) {
      setError(problema)
      return
    }

    setGuardando(true)
    const supabase = createClient()
    const fila = aFila(c, userId)
    // Al crear sin publicar no se fija `estado`: el DEFAULT de la columna es
    // 'borrador'. Al publicar se pide 'pendiente_revision' y decide el trigger.
    const datos = publicar ? { ...fila, estado: 'pendiente_revision' } : fila

    if (!editando) {
      const { data, error: errorInsert } = await supabase
        .from('castings')
        .insert(datos)
        .select('id, estado, motivo_filtro')
        .single()

      setGuardando(false)

      if (errorInsert || !data) {
        setError(mensajeDeError(errorInsert?.message))
        return
      }

      const resultado = !publicar ? 'borrador' : data.estado === 'publicado' ? 'publicado' : 'revision'
      router.push(`/castings/${data.id}/editar?nuevo=${resultado}`)
      return
    }

    const { data, error: errorUpdate } = await supabase
      .from('castings')
      .update(datos)
      .eq('id', casting.id)
      .select('estado, motivo_filtro')
      .single()

    setGuardando(false)

    if (errorUpdate || !data) {
      setError(mensajeDeError(errorUpdate?.message))
      return
    }

    // Se informa de lo que el servidor decidió, no de lo que se pidió: el
    // trigger puede haber publicado, retenido, o devuelto a revisión un
    // casting publicado cuyo texto cambió.
    if (data.estado === 'publicado') {
      setExito(publicar ? 'Publicado. Tu convocatoria ya es visible.' : 'Cambios guardados.')
    } else if (casting.estado === 'publicado' && data.estado === 'pendiente_revision') {
      setAviso(
        data.motivo_filtro
          ? `Este casting vuelve a revisión porque cambiaste su contenido, y el filtro automático ha señalado: ${data.motivo_filtro}`
          : 'Este casting vuelve a revisión porque cambiaste su contenido. Se publicará de nuevo en cuanto se revise.'
      )
    } else if (publicar) {
      setAviso(
        data.motivo_filtro
          ? `En revisión. El filtro automático ha señalado: ${data.motivo_filtro}. No está rechazada: alguien del equipo la revisará.`
          : 'En revisión. Alguien del equipo la revisará antes de publicarla.'
      )
    } else {
      setExito('Cambios guardados.')
    }

    router.refresh()
  }

  const esBorrador = !editando || casting.estado === 'borrador'
  const puedeReenviar = editando && casting.estado !== 'borrador' && casting.estado !== 'publicado'

  return (
    <form onSubmit={e => { e.preventDefault(); guardar(false) }} className="account-card ds-form">

      <Seccion titulo="Datos del proyecto" />

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="titulo">Título de la convocatoria *</label>
        <input id="titulo" className="ds-input" required maxLength={200}
          value={c.titulo} onChange={e => set('titulo', e.target.value)}
          placeholder="Reparto para montaje de cámara" />
      </div>

      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="nombre_proyecto">Nombre del proyecto *</label>
          <input id="nombre_proyecto" className="ds-input" required maxLength={200}
            value={c.nombre_proyecto} onChange={e => set('nombre_proyecto', e.target.value)} />
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="entidad_organizadora">Entidad organizadora *</label>
          <input id="entidad_organizadora" className="ds-input" required maxLength={200}
            value={c.entidad_organizadora} onChange={e => set('entidad_organizadora', e.target.value)} />
        </div>
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="tipo_entidad">Tipo de entidad</label>
        <select id="tipo_entidad" className="ds-select"
          value={c.tipo_entidad} onChange={e => set('tipo_entidad', e.target.value)}>
          <option value="">— Seleccionar —</option>
          {TIPOS_ENTIDAD.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <p className="ds-form-hint">
          Se elige en cada convocatoria: un mismo perfil puede publicar en nombre de entidades distintas.
        </p>
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="descripcion">Descripción *</label>
        <textarea id="descripcion" className="ds-textarea" required rows={5} maxLength={4000}
          value={c.descripcion} onChange={e => set('descripcion', e.target.value)}
          placeholder="En qué consiste el proyecto y qué se busca." />
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="sinopsis">Sinopsis</label>
        <textarea id="sinopsis" className="ds-textarea" rows={3} maxLength={2000}
          value={c.sinopsis} onChange={e => set('sinopsis', e.target.value)} />
      </div>

      <Seccion titulo="Categorías" />

      <div className="ds-form-group">
        <span className="ds-label">Marca al menos una *</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
          {categorias.map(cat => (
            <Casilla
              key={cat.id}
              id={`cat-${cat.id}`}
              etiqueta={cat.etiqueta}
              valor={c.categorias.includes(cat.id)}
              onChange={() => alternarEnLista('categorias', cat.id)}
            />
          ))}
        </div>
        {categorias.length === 0 && (
          <p className="ds-form-hint">No hay categorías activas configuradas.</p>
        )}
      </div>

      {c.categorias.includes('otro') && (
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="tipo_otro">¿Qué tipo de proyecto? *</label>
          <input id="tipo_otro" className="ds-input" maxLength={120}
            value={c.tipo_otro} onChange={e => set('tipo_otro', e.target.value)}
            placeholder="Instalación, teatro documental…" />
        </div>
      )}

      <Seccion titulo="Perfil buscado" />

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="perfil_nombre">Perfil *</label>
        <input id="perfil_nombre" className="ds-input" required maxLength={200}
          value={c.perfil_nombre} onChange={e => set('perfil_nombre', e.target.value)}
          placeholder="Intérprete, bailarín/a, figuración…" />
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="perfil_descripcion">Descripción del perfil *</label>
        <textarea id="perfil_descripcion" className="ds-textarea" required rows={4} maxLength={2000}
          value={c.perfil_descripcion} onChange={e => set('perfil_descripcion', e.target.value)} />
      </div>

      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="edad_min">Edad mínima</label>
          <input id="edad_min" className="ds-input" type="number" min={0} max={120}
            value={c.edad_min} onChange={e => set('edad_min', e.target.value)} />
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="edad_max">Edad máxima</label>
          <input id="edad_max" className="ds-input" type="number" min={0} max={120}
            value={c.edad_max} onChange={e => set('edad_max', e.target.value)} />
        </div>
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="genero_escenico">Género escénico</label>
        <select id="genero_escenico" className="ds-select"
          value={c.genero_escenico} onChange={e => set('genero_escenico', e.target.value)}>
          <option value="">— Seleccionar —</option>
          {GENEROS_ESCENICOS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="ds-form-group">
        <span className="ds-label">Idiomas requeridos</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
          {IDIOMAS.map(i => (
            <Casilla
              key={i.value}
              id={`idioma-${i.value}`}
              etiqueta={i.label}
              valor={c.idiomas_requeridos.includes(i.value)}
              onChange={() => alternarEnLista('idiomas_requeridos', i.value)}
            />
          ))}
        </div>
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="experiencia_requerida">Experiencia requerida</label>
        <textarea id="experiencia_requerida" className="ds-textarea" rows={2} maxLength={1000}
          value={c.experiencia_requerida} onChange={e => set('experiencia_requerida', e.target.value)} />
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="formacion_requerida">Formación requerida</label>
        <textarea id="formacion_requerida" className="ds-textarea" rows={2} maxLength={1000}
          value={c.formacion_requerida} onChange={e => set('formacion_requerida', e.target.value)} />
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="habilidades_especiales">Habilidades especiales</label>
        <textarea id="habilidades_especiales" className="ds-textarea" rows={2} maxLength={1000}
          value={c.habilidades_especiales} onChange={e => set('habilidades_especiales', e.target.value)}
          placeholder="Canto, esgrima, acrobacia, carné de conducir…" />
      </div>

      <Seccion titulo="Condiciones económicas" />

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="tipo_remuneracion">Condición económica *</label>
        <select id="tipo_remuneracion" className="ds-select" required
          value={c.tipo_remuneracion} onChange={e => set('tipo_remuneracion', e.target.value)}>
          <option value="">— Seleccionar —</option>
          {TIPOS_REMUNERACION.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {c.tipo_remuneracion === 'remunerado' && (
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="importe">Importe</label>
          <input id="importe" className="ds-input" maxLength={200}
            value={c.importe} onChange={e => set('importe', e.target.value)}
            placeholder="150 €/función, según convenio…" />
        </div>
      )}

      <Seccion titulo="Fechas y lugar" />

      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="fecha_apertura">Apertura de la convocatoria *</label>
          <input id="fecha_apertura" className="ds-input" type="date" required
            value={c.fecha_apertura} onChange={e => set('fecha_apertura', e.target.value)} />
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="fecha_cierre">Cierre *</label>
          <input id="fecha_cierre" className="ds-input" type="date" required
            value={c.fecha_cierre} onChange={e => set('fecha_cierre', e.target.value)} />
          <p className="ds-form-hint">Al pasar esta fecha, la convocatoria se cierra sola.</p>
        </div>
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="fechas_previstas">Fechas previstas de trabajo</label>
        <input id="fechas_previstas" className="ds-input" maxLength={300}
          value={c.fechas_previstas} onChange={e => set('fechas_previstas', e.target.value)}
          placeholder="Ensayos de enero a marzo, funciones en abril" />
      </div>

      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="pais">País</label>
          <input id="pais" className="ds-input" maxLength={100}
            value={c.pais} onChange={e => set('pais', e.target.value)} />
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="ciudad">Ciudad</label>
          <input id="ciudad" className="ds-input" maxLength={100}
            value={c.ciudad} onChange={e => set('ciudad', e.target.value)} />
        </div>
      </div>

      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="lugar_trabajo">Lugar de trabajo</label>
          <input id="lugar_trabajo" className="ds-input" maxLength={300}
            value={c.lugar_trabajo} onChange={e => set('lugar_trabajo', e.target.value)} />
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="modalidad">Modalidad</label>
          <select id="modalidad" className="ds-select"
            value={c.modalidad} onChange={e => set('modalidad', e.target.value)}>
            <option value="">— Seleccionar —</option>
            {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <Seccion titulo="Cómo presentarse" />

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="descripcion_proceso">Descripción del proceso</label>
        <textarea id="descripcion_proceso" className="ds-textarea" rows={3} maxLength={2000}
          value={c.descripcion_proceso} onChange={e => set('descripcion_proceso', e.target.value)}
          placeholder="Primera sesión de lectura, segunda con dirección…" />
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="forma_candidatura">Forma de candidatura</label>
        <textarea id="forma_candidatura" className="ds-textarea" rows={2} maxLength={1000}
          value={c.forma_candidatura} onChange={e => set('forma_candidatura', e.target.value)}
          placeholder="Qué enviar: CV, book, videobook…" />
      </div>

      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="email_recepcion">Email de recepción</label>
          <input id="email_recepcion" className="ds-input" type="email" maxLength={200}
            value={c.email_recepcion} onChange={e => set('email_recepcion', e.target.value)} />
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="url_externa">URL externa</label>
          <input id="url_externa" className="ds-input" type="url" maxLength={500}
            value={c.url_externa} onChange={e => set('url_externa', e.target.value)}
            placeholder="https://" />
        </div>
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="telefono_contacto">Teléfono de contacto</label>
        <input id="telefono_contacto" className="ds-input" type="tel" maxLength={40}
          value={c.telefono_contacto} onChange={e => set('telefono_contacto', e.target.value)}
          placeholder="+34 600 000 000" />
        <p className="ds-form-hint">Puede ser un número de WhatsApp.</p>
      </div>

      <p className="ds-form-hint" style={{ marginTop: '-8px' }}>
        Rellena al menos uno de los tres: es por donde te llegarán las candidaturas.
      </p>

      {error && <div className="ds-alert-error">{error}</div>}
      {aviso && (
        <div className="ds-status-banner ds-status-banner--draft">
          <div className="ds-status-title">{aviso}</div>
        </div>
      )}
      {exito && <div className="ds-alert-success">{exito}</div>}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>

        {esBorrador && (
          <button type="button" className="ds-btn-primary" disabled={guardando}
            style={{ width: 'auto', padding: '12px 24px' }}
            onClick={() => guardar(true)}>
            {guardando ? 'Publicando…' : 'Publicar convocatoria'}
          </button>
        )}

        {puedeReenviar && (
          <button type="button" className="ds-btn-primary" disabled={guardando}
            style={{ width: 'auto', padding: '12px 24px' }}
            onClick={() => guardar(true)}>
            {guardando
              ? 'Enviando…'
              : casting.estado === 'rechazado' ? 'Reenviar a revisión' : 'Enviar a publicar'}
          </button>
        )}

        <button type="submit" className="ds-btn-secondary" disabled={guardando}>
          {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar como borrador'}
        </button>

        <Link href="/mis-castings" className="ds-btn-secondary" style={{ flex: 'none' }}>
          Volver a mis castings
        </Link>
      </div>

      {esBorrador && (
        <p className="ds-form-hint">
          «Publicar convocatoria» la guarda y la envía a revisión en un solo paso. Si el texto no
          levanta ninguna alerta y tu plan tiene cupo, se publica al instante.
        </p>
      )}

    </form>
  )
}

/** Los errores de la base de datos llegan crudos; aquí se vuelven legibles. */
function mensajeDeError(mensaje?: string): string {
  if (!mensaje) return 'No se pudo guardar. Inténtalo de nuevo.'

  if (mensaje.includes('Límite de castings activos')) return mensaje

  if (mensaje.includes('row-level security')) {
    return 'Tu plan actual no permite crear convocatorias. Revisa tu plan para publicar castings.'
  }

  return `No se pudo guardar: ${mensaje}`
}

function Seccion({ titulo }: { titulo: string }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginTop: '8px' }}>
      <span className="obras-stat-label">{titulo}</span>
    </div>
  )
}

function Casilla({
  id, etiqueta, valor, onChange,
}: {
  id: string
  etiqueta: string
  valor: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label htmlFor={id}
      style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
      <input type="checkbox" id={id} checked={valor}
        onChange={e => onChange(e.target.checked)}
        style={{ width: '15px', height: '15px', accentColor: 'var(--black)', cursor: 'pointer' }} />
      {etiqueta}
    </label>
  )
}
