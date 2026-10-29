import Link from 'next/link'
import type { Cifras } from '@/lib/admin/datos'
import { META_ESPACIOS } from '@/lib/admin/datos'
import { ICONO, LIMITE_EVENTOS, LIMITE_MAXIMO, PERIODOS, type Evento, type Periodo } from '@/lib/admin/actividad'
import { totalColas, type ElementoAtencion, type Pendientes } from '@/lib/admin/colas'
import { seccionesVisibles } from '@/lib/admin/secciones'
import { peorColor, type Color, type Semaforo } from '@/lib/admin/salud'
import EnlaceTarea from './tareas/EnlaceTarea'

const ZONA = 'Atlantic/Canary'
const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-ES', { timeZone: ZONA, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-ES', { timeZone: ZONA, hour: '2-digit', minute: '2-digit' })
const miles = (n: number) => n.toLocaleString('es-ES')

const ETIQUETA_COLOR: Record<Color, string> = { verde: 'Bien', ambar: 'Atención', rojo: 'Fallo', gris: 'Sin datos' }

export type DatosMasterControl = {
  ahora: Date
  esAdmin: boolean
  pendientes: Pendientes
  atencion: ElementoAtencion[]
  salud: Semaforo[]
  cifras: Cifras
  eventos: { eventos: Evento[]; hayMas: boolean }
  periodo: Periodo
  limite: number
  /** Tareas abiertas por origen («cola:noticias», «salud:latam»…). */
  tareasOrigen?: Record<string, { id: string; titulo: string }>
}

/**
 * Presentación del Master Control: recibe los datos ya leídos y no consulta
 * nada. Un bloque nuevo (correo entrante, tareas…) es una sección más aquí y
 * su carga en page.tsx.
 */
