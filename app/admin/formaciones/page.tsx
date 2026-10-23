import { createClient } from '@/lib/supabase/server'
// profiles.email no se lee con sesión: tras comprobar el rol, el servidor la lee.
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import GestionFormaciones, { type FormacionAdmin } from './GestionFormaciones'

export const metadata: Metadata = {
  title: 'Formación | Administración | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

/**
 * Moderación de formaciones. Se publican solas; aquí solo se retiran (con
 * motivo) o se restauran. Mismo guard y marco que el resto de /admin: el guard
 * solo explica, la seguridad la pone la política «Moderación gestiona formaciones».
 */
export default async function AdminFormacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/formaciones')

  const { data: roles } = await supabase.from('profile_roles').select('role').eq('profile_id', user.id).in('role', ['admin', 'moderator'])
  if ((roles ?? []).length === 0) {
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

  // Los borradores son del autor: moderación ve lo que está o estuvo en la web.
  const { data: formaciones, error } = await supabase
    .from('formaciones')
    .select('id, slug, titulo, tipo, modalidad, ciudad, pais_code, fecha_inicio, fecha_fin, estado, motivo_retirada, created_at, profile_id')
    .neq('estado', 'borrador')
    .order('created_at', { ascending: false })
    .limit(1000)

  const ids = [...new Set((formaciones ?? []).map(f => f.profile_id))]
  const { data: perfiles } = ids.length
    ? await createServiceClient().from('profiles').select('id, nombre, apellidos, nombre_artistico, slug, email').in('id', ids)
    : { data: [] as { id: string; nombre: string | null; apellidos: string | null; nombre_artistico: string | null; slug: string | null; email: string }[] }
  const personas = Object.fromEntries((perfiles ?? []).map(p => [p.id, {
    nombre: p.nombre_artistico || [p.nombre, p.apellidos].filter(Boolean).join(' ') || 'Sin nombre',
    slug: p.slug,
    email: p.email,
  }]))

  const lista: FormacionAdmin[] = (formaciones ?? []).map(({ profile_id, ...f }) => ({ ...f, persona: personas[profile_id] ?? null }))

  return (
    <Marco>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Formación</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Cursos, talleres y masterclass publicados. Se publican sin revisión previa; aquí se retiran o se restauran.
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/formacion" className="table-link">Ver la página pública →</Link>
          <Link href="/admin/cartelera" className="table-link">Cartelera →</Link>
          <Link href="/admin/espacios" className="table-link">Espacios escénicos →</Link>
          <span className="status-pill status-pill--draft" style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.04em' }}>
            ADMINISTRACIÓN
          </span>
        </div>
      </div>

      {error && <div className="ds-alert-error" style={{ marginBottom: '20px' }}>No se pudieron leer las formaciones: {error.message}</div>}

      <GestionFormaciones inicial={lista} />
    </Marco>
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
