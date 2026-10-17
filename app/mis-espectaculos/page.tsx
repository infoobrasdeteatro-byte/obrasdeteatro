import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import MisEspectaculosList, { type EspectaculoPropio } from './MisEspectaculosList'
import { diaLocal } from '@/lib/cartelera/listado'
import type { Destacado } from '@/lib/cartelera/destacados'

export const metadata: Metadata = {
  title: 'Mis espectáculos | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

/** Panel de quien publica espectáculos en la cartelera (cualquier perfil, gratis). */
export default async function MisEspectaculosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/mis-espectaculos')

  // Filtro explícito por user_id: la política pública deja ver los publicados de cualquiera.
  const [{ data }, { data: perfil }, { data: limites }, { data: clics }] = await Promise.all([
    supabase
      .from('espectaculos')
      .select('id, slug, titulo, compania_nombre, cartel_url, estado, motivo_rechazo, created_at, funciones(inicio, zona_horaria, estado, ciudad, lugar_nombre)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('plan, verificado').eq('id', user.id).single(),
    supabase.from('cartelera_limites_plan').select('plan, max_activos, semanas_destacado_mes'),
    supabase.from('cartelera_eventos').select('espectaculo_id').eq('tipo', 'clic_compra').limit(10000),
  ])

  const ahora = Date.now()
  const porEspectaculo = new Map<string, number>()
  for (const c of clics ?? []) porEspectaculo.set(c.espectaculo_id, (porEspectaculo.get(c.espectaculo_id) ?? 0) + 1)

  const lista: EspectaculoPropio[] = (data ?? []).map(e => {
    const futuras = (e.funciones ?? []).filter(f => f.estado !== 'cancelada' && new Date(f.inicio).getTime() > ahora)
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
    return {
      id: e.id, slug: e.slug, titulo: e.titulo, compania_nombre: e.compania_nombre, cartel_url: e.cartel_url,
      estado: e.estado, motivo_rechazo: e.motivo_rechazo,
      funciones: (e.funciones ?? []).length, proxima: futuras[0] ? { inicio: futuras[0].inicio, zona: futuras[0].zona_horaria, lugar: futuras[0].lugar_nombre } : null,
      ciudades: [...new Set(futuras.map(f => f.ciudad).filter(Boolean))] as string[],
      clics: porEspectaculo.get(e.id) ?? 0,
    }
  })
  // Destacados de sus espectáculos (para el botón «Destacar» y su cupo).
  const ids = (data ?? []).map(e => e.id)
  const { data: dest } = ids.length
    ? await supabase.from('cartelera_destacados').select('id, espectaculo_id, desde, hasta, origen').in('espectaculo_id', ids)
    : { data: [] as Destacado[] }
  const limitePlan = (limites ?? []).find(l => l.plan === (perfil?.plan ?? 'gratuito'))
  const hoy = diaLocal(ahora, 'Europe/Madrid')

  const publicados = lista.filter(e => e.estado === 'publicado').length
  const revision = lista.filter(e => e.estado === 'pendiente_revision').length
  const maximo = limitePlan?.max_activos ?? null

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Mis espectáculos</h1>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Publica tus espectáculos en la cartelera de ObrasDeTeatro: gratis, con tus funciones y el enlace a las entradas.
              </span>
            </div>
            <Link href="/mis-espectaculos/nuevo" className="ds-btn-primary"
              style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }}>
              + Nuevo espectáculo
            </Link>
          </div>

          <div className="obras-stat-grid">
            <div className="obras-stat-card">
              <div className="obras-stat-label">Publicados</div>
              <div className="obras-stat-value obras-stat-value--green">
                {publicados}{maximo !== null && <span style={{ fontSize: '14px', color: 'var(--muted)' }}> / {maximo}</span>}
              </div>
            </div>
            <div className="obras-stat-card">
              <div className="obras-stat-label">En revisión</div>
              <div className="obras-stat-value obras-stat-value--amber">{revision}</div>
            </div>
            <div className="obras-stat-card">
              <div className="obras-stat-label">Clics en «Entradas»</div>
              <div className="obras-stat-value">{lista.reduce((s, e) => s + e.clics, 0)}</div>
            </div>
          </div>

          {!perfil?.verificado && (
            <p className="ds-form-hint" style={{ marginBottom: '16px' }}>
              Tu perfil no está verificado: los espectáculos que envíes pasan por una revisión del equipo antes de
              aparecer en la cartelera. Con el perfil verificado salen publicados al momento.{' '}
              <Link href="/verificacion" className="table-link">Verificar mi perfil</Link>
            </p>
          )}

          <MisEspectaculosList espectaculos={lista} destacados={dest ?? []} cupoSemanas={limitePlan?.semanas_destacado_mes ?? 0} hoy={hoy} />
        </main>
      </div>
    </div>
  )
}
