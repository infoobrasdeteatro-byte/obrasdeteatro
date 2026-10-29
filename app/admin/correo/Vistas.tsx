import Link from 'next/link'
import type { SupabaseClient } from '@supabase/supabase-js'
import { etiquetaDestino, ETIQUETA_BUZON, type Buzon } from '@/lib/correo/direcciones'
import { documentoAislado, SANDBOX_CORREO } from '@/lib/correo/html'
import {
  enlaceResponder, ESTADOS, ESTADOS_SIN_ATENDER, ETIQUETA_ESTADO, queryFiltros, tamano,
  type EstadoCorreo, type Filtros,
} from '@/lib/correo/presentacion'
import AccionesCorreo from './AccionesCorreo'
import EnlaceTarea from '../tareas/EnlaceTarea'
import { tareasAbiertasPorOrigen } from '@/lib/tareas/datos'

/**
 * Bandeja y detalle de /admin/correo. Reciben el cliente con la sesión de
 * quien mira (la RLS solo devuelve filas a admin); page.tsx comprueba el rol.
 */

export const POR_PAGINA = 100
const fecha = (iso: string) => new Date(iso).toLocaleString('es-ES', { timeZone: 'Atlantic/Canary', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

type Adjunto = { nombre: string; tipo: string | null; tamano: number | null }
type Correo = {
  id: string; recibido_at: string; buzon: Buzon; direccion_destino: string | null
  remitente_nombre: string | null; remitente_email: string | null; asunto: string | null
  texto: string | null; html: string | null; adjuntos: Adjunto[]
  categoria: 'persona' | 'servicio'; estado: EstadoCorreo; nota_interna: string | null; atendido_at: string | null
}

export async function Bandeja({ sesion, filtros, limite }: { sesion: SupabaseClient; filtros: Filtros; limite: number }) {
  let q = sesion.from('correos_entrantes')
    .select('id, recibido_at, buzon, direccion_destino, remitente_nombre, remitente_email, asunto, adjuntos, categoria, estado')
    .order('recibido_at', { ascending: false })
    .limit(limite + 1)
  if (filtros.buzon !== 'todos') q = q.eq('buzon', filtros.buzon)
  if (filtros.categoria !== 'todos') q = q.eq('categoria', filtros.categoria)
  if (filtros.estado === 'pendientes') q = q.in('estado', ESTADOS_SIN_ATENDER)
  else if (filtros.estado !== 'todos') q = q.eq('estado', filtros.estado)
  const { data, error } = await q
  const filas = (data ?? []) as Correo[]
  const hayMas = filas.length > limite
  const visibles = hayMas ? filas.slice(0, limite) : filas

  const grupo = <K extends keyof Filtros>(clave: K, opciones: [Filtros[K], string][]) => (
    <div className="mc-pestanas" role="group">
      {opciones.map(([valor, etiqueta]) => (
        <Link key={String(valor)} href={`/admin/correo${queryFiltros({ ...filtros, [clave]: valor })}`}
          className={`mc-pestana${filtros[clave] === valor ? ' mc-pestana--activa' : ''}`}
          aria-current={filtros[clave] === valor ? 'true' : undefined}>{etiqueta}</Link>
      ))}
    </div>
  )

  return (
    <>
      <div className="correo-filtros">
        {grupo('buzon', [['todos', 'Todos'], ['hola', 'hola@'], ['gmail', 'Gmail']])}
        {grupo('categoria', [['persona', 'Personas'], ['servicio', 'Servicios'], ['todos', 'Todos']])}
        {grupo('estado', [['todos', 'Cualquier estado'], ['pendientes', 'Sin atender'], ...ESTADOS.map(e => [e, ETIQUETA_ESTADO[e]] as [EstadoCorreo, string])])}
      </div>

      {error && <div className="ds-alert-error" style={{ marginBottom: '16px' }}>No se pudo leer el correo: {error.message}</div>}

      {!error && visibles.length === 0 ? (
        <div className="obras-empty"><p className="obras-empty-text">No hay correos con estos filtros.</p></div>
      ) : (
        <ul className="correo-lista account-card">
          {visibles.map(c => {
            const etiqueta = etiquetaDestino(c.direccion_destino)
            return (
              <li key={c.id}>
                <Link href={`/admin/correo${queryFiltros(filtros, { id: c.id })}`} className={`correo-fila${c.estado === 'nuevo' ? ' correo-fila--nuevo' : ''}`}>
                  <span className="correo-remitente">
                    {c.estado === 'nuevo' && <span className="correo-punto" aria-label="Nuevo" />}
                    {c.remitente_nombre || c.remitente_email || 'Remitente desconocido'}
                  </span>
                  <span className="correo-asunto">{c.asunto || '(sin asunto)'}</span>
                  <span className="correo-meta">
                    <span className="correo-etiqueta">{etiqueta ?? c.direccion_destino ?? ETIQUETA_BUZON[c.buzon]}</span>
                    {(c.adjuntos ?? []).length > 0 && <span title={`${c.adjuntos.length} adjuntos`} aria-label="Con adjuntos">📎 {c.adjuntos.length}</span>}
                    {c.estado !== 'nuevo' && <span>{ETIQUETA_ESTADO[c.estado]}</span>}
                    <time dateTime={c.recibido_at}>{fecha(c.recibido_at)}</time>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {hayMas && limite < POR_PAGINA * 10 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px' }}>
          <Link href={`/admin/correo${queryFiltros(filtros, { mas: String(limite / POR_PAGINA + 1) })}`} className="ds-btn-secondary" style={{ width: 'auto', padding: '9px 22px' }}>Ver más</Link>
        </div>
      )}
    </>
  )
}

export async function Detalle({ sesion, id, filtros }: { sesion: SupabaseClient; id: string; filtros: Filtros }) {
  const volver = <Link href={`/admin/correo${queryFiltros(filtros)}`} className="page-back" style={{ marginBottom: '14px' }}>← Volver a la bandeja</Link>
  const { data, error } = await sesion.from('correos_entrantes')
    .select('id, recibido_at, buzon, direccion_destino, remitente_nombre, remitente_email, asunto, texto, html, adjuntos, categoria, estado, nota_interna, atendido_at')
    .eq('id', id).maybeSingle()
  const c = data as Correo | null
  if (error || !c) {
    return <>{volver}<div className="obras-empty"><p className="obras-empty-text">{error ? `No se pudo leer el correo: ${error.message}` : 'Correo no encontrado.'}</p></div></>
  }
  const etiqueta = etiquetaDestino(c.direccion_destino)
  const abiertas = await tareasAbiertasPorOrigen(sesion, [{ tipo: 'correo', ref: c.id }])

  return (
    <>
      {volver}
      <article className="account-card correo-detalle">
        <h2 className="correo-detalle-asunto">{c.asunto || '(sin asunto)'}</h2>
        <div style={{ marginBottom: '12px' }}>
          <EnlaceTarea origen="correo" refOrigen={c.id} titulo={`Correo: ${(c.asunto || '(sin asunto)').slice(0, 180)}`} enlace={`/admin/correo?id=${c.id}`} abiertas={abiertas} />
        </div>
        <dl className="correo-datos">
          <dt>De</dt><dd>{c.remitente_nombre ? `${c.remitente_nombre} <${c.remitente_email ?? '?'}>` : c.remitente_email ?? 'desconocido'}</dd>
          <dt>Para</dt><dd>{c.direccion_destino ?? '—'}{etiqueta && <span className="correo-etiqueta" style={{ marginLeft: '8px' }}>{etiqueta}</span>}</dd>
          <dt>Buzón</dt><dd>{ETIQUETA_BUZON[c.buzon]}</dd>
          <dt>Recibido</dt><dd>{fecha(c.recibido_at)}</dd>
          <dt>Estado</dt><dd>{ETIQUETA_ESTADO[c.estado]}{c.atendido_at ? ` · ${fecha(c.atendido_at)}` : ''} · {c.categoria === 'persona' ? 'Persona' : 'Servicio'}</dd>
        </dl>

        {c.html ? (
          <>
            <iframe title="Contenido del correo" className="correo-iframe" sandbox={SANDBOX_CORREO} srcDoc={documentoAislado(c.html)} referrerPolicy="no-referrer" />
            <p className="ds-form-hint">Las imágenes externas no se cargan. Los enlaces se abren en una pestaña nueva.</p>
            {c.texto && (
              <details style={{ marginTop: '10px' }}>
                <summary className="table-link">Ver como texto</summary>
                <pre className="correo-texto">{c.texto}</pre>
              </details>
            )}
          </>
        ) : (
          <pre className="correo-texto">{c.texto || '(sin texto)'}</pre>
        )}

        {(c.adjuntos ?? []).length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <h3 className="obras-stat-label">Adjuntos</h3>
            <ul className="correo-adjuntos">
              {c.adjuntos.map((a, i) => <li key={i}>📎 {a.nombre} · {tamano(a.tamano)} · <em>Disponible en el buzón original</em></li>)}
            </ul>
          </div>
        )}
      </article>

      {/* Clave solo el id: tras «Volver a nuevo» no se vuelve a montar ni a marcar como leído. */}
      <AccionesCorreo key={c.id} id={c.id} estado={c.estado} categoria={c.categoria}
        nota={c.nota_interna} responder={enlaceResponder(c)} esGmail={c.buzon === 'gmail'} />
    </>
  )
}