export default function MasterControl({ ahora, esAdmin, pendientes, atencion, salud, cifras, eventos, periodo, limite, tareasOrigen = {} }: DatosMasterControl) {
  return (
    <>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Master Control</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Lo que requiere atención, el estado de las automatizaciones y la actividad de la plataforma. Datos de las {hora(ahora.toISOString())} (hora de Canarias).
          </span>
        </div>
        <div className="admin-header-actions">
          <span className="status-pill status-pill--draft" style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.04em' }}>ADMINISTRACIÓN</span>
        </div>
      </div>

      <Bloque titulo="Requiere tu atención">
        {atencion.length === 0 ? (
          <div className="account-card mc-al-dia">Todo al día</div>
        ) : (
          <ul className="mc-atencion">
            {atencion.map(a => (
              <li key={a.clave} className="mc-atencion-celda">
                <Link href={a.href} className="mc-atencion-item">
                  <span className={`mc-atencion-n${a.n === null ? ' mc-atencion-n--error' : ''}`}>{a.n ?? '?'}</span>
                  <span>{a.texto}</span>
                  <span className="mc-flecha" aria-hidden>→</span>
                </Link>
                {/* Las de tareas ya son tareas: no se convierten en otra. */}
                {!a.clave.startsWith('tareas') && (
                  <EnlaceTarea origen="cola" refOrigen={a.clave} titulo={a.texto} enlace={a.href} abiertas={tareasOrigen} />
                )}
              </li>
            ))}
          </ul>
        )}
      </Bloque>

      <Bloque titulo="Salud de las automatizaciones" resumen={peorColor(salud.map(s => s.color))}>
        <div className="mc-salud">
          {salud.map(s => <TarjetaSalud key={s.clave} s={s} abiertas={tareasOrigen} />)}
        </div>
      </Bloque>

      <Bloque titulo="La plataforma en cifras">
        <BloqueCifras c={cifras} />
      </Bloque>

      <Bloque titulo="Actividad">
        <nav className="mc-pestanas" aria-label="Periodo de la actividad">
          {(Object.keys(PERIODOS) as Periodo[]).map(p => (
            <Link key={p} href={p === 'hoy' ? '/admin' : `/admin?actividad=${p}`} scroll={false}
              className={`mc-pestana${p === periodo ? ' mc-pestana--activa' : ''}`} aria-current={p === periodo ? 'page' : undefined}>
              {PERIODOS[p].etiqueta}
            </Link>
          ))}
        </nav>
        <div className="account-card" style={{ padding: 0 }}>
          {eventos.eventos.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--muted)', padding: '18px 20px' }}>Sin actividad en este periodo.</p>
          ) : (
            <ol className="mc-actividad">
              {eventos.eventos.map(e => (
                <li key={e.id} className="mc-evento">
                  <span className="mc-evento-icono" aria-hidden>{ICONO[e.tipo]}</span>
                  {e.href ? <Link href={e.href} className="mc-evento-texto">{e.texto}</Link> : <span className="mc-evento-texto">{e.texto}</span>}
                  <time className="mc-evento-hora" dateTime={e.at}>{periodo === 'hoy' ? hora(e.at) : fechaHora(e.at)}</time>
                </li>
              ))}
            </ol>
          )}
        </div>
        {eventos.hayMas && limite < LIMITE_MAXIMO && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px' }}>
            <Link href={`/admin?actividad=${periodo}&mas=${limite / LIMITE_EVENTOS + 1}`} scroll={false} className="ds-btn-secondary" style={{ width: 'auto', padding: '9px 22px' }}>
              Ver más
            </Link>
          </div>
        )}
        {eventos.hayMas && limite >= LIMITE_MAXIMO && (
          <p className="ds-form-hint" style={{ marginTop: '10px' }}>Se muestran los {LIMITE_MAXIMO} más recientes.</p>
        )}
      </Bloque>

      <Bloque titulo="Secciones">
        {seccionesVisibles(esAdmin).map(g => (
          <div key={g.titulo} style={{ marginBottom: '18px' }}>
            <h3 className="mc-grupo">{g.titulo}</h3>
            <div className="mc-secciones">
              {g.secciones.map(s => {
                const n = totalColas(pendientes, s.colas)
                return (
                  <Link key={s.href} href={s.href} className="mc-seccion">
                    <span className="mc-seccion-titulo">
                      {s.titulo}
                      {n !== null && n > 0 && <span className="sid-contador" aria-label={`${n} pendientes`}>{n > 99 ? '99+' : n}</span>}
                    </span>
                    <span className="mc-seccion-desc">{s.descripcion}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </Bloque>
    </>
  )
}

function TarjetaSalud({ s, abiertas }: { s: Semaforo; abiertas: Record<string, { id: string; titulo: string }> }) {
  const cuerpo = (
    <>
      <div className="mc-salud-cabecera">
        <span className={`mc-luz mc-luz--${s.color}`} role="img" aria-label={ETIQUETA_COLOR[s.color]} />
        <span className="mc-salud-titulo">{s.titulo}</span>
      </div>
      <p className="mc-salud-frase">{s.frase}</p>
      {s.detalles && s.detalles.length > 0 && (
        <ul className="mc-salud-detalles">
          {s.detalles.map(d => (
            <li key={d.texto}><span className={`mc-luz mc-luz--${d.color} mc-luz--peq`} aria-hidden />{d.texto}</li>
          ))}
        </ul>
      )}
      <p className="mc-salud-fecha">{s.ultimoDato ? `Último dato: ${fechaHora(s.ultimoDato)}` : 'Sin datos'}</p>
    </>
  )
  return <div className={`account-card mc-salud-tarjeta mc-salud-tarjeta--${s.color}`}>
    {s.href && !s.href.startsWith('http') ? <Link href={s.href} className="mc-salud-enlace">{cuerpo}</Link> : cuerpo}
    {(s.color === 'ambar' || s.color === 'rojo') && (
      <EnlaceTarea origen="salud" refOrigen={s.clave} titulo={`${s.titulo}: revisar`} enlace={s.href && !s.href.startsWith('http') ? s.href : '/admin'} abiertas={abiertas} />
    )}
  </div>
}


function BloqueCifras({ c }: { c: Cifras }) {
  const v = (n: number | null | undefined) => (n === null || n === undefined ? '—' : miles(n))
  const totalSubs = c.suscripcionesPorPlan?.reduce((t, s) => t + s.n, 0) ?? null
  const pctEspacios = c.espaciosPublicados ? Math.min(100, (c.espaciosPublicados / META_ESPACIOS) * 100) : 0
  return (
    <div className="obras-stat-grid obras-stat-grid--4 mc-cifras">
      <div className="obras-stat-card">
        <div className="obras-stat-label">Usuarios</div>
        <div className="obras-stat-value">{v(c.usuarios)}</div>
        <div className="mc-cifra-nota">{c.usuariosNuevos7d === null ? '—' : `+${miles(c.usuariosNuevos7d)} en los últimos 7 días`}</div>
      </div>
      <div className="obras-stat-card">
        <div className="obras-stat-label">Suscripciones de pago activas</div>
        <div className="obras-stat-value obras-stat-value--green">{v(totalSubs)}</div>
        <div className="mc-cifra-nota">
          {c.suscripcionesPorPlan === null ? 'No se pudieron leer'
            : c.suscripcionesPorPlan.length === 0 ? 'Ninguna todavía'
            : c.suscripcionesPorPlan.map(s => `${s.plan.charAt(0).toUpperCase()}${s.plan.slice(1)}: ${s.n}`).join(' · ')}
        </div>
      </div>
      <div className="obras-stat-card">
        <div className="obras-stat-label">Espacios escénicos publicados</div>
        <div className="obras-stat-value">{v(c.espaciosPublicados)}</div>
        <div className="mc-barra" role="progressbar" aria-valuemin={0} aria-valuemax={META_ESPACIOS} aria-valuenow={c.espaciosPublicados ?? 0} aria-label="Progreso hacia 10.000 espacios">
          <div style={{ width: `${pctEspacios}%` }} />
        </div>
        <div className="mc-cifra-nota">{c.espaciosPublicados === null ? '—' : `${pctEspacios.toLocaleString('es-ES', { maximumFractionDigits: 1 })} % de ${miles(META_ESPACIOS)}`}</div>
      </div>
      <div className="obras-stat-card">
        <div className="obras-stat-label">Suscriptores de Proscenio</div>
        <div className="obras-stat-value">{v(c.suscriptoresProscenio)}</div>
        <div className="mc-cifra-nota">Confirmados</div>
      </div>
      {c.embajadores !== undefined && (
        <div className="obras-stat-card">
          <div className="obras-stat-label">Plazas de Embajadores</div>
          <div className="obras-stat-value">{c.embajadores ? `${c.embajadores.ocupadas}/${c.embajadores.total}` : '—'}</div>
          <div className="mc-cifra-nota">Aceptadas y pendientes sin caducar</div>
        </div>
      )}
    </div>
  )
}

function Bloque({ titulo, resumen, children }: { titulo: string; resumen?: Color; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {resumen && <span className={`mc-luz mc-luz--${resumen}`} role="img" aria-label={ETIQUETA_COLOR[resumen]} />}
        <h2 className="obras-stat-label" style={{ margin: 0 }}>{titulo}</h2>
      </div>
      {children}
    </section>
  )
}

