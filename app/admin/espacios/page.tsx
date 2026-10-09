import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import GestionEspacios, { type EspacioAdmin } from './GestionEspacios'
import { type ReclamacionAdmin } from './BandejaReclamaciones'
import { type SugerenciaAdmin } from './BandejaSugerencias'
import Bandejas from './Bandejas'
import { COLUMNAS_ADMIN } from '@/lib/espacios/espacios'

export const metadata: Metadata = {
  title: 'Espacios escénicos | Administración | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

/**
 * Catálogo de espacios escénicos: alta, edición, cambio de estado
 * (publicado / borrador / retirado) y bandeja de reclamaciones.
 *
 * Mismo patrón que el resto de /admin: el guard de rol solo explica; la
 * seguridad la ponen las políticas «Moderación gestiona espacios» y
 * «Moderación gestiona reclamaciones». Todo con la sesión del moderador.
 */
export default async function AdminEspaciosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

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

  const [{ data: espacios, error }, { data: reclamaciones, error: errorReclamaciones }, { data: sugerencias, error: errorSugerencias }] = await Promise.all([
    supabase.from('espacios_escenicos').select(COLUMNAS_ADMIN).order('nombre', { ascending: true }).limit(5000),
    supabase.from('espacios_reclamaciones')
      .select('id, espacio_id, profile_id, mensaje, estado, created_at, resuelta_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('espacios_sugerencias')
      .select('id, espacio_id, profile_id, texto, email, estado, motivo_filtro, created_at, resuelta_at')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  // Nombres de quien reclama y de quien gestiona, en una sola lectura.
  const ids = [...new Set([
    ...(reclamaciones ?? []).map(r => r.profile_id),
    ...(sugerencias ?? []).map(s => s.profile_id).filter((v): v is string => v !== null),
    ...(espacios ?? []).map(e => e.gestionado_por).filter((v): v is string => v !== null),
  ])]
  const { data: perfiles } = ids.length
    ? await supabase.from('profiles').select('id, nombre, apellidos, nombre_artistico, slug, email').in('id', ids)
    : { data: [] as { id: string; nombre: string | null; apellidos: string | null; nombre_artistico: string | null; slug: string | null; email: string }[] }
  const personas = Object.fromEntries((perfiles ?? []).map(p => [p.id, {
    nombre: p.nombre_artistico || [p.nombre, p.apellidos].filter(Boolean).join(' ') || 'Sin nombre',
    slug: p.slug,
    email: p.email,
  }]))

  const nombreEspacio = Object.fromEntries((espacios ?? []).map(e => [e.id, { nombre: e.nombre, slug: e.slug }]))

  return (
    <Marco>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Espacios escénicos</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Catálogo de teatros, auditorios y salas. Solo lo publicado se ve en la web (tarda hasta 10 minutos).
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/espacios" className="table-link">Ver la página pública →</Link>
          <Link href="/admin/galeria" className="table-link">Galerías de perfiles →</Link>
          <span className="status-pill status-pill--draft" style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.04em' }}>
            ADMINISTRACIÓN
          </span>
        </div>
      </div>

      {(error || errorReclamaciones || errorSugerencias) && (
        <div className="ds-alert-error" style={{ marginBottom: '20px' }}>
          No se pudieron leer los datos: {(error ?? errorReclamaciones ?? errorSugerencias)?.message}
        </div>
      )}

      <Bandejas
        reclamaciones={(reclamaciones ?? []).map(r => ({
          ...r,
          espacio: nombreEspacio[r.espacio_id] ?? null,
          persona: personas[r.profile_id] ?? null,
        })) as ReclamacionAdmin[]}
        sugerencias={(sugerencias ?? []).map(s => ({
          ...s,
          espacio: nombreEspacio[s.espacio_id] ?? null,
          persona: s.profile_id ? personas[s.profile_id] ?? null : null,
        })) as SugerenciaAdmin[]}
      />

      <GestionEspacios inicial={(espacios ?? []) as EspacioAdmin[]} personas={personas} />
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
