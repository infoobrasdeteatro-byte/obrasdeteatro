import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import { createClient } from '@/lib/supabase/server'
import { loginUrlWithNext } from '@/lib/auth/next-param'
import { verificarToken } from '@/lib/convocatorias/token-moderacion'
import { etiquetaCategoria } from '@/components/convocatorias/vocabulario'
import { fecha } from '@/components/shared/formato'
import { nombrePais } from '@/lib/noticias/presentacion'
import { confirmarModeracion } from './actions'

export const metadata: Metadata = {
  title: 'Confirmar moderación | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

type Props = { searchParams: Promise<{ t?: string; hecho?: string; msg?: string; error?: string }> }

const ERRORES_TOKEN: Record<string, string> = {
  caducado: 'Este enlace ha caducado (los enlaces del resumen duran 14 días). Revísala desde el panel.',
  firma: 'Este enlace no es válido.',
  formato: 'Este enlace no es válido.',
  sin_secreto: 'La moderación por correo no está configurada en este entorno.',
}

/**
 * Página de confirmación de los botones del resumen semanal.
 *
 * ESTA PÁGINA NO MODIFICA NADA. Los antivirus de correo abren los enlaces por
 * su cuenta: si el GET aprobara o rechazara, lo harían ellos. Aquí solo se
 * comprueba el token, se enseña la convocatoria y se ofrece un botón que hace
 * POST (confirmarModeracion), con la sesión del moderador.
 *
 * /admin está protegido por el middleware: sin sesión, al login y de vuelta.
 */
export default async function ConfirmarModeracionPage({ searchParams }: Props) {
  const { t, hecho, msg, error: errorToken } = await searchParams

  const verificado = verificarToken(t ?? null)
  if (!verificado.ok || errorToken) {
    const motivo = errorToken ?? (verificado.ok ? 'formato' : verificado.motivo)
    return <Marco><Aviso texto={ERRORES_TOKEN[motivo] ?? ERRORES_TOKEN.formato} /></Marco>
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(loginUrlWithNext(`/admin/convocatorias/moderar?t=${encodeURIComponent(t ?? '')}`))

  const { data: roles } = await supabase
    .from('profile_roles')
    .select('role')
    .eq('profile_id', user.id)
    .in('role', ['admin', 'moderator'])

  if ((roles ?? []).length === 0) {
    return <Marco><Aviso texto="Esta página es del equipo de moderación: tu cuenta no tiene el rol admin ni moderator." /></Marco>
  }

  const { data: c } = await supabase
    .from('calls')
    .select('id, title, description, category, estado, deadline, prize, entidad_convocante, pais_code, ciudad, location, url_bases, fuente_dominio')
    .eq('id', verificado.callId)
    .maybeSingle()

  if (!c) return <Marco><Aviso texto="La convocatoria ya no existe." /></Marco>

  const aprobar = verificado.accion === 'aprobar'
  const bases = c.url_bases && /^https:\/\//i.test(c.url_bases) ? c.url_bases : null
  const lugar = [c.pais_code ? nombrePais(c.pais_code) : null, c.ciudad].filter(Boolean).join(' · ') || c.location

  return (
    <Marco>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">{aprobar ? 'Aprobar convocatoria' : 'Rechazar convocatoria'}</h1>
          <Link href="/admin/convocatorias" className="page-back">← Panel de moderación</Link>
        </div>
      </div>

      {hecho === 'publicada' && <div className="ds-alert-success" style={{ marginBottom: '16px' }}>Aprobada y publicada.</div>}
      {hecho === 'rechazada' && <div className="ds-alert-success" style={{ marginBottom: '16px' }}>Rechazada.</div>}
      {hecho === 'sin_cambio' && <div className="ds-alert-error" style={{ marginBottom: '16px' }}>No se cambió nada: ya no estaba pendiente de revisión.</div>}
      {hecho === 'error' && <div className="ds-alert-error" style={{ marginBottom: '16px' }}>No se pudo guardar: {msg ?? 'error desconocido'}</div>}

      <article className="account-card">
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '19px', color: 'var(--black)', lineHeight: 1.25 }}>{c.title}</h2>
        <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '14px' }}>
          <Dato etiqueta="Categoría" valor={etiquetaCategoria(c.category)} />
          <Dato etiqueta="Entidad" valor={c.entidad_convocante} />
          <Dato etiqueta="Lugar" valor={lugar} />
          <Dato etiqueta="Fecha límite" valor={c.deadline ? fecha(c.deadline) : 'Sin fecha límite'} />
          <Dato etiqueta="Dotación" valor={c.prize} />
          <Dato etiqueta="Estado actual" valor={c.estado} />
        </dl>
        {c.description && (
          <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: '14px' }}>{c.description}</p>
        )}
        {bases && (
          <p style={{ marginTop: '12px', fontSize: '13px' }}>
            <a href={bases} target="_blank" rel="noopener nofollow" className="table-link">
              Abrir las bases{c.fuente_dominio ? ` (${c.fuente_dominio})` : ''} ↗
            </a>
          </p>
        )}

        {c.estado === 'pendiente_revision' && !hecho ? (
          <form action={confirmarModeracion} style={{ marginTop: '18px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
            <input type="hidden" name="t" value={t} />
            {!aprobar && (
              <p className="ds-form-hint" style={{ marginBottom: '10px' }}>
                Se guardará el motivo «Rechazada desde resumen semanal».
              </p>
            )}
            <button type="submit" className={aprobar ? 'ds-btn-primary' : 'ds-btn-danger'}
              style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }}>
              {aprobar ? 'Confirmar: aprobar y publicar' : 'Confirmar: rechazar'}
            </button>
          </form>
        ) : !hecho && (
          <p className="ds-form-hint" style={{ marginTop: '14px' }}>Ya no está pendiente de revisión: no hay nada que confirmar.</p>
        )}
      </article>
    </Marco>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  if (!valor) return null
  return (
    <div>
      <dt className="obras-stat-label">{etiqueta}</dt>
      <dd style={{ fontSize: '13px', color: 'var(--text)' }}>{valor}</dd>
    </div>
  )
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="obras-empty">
      <p className="obras-empty-text">{texto}</p>
      <Link href="/admin/convocatorias" className="ds-btn-secondary"
        style={{ width: 'auto', display: 'inline-flex', padding: '10px 24px' }}>
        Ir al panel de moderación
      </Link>
    </div>
  )
}

function Marco({ children }: { children: React.ReactNode }) {
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
