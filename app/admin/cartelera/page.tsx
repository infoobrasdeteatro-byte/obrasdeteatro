import { createClient } from '@/lib/supabase/server'
// profiles.email no se lee con sesión: tras comprobar el rol, el servidor la lee.
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import { cartelValido } from '@/lib/cartelera/cartelera'
import ModeracionCartelera, { type EspectaculoAdmin } from './ModeracionCartelera'
import { diaLocal } from '@/lib/cartelera/listado'

export const metadata: Metadata = {
  title: 'Cartelera | Administración | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

/**
 * Moderación de la cartelera: aprobar o rechazar lo que está en revisión y
 * retirar o restaurar lo publicado. El guard solo explica; la seguridad la
 * ponen la política «Moderación gestiona espectáculos» y el trigger.
 */
export default async function AdminCarteleraPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/cartelera')

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

  // Los borradores son del autor: moderación ve lo que pide publicarse o ya estuvo en la web.
  const { data, error } = await supabase
    .from('espectaculos')
    .select(`id, slug, titulo, compania_nombre, genero_id, sinopsis, cartel_url, duracion_min, edad_minima, estado,
      motivo_filtro, motivo_rechazo, created_at, updated_at, publicado_at, user_id,
      funciones(id, inicio, zona_horaria, lugar_nombre, ciudad, pais_code, estado),
      opciones_compra(id, tipo, proveedor, url, precio_desde, moneda),
      espectaculo_personas(id, nombre, rol, personaje, orden)`)
    .neq('estado', 'borrador')
    .order('updated_at', { ascending: false })
    .limit(500)

  const ids = [...new Set((data ?? []).map(e => e.user_id))]
  const { data: perfiles } = ids.length
    ? await createServiceClient().from('profiles').select('id, nombre, apellidos, nombre_artistico, slug, email, verificado, plan').in('id', ids)
    : { data: [] }
  const personas = Object.fromEntries((perfiles ?? []).map(p => [p.id, {
    nombre: p.nombre_artistico || [p.nombre, p.apellidos].filter(Boolean).join(' ') || 'Sin nombre',
    slug: p.slug, email: p.email, verificado: p.verificado, plan: p.plan as string,
  }]))

  const publicadosIds = (data ?? []).filter(e => e.estado === 'publicado').map(e => e.id)
  const { data: dest } = publicadosIds.length
    ? await supabase.from('cartelera_destacados').select('id, espectaculo_id, desde, hasta, origen, ambito').in('espectaculo_id', publicadosIds)
    : { data: [] }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const lista: EspectaculoAdmin[] = (data ?? []).map(e => ({
    id: e.id, slug: e.slug, titulo: e.titulo, compania_nombre: e.compania_nombre, genero_id: e.genero_id,
    sinopsis: e.sinopsis, duracion_min: e.duracion_min, edad_minima: e.edad_minima, estado: e.estado,
    motivo_filtro: e.motivo_filtro, motivo_rechazo: e.motivo_rechazo, updated_at: e.updated_at, publicado_at: e.publicado_at,
    cartel_url: cartelValido(e.cartel_url, supabaseUrl, e.user_id),
    funciones: [...(e.funciones ?? [])].sort((a, b) => a.inicio.localeCompare(b.inicio)),
    opciones: e.opciones_compra ?? [],
    equipo: [...(e.espectaculo_personas ?? [])].sort((a, b) => a.orden - b.orden),
    persona: personas[e.user_id] ?? null,
    destacados: (dest ?? []).filter(d => d.espectaculo_id === e.id),
  }))

  return (
    <Marco>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Cartelera</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Espectáculos en revisión, publicados y retirados. Los perfiles verificados con texto limpio se publican solos.
          </span>
        </div>
        <div className="admin-header-actions">
          <Link href="/admin/castings" className="table-link">Castings →</Link>
          <Link href="/admin/formaciones" className="table-link">Formación →</Link>
          <span className="status-pill status-pill--draft" style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.04em' }}>
            ADMINISTRACIÓN
          </span>
        </div>
      </div>

      {error && <div className="ds-alert-error" style={{ marginBottom: '20px' }}>No se pudieron leer los espectáculos: {error.message}</div>}

      <ModeracionCartelera inicial={lista} hoy={diaLocal(Date.now(), 'Europe/Madrid')} />
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
