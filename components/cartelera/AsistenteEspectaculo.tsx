'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SelectorImagen from '@/app/perfil/SelectorImagen'
import { validarImagen, urlPublica } from '@/lib/perfil-multimedia/multimedia'
import { redimensionarImagen } from '@/lib/perfil-multimedia/redimensionar'
import {
  GENEROS, IDIOMAS, ROLES, TIPOS_OPCION, MONEDAS, MONEDA_PAIS, ZONAS_PAIS, HORAS, MINUTOS, MAX_FUNCIONES_DE_UNA_VEZ,
  BUCKET_CARTELES, CARTEL_MIN_ANCHO, CARTEL_MIN_ALTO,
  aFilaEspectaculo, zonaPorDefecto, etiquetaHora, etiquetaGenero, etiquetaRol, fechaFuncion, precioTexto, fechasRepetidas,
  problemaTamanoCartel, rutaCartel, mensajeErrorCartelera, separarNombres, type CamposEspectaculo,
} from '@/lib/cartelera/cartelera'
import {
  PASOS, estadoInicial, lugarVacio, fechaVacia, opcionVacia, papelVacio, funcionesDelAsistente, opcionesDelAsistente,
  equipoDelAsistente, problemaDelPaso, leerBorradorLocal, tieneContenido,
  type EstadoAsistente, type LugarAsistente, type FechaAsistente, type OpcionAsistente, type PapelAsistente,
} from '@/lib/cartelera/asistente'
import BuscadorSala, { PAISES_CARTELERA } from './BuscadorSala'

/**
 * «Nuevo espectáculo» en 4 pasos, como los asistentes de las ticketeras: no
 * se guarda nada hasta el final («Guardar borrador» o «¡Publicar
 * espectáculo!»). Lo escrito se recuerda en el navegador por si se cierra la
 * pestaña a medias. Las reglas de verdad (revisión, límites del plan) siguen
 * en la base.
 */
