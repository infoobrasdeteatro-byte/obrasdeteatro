import Link from 'next/link'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import { ETIQUETA_PRIORIDAD, type Prioridad } from '@/lib/tareas/tareas'

/** Marco y cabecera comunes de /admin/tareas (mismo patrón que el resto de /admin). */

export function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}

export function Cabecera({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children?: React.ReactNode }) {
  return (
    <div className="page-header">
      <div className="page-title-group">
        <h1 className="page-title">{titulo}</h1>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{subtitulo}</span>
      </div>
      <div className="admin-header-actions">
        <Link href="/admin" className="table-link">← Master Control</Link>
        {children}
        <span className="status-pill status-pill--draft" style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.04em' }}>ADMINISTRACIÓN</span>
      </div>
    </div>
  )
}

export function SinAcceso() {
  return (
    <Marco>
      <div className="page-header"><h1 className="page-title">Acceso restringido</h1></div>
      <div className="obras-empty">
        <p className="obras-empty-text">Esta página es del equipo de moderación: tu cuenta no tiene el rol admin ni moderator.</p>
        <Link href="/dashboard" className="ds-btn-secondary" style={{ width: 'auto', display: 'inline-flex', padding: '10px 24px' }}>Volver al inicio</Link>
      </div>
    </Marco>
  )
}

export function PildoraPrioridad({ p }: { p: Prioridad }) {
  return <span className={`tarea-prioridad tarea-prioridad--${p}`}>{ETIQUETA_PRIORIDAD[p]}</span>
}

/** «29 oct 2026» para una fecha AAAA-MM-DD. */
export const fechaCorta = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', { timeZone: 'Atlantic/Canary', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