export default function AsistenteEspectaculo({ userId, supabaseUrl, verificado }: {
  userId: string; supabaseUrl: string; verificado: boolean
}) {
  const router = useRouter()
  const clave = `asistente-espectaculo:${userId}`
  const [e, setE] = useState<EstadoAsistente>(estadoInicial)
  const [recuperable, setRecuperable] = useState<EstadoAsistente | null>(null)
  const [cartel, setCartel] = useState<File | null>(null)
  const [vistaCartel, setVistaCartel] = useState<string | null>(null)
  const [errorCartel, setErrorCartel] = useState('')
  const [aviso, setAviso] = useState<{ error: string; donde: string | null } | null>(null)
  const [guardando, setGuardando] = useState<null | 'borrador' | 'publicar'>(null)
  const arriba = useRef<HTMLDivElement>(null)

  // ¿Quedó algo a medias en este navegador?
  useEffect(() => {
    try {
      const r = leerBorradorLocal(localStorage.getItem(clave))
      if (r && tieneContenido(r)) setRecuperable(r)
    } catch { /* sin almacenamiento: se empieza de cero */ }
  }, [clave])

  // Se recuerda lo escrito (sin el archivo del cartel).
  useEffect(() => {
    if (recuperable) return
    const t = setTimeout(() => {
      try {
        if (tieneContenido(e)) localStorage.setItem(clave, JSON.stringify(e))
      } catch { /* no pasa nada */ }
    }, 400)
    return () => clearTimeout(t)
  }, [e, clave, recuperable])

  useEffect(() => () => { if (vistaCartel) URL.revokeObjectURL(vistaCartel) }, [vistaCartel])

  // Al corregir cualquier campo, el aviso rojo desaparece.
  const editar = (f: (p: EstadoAsistente) => EstadoAsistente) => { setAviso(null); setE(f) }
  const setDatos = <K extends keyof CamposEspectaculo>(k: K, v: CamposEspectaculo[K]) => editar(p => ({ ...p, datos: { ...p.datos, [k]: v } }))
  const setLugar = (clave: string, cambio: Partial<LugarAsistente>) =>
    editar(p => ({ ...p, lugares: p.lugares.map(l => (l.clave === clave ? { ...l, ...cambio } : l)) }))
  const setFecha = (lugar: string, fecha: string, cambio: Partial<FechaAsistente>) =>
    editar(p => ({ ...p, lugares: p.lugares.map(l => (l.clave !== lugar ? l : { ...l, fechas: l.fechas.map(f => (f.clave === fecha ? { ...f, ...cambio } : f)) })) }))
  const setOpcion = (clave: string, cambio: Partial<OpcionAsistente>) =>
    editar(p => ({ ...p, opciones: p.opciones.map(o => (o.clave === clave ? { ...o, ...cambio } : o)) }))
  const setPapel = (clave: string, cambio: Partial<PapelAsistente>) =>
    editar(p => ({ ...p, equipo: p.equipo.map(x => (x.clave === clave ? { ...x, ...cambio } : x)) }))

  const funciones = useMemo(() => funcionesDelAsistente(e.lugares), [e.lugares])

  const irA = (paso: number) => {
    setAviso(null)
    setE(p => ({ ...p, paso }))
    arriba.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /** Lleva al campo con problema (y lo deja marcado). */
  const marcar = (p: { error: string; donde: string | null }) => {
    setAviso(p)
    requestAnimationFrame(() => {
      const el = p.donde ? document.querySelector(`[data-clave="${p.donde}"]`) : null
      ;(el ?? arriba.current)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const siguiente = () => {
    const p = problemaDelPaso(e.paso, e)
    if (p) { marcar(p); return }
    if (e.paso === 2) {
      // Moneda propuesta según el país de la primera función, si aún no se ha tocado.
      const moneda = MONEDA_PAIS[e.lugares[0]?.pais ?? ''] ?? 'EUR'
      setE(x => ({ ...x, opciones: x.opciones.map(o => (!o.url && !o.precio_desde ? { ...o, moneda } : o)) }))
    }
    irA(e.paso + 1)
  }

  const elegirCartel = async (f: File | null) => {
    setErrorCartel('')
    setCartel(null)
    setVistaCartel(null)
    if (!f) return
    const problema = validarImagen(f)
    if (problema) { setErrorCartel(problema); return }
    try {
      const bmp = await createImageBitmap(f)
      const tam = problemaTamanoCartel(bmp.width, bmp.height)
      bmp.close()
      if (tam) { setErrorCartel(tam); return }
    } catch {
      setErrorCartel('No se pudo leer la imagen.'); return
    }
    setCartel(f)
    setVistaCartel(URL.createObjectURL(f))
  }

  /** Guarda todo de una vez. Con «publicar», además lo envía a publicar. */
  const guardar = async (publicar: boolean) => {
    setAviso(null)
    // Para publicar, todo tiene que estar bien; para el borrador, basta con el paso 1.
    const pasos = publicar ? [1, 2, 3, 4] : [1]
    for (const paso of pasos) {
      const p = problemaDelPaso(paso, e)
      if (p) { if (paso !== e.paso) setE(x => ({ ...x, paso })); marcar(p); return }
    }
    setGuardando(publicar ? 'publicar' : 'borrador')
    const sb = createClient()
    const avisos: string[] = []

    const { data: creado, error: eCrear } = await sb.from('espectaculos')
      .insert({ ...aFilaEspectaculo(e.datos), user_id: userId, estado: 'borrador' }).select('id').single()
    if (eCrear || !creado) { setGuardando(null); marcar({ error: mensajeErrorCartelera(eCrear?.message), donde: null }); return }
    const id = creado.id

    if (cartel) {
      try {
        const { blob, tipo, ext } = await redimensionarImagen(cartel, 1600)
        const ruta = rutaCartel(userId, ext)
        const { error } = await sb.storage.from(BUCKET_CARTELES).upload(ruta, blob, { contentType: tipo })
        if (error) throw error
        const { error: e2 } = await sb.from('espectaculos').update({ cartel_url: urlPublica(supabaseUrl, BUCKET_CARTELES, ruta) }).eq('id', id)
        if (e2) throw e2
      } catch {
        avisos.push('cartel')
      }
    }

    const fns = funcionesDelAsistente(e.lugares)
    if (!fns.error && fns.filas.length) {
      const { error } = await sb.from('funciones').insert(fns.filas.map(f => ({ ...f, espectaculo_id: id })))
      if (error) avisos.push('funciones')
    } else if (fns.error) avisos.push('funciones')

    const ops = opcionesDelAsistente(e.opciones)
    if (!ops.error && ops.filas.length) {
      const { error } = await sb.from('opciones_compra').insert(ops.filas.map((o, i) => ({ ...o, espectaculo_id: id, orden: (i + 1) * 10 })))
      if (error) avisos.push('entradas')
    } else if (ops.error) avisos.push('entradas')

    const eq = equipoDelAsistente(e.equipo)
    if (!eq.error && eq.filas.length) {
      const { error } = await sb.from('espectaculo_personas').insert(eq.filas.map(p => ({ ...p, espectaculo_id: id })))
      if (error) avisos.push('ficha')
    } else if (eq.error) avisos.push('ficha')

    let estado = 'borrador'
    if (publicar && !avisos.includes('funciones')) {
      const { data, error } = await sb.from('espectaculos').update({ estado: 'publicado' }).eq('id', id).select('estado').single()
      if (error) avisos.push(error.message.includes('Tu plan permite') ? 'limite' : 'publicar')
      else estado = data?.estado ?? 'borrador'
    }

    try { localStorage.removeItem(clave) } catch { /* nada */ }
    const q = new URLSearchParams({ creado: estado })
    if (avisos.length) q.set('avisos', avisos.join(','))
    router.push(`/mis-espectaculos/${id}/editar?${q}`)
  }

  const marcado = (donde: string) => (aviso?.donde === donde ? { outline: '2px solid var(--red)', outlineOffset: '4px', borderRadius: '8px' } : undefined)

  // ── Recuperar lo que quedó a medias ──────────────────────────────────────
  if (recuperable) {
    return (
      <div className="account-card cart-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <strong style={{ fontSize: '16px' }}>Tienes un espectáculo a medias en este navegador</strong>
        <p className="ds-form-hint">«{recuperable.datos.titulo || 'Sin título'}». ¿Quieres seguir donde lo dejaste? El cartel hay que volver a elegirlo.</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" className="ds-btn-primary" style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }}
            onClick={() => { setE(recuperable); setRecuperable(null) }}>Continuar</button>
          <button type="button" className="ds-btn-secondary" style={{ padding: '10px 20px', fontSize: '13px' }}
            onClick={() => { try { localStorage.removeItem(clave) } catch { /* nada */ } setRecuperable(null) }}>Empezar de nuevo</button>
        </div>
      </div>
    )
  }

  return (
    <div ref={arriba} style={{ display: 'flex', flexDirection: 'column', gap: '16px', scrollMarginTop: '80px' }}>
      <ol className="asis-pasos" aria-label="Pasos">
        {PASOS.map((t, i) => {
          const n = i + 1
          const estado = n === e.paso ? 'actual' : n < e.paso ? 'hecho' : 'pendiente'
          return (
            <li key={t} className={`asis-paso asis-paso--${estado}`} aria-current={n === e.paso ? 'step' : undefined}>
              <button type="button" disabled={n >= e.paso} onClick={() => irA(n)}>
                <span className="asis-paso-n">{n < e.paso ? '✓' : n}</span>
                <span className="asis-paso-t">{t}</span>
              </button>
            </li>
          )
        })}
      </ol>

      <section className="account-card cart-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* ── Paso 1 ───────────────────────────────────────────────────── */}
        {e.paso === 1 && (
          <>
            <h2 className="asis-titulo">1 · El espectáculo</h2>
            <div data-clave="datos" style={{ display: 'flex', flexDirection: 'column', gap: '14px', ...marcado('datos') }}>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="titulo">Título *</label>
                <input id="titulo" className="ds-input" maxLength={160} value={e.datos.titulo}
                  onChange={x => setDatos('titulo', x.target.value)} placeholder="Ej.: La casa de Bernarda Alba" />
              </div>
              <div className="ds-form-grid">
                <div className="ds-form-group">
                  <label className="ds-label" htmlFor="compania">Compañía o quien lo presenta *</label>
                  <input id="compania" className="ds-input" maxLength={160} value={e.datos.compania_nombre}
                    onChange={x => setDatos('compania_nombre', x.target.value)} placeholder="Ej.: Compañía Teatro del Sur" />
                </div>
                <div className="ds-form-group">
                  <label className="ds-label" htmlFor="genero">Género *</label>
                  <select id="genero" className="ds-select" value={e.datos.genero_id} onChange={x => setDatos('genero_id', x.target.value)}>
                    {GENEROS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
                <div className="ds-form-group">
                  <label className="ds-label" htmlFor="duracion">Duración (minutos)</label>
                  <input id="duracion" className="ds-input" inputMode="numeric" value={e.datos.duracion_min}
                    onChange={x => setDatos('duracion_min', x.target.value)} placeholder="Ej.: 90" />
                </div>
                <div className="ds-form-group">
                  <label className="ds-label" htmlFor="edad">Edad recomendada (desde)</label>
                  <input id="edad" className="ds-input" inputMode="numeric" value={e.datos.edad_minima}
                    onChange={x => setDatos('edad_minima', x.target.value)} placeholder="Vacío = todos los públicos" />
                </div>
                <div className="ds-form-group">
                  <label className="ds-label" htmlFor="idioma">Idioma</label>
                  <select id="idioma" className="ds-select" value={e.datos.idioma} onChange={x => setDatos('idioma', x.target.value)}>
                    {IDIOMAS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="sinopsis">Sinopsis</label>
                <textarea id="sinopsis" className="ds-textarea" rows={6} maxLength={4000} value={e.datos.sinopsis}
                  onChange={x => setDatos('sinopsis', x.target.value)} placeholder="De qué trata, qué va a ver el público y por qué no se lo puede perder." />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', alignItems: 'flex-start', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
              <div className="asis-cartel">
                {vistaCartel
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={vistaCartel} alt="Vista previa del cartel" />
                  : <span>Sin cartel</span>}
              </div>
              <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className="ds-label">Cartel</span>
                <p className="ds-form-hint">
                  Vertical (2:3). Recomendado 1000 × 1500 px; mínimo {CARTEL_MIN_ANCHO} × {CARTEL_MIN_ALTO} px. JPEG, PNG o WebP, hasta 5 MB.
                  Usa solo imágenes que tengas derecho a publicar.
                </p>
                <SelectorImagen id="cartel" archivo={cartel} onCambio={elegirCartel} etiqueta={cartel ? 'Elegir otro cartel' : 'Elegir cartel'} />
                {errorCartel && <div className="ds-alert-error">{errorCartel}</div>}
              </div>
            </div>
          </>
        )}

        {/* ── Paso 2 ───────────────────────────────────────────────────── */}
        {e.paso === 2 && (
          <>
            <h2 className="asis-titulo">2 · Funciones</h2>
            <p className="ds-form-hint" style={{ marginTop: '-8px' }}>
              Elige dónde y añade todas las fechas. Si es una gira, añade otra sala o ciudad con sus propias fechas.
            </p>
            {e.lugares.map((l, i) => (
              <LugarEditor key={l.clave} l={l} n={e.lugares.length > 1 ? i + 1 : null}
                marcado={marcado} setLugar={setLugar} setFecha={setFecha}
                quitar={e.lugares.length > 1 ? () => setE(p => ({ ...p, lugares: p.lugares.filter(x => x.clave !== l.clave) })) : null}
                anadirFecha={() => setE(p => ({
                  ...p, lugares: p.lugares.map(x => (x.clave !== l.clave ? x
                    : { ...x, fechas: [...x.fechas, fechaVacia({ hora: x.fechas.at(-1)?.hora, minuto: x.fechas.at(-1)?.minuto })] })),
                }))}
                quitarFecha={(f: string) => setE(p => ({ ...p, lugares: p.lugares.map(x => (x.clave !== l.clave ? x : { ...x, fechas: x.fechas.filter(y => y.clave !== f) })) }))} />
            ))}
            <div>
              <button type="button" className="ds-btn-secondary" style={{ padding: '9px 16px', fontSize: '13px' }}
                onClick={() => setE(p => ({ ...p, lugares: [...p.lugares, lugarVacio(p.lugares.at(-1)?.pais ?? 'ES')] }))}>
                + Añadir otra sala o ciudad (gira)
              </button>
            </div>
            {!funciones.error && funciones.filas.length > 0 && (
              <div className="asis-resumen-fn">
                <strong>Se crearán {funciones.filas.length} función{funciones.filas.length === 1 ? '' : 'es'}:</strong>
                <ul>
                  {funciones.filas.slice(0, 8).map(f => (
                    <li key={`${f.inicio}${f.espacio_id ?? f.lugar_nombre}`}>
                      {fechaFuncion(f.inicio, f.zona_horaria)} · <span>{f.lugar_nombre ?? e.lugares.find(x => x.sala?.id === f.espacio_id)?.sala?.nombre}</span>
                    </li>
                  ))}
                  {funciones.filas.length > 8 && <li>… y {funciones.filas.length - 8} más</li>}
                </ul>
              </div>
            )}
          </>
        )}

        {/* ── Paso 3 ───────────────────────────────────────────────────── */}
        {e.paso === 3 && (
          <>
            <h2 className="asis-titulo">3 · Entradas</h2>
            <p className="ds-form-hint" style={{ marginTop: '-8px' }}>
              Dónde se compran. La venta la hace la sala o la ticketera: ObrasDeTeatro enlaza y cuenta los clics para tus estadísticas.
              Si aún no tienes el enlace, puedes dejarlo vacío y añadirlo después.
            </p>
            {e.opciones.map((o, i) => {
              const online = o.tipo === 'venta' || o.tipo === 'reserva'
              return (
                <div key={o.clave} data-clave={o.clave} className="asis-bloque" style={marcado(o.clave)}>
                  <div className="asis-bloque-cab">
                    <strong>{e.opciones.length > 1 ? `Opción ${i + 1}` : 'Opción de entradas'}</strong>
                    {e.opciones.length > 1 && (
                      <button type="button" className="table-link table-link--danger"
                        onClick={() => setE(p => ({ ...p, opciones: p.opciones.filter(x => x.clave !== o.clave) }))}>Quitar</button>
                    )}
                  </div>
                  <div className="ds-form-grid">
                    <div className="ds-form-group">
                      <label className="ds-label" htmlFor={`tipo-${o.clave}`}>Tipo</label>
                      <select id={`tipo-${o.clave}`} className="ds-select" value={o.tipo} onChange={x => setOpcion(o.clave, { tipo: x.target.value })}>
                        {TIPOS_OPCION.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    {online && (
                      <div className="ds-form-group">
                        <label className="ds-label" htmlFor={`url-${o.clave}`}>Enlace de venta *</label>
                        <input id={`url-${o.clave}`} className="ds-input" type="url" maxLength={800} value={o.url}
                          onChange={x => setOpcion(o.clave, { url: x.target.value })} placeholder="Ej.: https://www.ticketera.com/tu-espectaculo" />
                      </div>
                    )}
                    {o.tipo !== 'gratis' && (
                      <>
                        <div className="ds-form-group">
                          <label className="ds-label" htmlFor={`precio-${o.clave}`}>Precio desde</label>
                          <input id={`precio-${o.clave}`} className="ds-input" inputMode="decimal" value={o.precio_desde}
                            onChange={x => setOpcion(o.clave, { precio_desde: x.target.value })} placeholder="Ej.: 15" />
                        </div>
                        <div className="ds-form-group">
                          <label className="ds-label" htmlFor={`moneda-${o.clave}`}>Moneda</label>
                          <select id={`moneda-${o.clave}`} className="ds-select" value={o.moneda} onChange={x => setOpcion(o.clave, { moneda: x.target.value })}>
                            {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      </>
                    )}
                    <div className="ds-form-group">
                      <label className="ds-label" htmlFor={`etq-${o.clave}`}>Texto del botón</label>
                      <input id={`etq-${o.clave}`} className="ds-input" maxLength={80} value={o.etiqueta}
                        onChange={x => setOpcion(o.clave, { etiqueta: x.target.value })} placeholder="Ej.: Comprar entradas" />
                    </div>
                  </div>
                  {online && (
                    <label className="asis-check">
                      <input type="checkbox" checked={o.taquilla} onChange={x => setOpcion(o.clave, { taquilla: x.target.checked })} />
                      Además, entradas a la venta en la taquilla del teatro o sala
                    </label>
                  )}
                </div>
              )
            })}
            <div>
              <button type="button" className="ds-btn-secondary" style={{ padding: '9px 16px', fontSize: '13px' }}
                onClick={() => setE(p => ({ ...p, opciones: [...p.opciones, opcionVacia(p.opciones.at(-1)?.moneda)] }))}>
                + Añadir otra opción
              </button>
            </div>
          </>
        )}

        {/* ── Paso 4 ───────────────────────────────────────────────────── */}
        {e.paso === 4 && (
          <>
            <h2 className="asis-titulo">4 · Ficha artística y resumen</h2>
            <p className="ds-form-hint" style={{ marginTop: '-8px' }}>
              Opcional. Varios nombres con el mismo papel, separados por comas. Lo que dejes vacío no se guarda.
            </p>
            {e.equipo.map(p => (
              <div key={p.clave} data-clave={p.clave} className="asis-fila-papel" style={marcado(p.clave)}>
                <select className="ds-select" aria-label="Papel" value={p.rol} onChange={x => setPapel(p.clave, { rol: x.target.value })}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <input className="ds-input" aria-label={`Nombres (${etiquetaRol(p.rol)})`} maxLength={2000} value={p.nombres}
                  onChange={x => setPapel(p.clave, { nombres: x.target.value })} placeholder="Ej.: Ana López, Luis Pérez" />
                <button type="button" className="table-link table-link--danger" aria-label="Quitar papel"
                  onClick={() => setE(x => ({ ...x, equipo: x.equipo.filter(y => y.clave !== p.clave) }))}>✕</button>
              </div>
            ))}
            <div>
              <button type="button" className="ds-btn-secondary" style={{ padding: '9px 16px', fontSize: '13px' }}
                onClick={() => setE(p => ({ ...p, equipo: [...p.equipo, papelVacio('otro')] }))}>
                + Añadir otro papel
              </button>
            </div>

            <div className="asis-resumen">
              <div className="asis-cartel" style={{ width: '96px' }}>
                {vistaCartel
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={vistaCartel} alt="" />
                  : <span>Sin cartel</span>}
              </div>
              <dl>
                <dt>Espectáculo</dt><dd><strong>{e.datos.titulo}</strong> · {e.datos.compania_nombre} · {etiquetaGenero(e.datos.genero_id)}</dd>
                <dt>Funciones</dt>
                <dd>
                  {funciones.filas.length} ·{' '}
                  {funciones.filas.length > 0 && <span>{fechaFuncion(funciones.filas[0].inicio, funciones.filas[0].zona_horaria)}</span>}
                  {funciones.filas.length > 1 && <> → <span>{fechaFuncion(funciones.filas.at(-1)!.inicio, funciones.filas.at(-1)!.zona_horaria)}</span></>}
                </dd>
                <dt>Dónde</dt>
                <dd>{e.lugares.filter(l => l.sala || l.lugar).map(l => (l.sala ? `${l.sala.nombre} (${l.sala.municipio})` : `${l.lugar} (${l.ciudad})`)).join(' · ')}</dd>
                <dt>Entradas</dt>
                <dd>
                  {opcionesDelAsistente(e.opciones).filas.map(o => `${TIPOS_OPCION.find(t => t.value === o.tipo)?.label}${precioTexto(o.precio_desde, o.moneda, o.tipo) ? ` (${precioTexto(o.precio_desde, o.moneda, o.tipo)})` : ''}`).join(' · ') || 'Sin indicar'}
                </dd>
                <dt>Ficha</dt>
                <dd>{e.equipo.reduce((n, p) => n + separarNombres(p.nombres).length, 0)} persona(s)</dd>
              </dl>
            </div>
            {!verificado && (
              <p className="ds-form-hint">
                Tu perfil no está verificado: al publicar, el equipo de ObrasDeTeatro lo revisará antes de que aparezca en la cartelera.
              </p>
            )}
          </>
        )}

        {aviso && <div className="ds-alert-error" role="alert">{aviso.error}</div>}

        <div className="asis-nav">
          {e.paso > 1
            ? <button type="button" className="ds-btn-secondary" style={{ padding: '11px 20px', fontSize: '13px' }} onClick={() => irA(e.paso - 1)} disabled={!!guardando}>← Anterior</button>
            : <span />}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button type="button" className="ds-btn-secondary" style={{ padding: '11px 18px', fontSize: '13px' }}
              onClick={() => guardar(false)} disabled={!!guardando}>
              {guardando === 'borrador' ? 'Guardando…' : 'Guardar borrador'}
            </button>
            {e.paso < PASOS.length
              ? <button type="button" className="ds-btn-primary" style={{ width: 'auto', padding: '11px 24px', fontSize: '13px' }} onClick={siguiente} disabled={!!guardando}>Siguiente →</button>
              : <button type="button" className="ds-btn-primary" style={{ width: 'auto', padding: '11px 26px', fontSize: '14px', background: 'var(--red)' }}
                  onClick={() => guardar(true)} disabled={!!guardando}>
                  {guardando === 'publicar' ? 'Publicando…' : '¡Publicar espectáculo!'}
                </button>}
          </div>
        </div>
      </section>
    </div>
  )
}

function LugarEditor({ l, n, marcado, setLugar, setFecha, quitar, anadirFecha, quitarFecha }: {
  l: LugarAsistente
  n: number | null
  marcado: (k: string) => React.CSSProperties | undefined
  setLugar: (k: string, c: Partial<LugarAsistente>) => void
  setFecha: (lugar: string, fecha: string, c: Partial<FechaAsistente>) => void
  quitar: (() => void) | null
  anadirFecha: () => void
  quitarFecha: (f: string) => void
}) {
  const zonas = ZONAS_PAIS[l.pais] ?? []
  return (
    <div data-clave={l.clave} className="asis-bloque" style={marcado(l.clave)}>
      <div className="asis-bloque-cab">
        <strong>{n ? `Lugar ${n}` : 'Lugar'}</strong>
        {quitar && <button type="button" className="table-link table-link--danger" onClick={quitar}>Quitar este lugar</button>}
      </div>
      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor={`pais-${l.clave}`}>País *</label>
          <select id={`pais-${l.clave}`} className="ds-select" value={l.pais}
            onChange={x => setLugar(l.clave, { pais: x.target.value, zona: zonaPorDefecto(x.target.value), sala: null })}>
            {PAISES_CARTELERA.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        </div>
        {zonas.length > 1 && (
          <div className="ds-form-group">
            <label className="ds-label" htmlFor={`zona-${l.clave}`}>Zona horaria</label>
            <select id={`zona-${l.clave}`} className="ds-select" value={l.zona} onChange={x => setLugar(l.clave, { zona: x.target.value })}>
              {zonas.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
            </select>
          </div>
        )}
      </div>

      <label className="asis-check">
        <input type="checkbox" checked={l.otroLugar} onChange={x => setLugar(l.clave, { otroLugar: x.target.checked, sala: null })} />
        Otro lugar (la sala no está en Espacios escénicos)
      </label>

      {!l.otroLugar ? (
        <div className="ds-form-group">
          <label className="ds-label">Sala *</label>
          <BuscadorSala elegida={l.sala} pais={l.pais}
            onElegir={s => setLugar(l.clave, s ? { sala: s, pais: s.pais_code, zona: zonaPorDefecto(s.pais_code, s.region) } : { sala: null })}
            onManual={t => setLugar(l.clave, { otroLugar: true, sala: null, lugar: t.slice(0, 160) })} />
        </div>
      ) : (
        <div className="ds-form-grid">
          <div className="ds-form-group">
            <label className="ds-label" htmlFor={`lugar-${l.clave}`}>Lugar *</label>
            <input id={`lugar-${l.clave}`} className="ds-input" maxLength={160} value={l.lugar}
              onChange={x => setLugar(l.clave, { lugar: x.target.value })} placeholder="Ej.: Centro Cultural, Sala Principal" />
          </div>
          <div className="ds-form-group">
            <label className="ds-label" htmlFor={`ciudad-${l.clave}`}>Ciudad *</label>
            <input id={`ciudad-${l.clave}`} className="ds-input" maxLength={120} value={l.ciudad}
              onChange={x => setLugar(l.clave, { ciudad: x.target.value })} placeholder="Escribe la ciudad" />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span className="ds-label">Fechas * <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(hora local, 24 h y a. m./p. m.)</span></span>
        {l.fechas.map(f => {
          const n = Number(f.cantidad)
          const dias = f.fecha && n > 1 ? fechasRepetidas(f.fecha, n, f.cadaDias) : []
          return (
            <div key={f.clave} data-clave={f.clave} className="asis-fila-fecha" style={marcado(f.clave)}>
              <input type="date" className="ds-input" aria-label="Día" value={f.fecha} onChange={x => setFecha(l.clave, f.clave, { fecha: x.target.value })} />
              <span className="asis-hora">
                <select className="ds-select" aria-label="Hora" value={f.hora} onChange={x => setFecha(l.clave, f.clave, { hora: x.target.value })}>
                  {HORAS.map(h => <option key={h} value={h}>{etiquetaHora(h)}</option>)}
                </select>
                <span aria-hidden="true">:</span>
                <select className="ds-select" aria-label="Minutos" value={f.minuto} onChange={x => setFecha(l.clave, f.clave, { minuto: x.target.value })}>
                  {MINUTOS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </span>
              <label className="asis-cantidad">
                <input type="number" className="ds-input" min={1} max={MAX_FUNCIONES_DE_UNA_VEZ} aria-label="Número de funciones"
                  value={f.cantidad} onChange={x => setFecha(l.clave, f.clave, { cantidad: x.target.value })} />
                <span>función(es)</span>
              </label>
              {n > 1 && (
                <select className="ds-select" aria-label="Repetir" value={f.cadaDias} onChange={x => setFecha(l.clave, f.clave, { cadaDias: Number(x.target.value) })}>
                  <option value={1}>todos los días</option>
                  <option value={7}>una por semana</option>
                </select>
              )}
              {l.fechas.length > 1 && (
                <button type="button" className="table-link table-link--danger" aria-label="Quitar esta fecha" onClick={() => quitarFecha(f.clave)}>✕</button>
              )}
              {dias.length > 1 && (
                <span className="asis-fecha-pista">del {dias[0].split('-').reverse().join('/')} al {dias.at(-1)!.split('-').reverse().join('/')}</span>
              )}
            </div>
          )
        })}
        <div>
          <button type="button" className="table-link" onClick={anadirFecha}>+ Añadir otra fecha</button>
        </div>
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor={`nota-${l.clave}`}>Nota para estas funciones</label>
        <input id={`nota-${l.clave}`} className="ds-input" maxLength={200} value={l.nota}
          onChange={x => setLugar(l.clave, { nota: x.target.value })} placeholder="Opcional. Ej.: función con coloquio" />
      </div>
    </div>
  )
}
