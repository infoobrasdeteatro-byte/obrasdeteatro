import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { SupabaseClient } from '@supabase/supabase-js'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import PanelEmbajadores, { type FilaInvitacion } from './PanelEmbajadores'
import { construirPanelEmbajadores, type ColegaEmbajadorBD, type EmbajadorBD } from '@/lib/embajadores/admin'
import type { Suscripcion } from '@/lib/elenco/origen-plan'
import { PLAZAS_FUNDADORAS } from '@/lib/embajadores/textos'
import { plazasOcupadas } from '@/lib/embajadores/plazas'

export const metadata: Metadata = { title: 'Embajadores de Escena | Administración | ObrasDeTeatro', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/** Embajadores de Escena: invitaciones, envío por WhatsApp y estadísticas internas de referidos. Solo administración. */
export default async function AdminEmbajadoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/embajadores')
  const { data: rol } = await supabase.from('profile_roles').select('role').eq('profile_id', user.id).eq('role', 'admin').maybeSingle()
  if (!rol) {
    return (
      <Marco>
        <div className="page-header"><h1 className="page-title">Acceso restringido</h1></div>
        <div className="obras-empty"><p className="obras-empty-text">Esta página es de administración.</p></div>
      </Marco>
    )
  }

  const s = createServiceClient() as unknown as SupabaseClient
  const ahoraIso = new Date().toISOString()
  const [{ data: invitaciones }, { data: membresias }, { data: colegas }, { data: recompensas }] = await Promise.all([
    s.from('embajadores_invitaciones')
      .select('id, token, nombre, genero, oficio, telefono, email, estado, creada_at, caduca_at, aceptada_por, aceptada_at')
      .order('creada_at', { ascending: false }).limit(500),
    s.from('membresias_cortesia').select('profile_id, tipo, hasta, renunciada_at, honor_at').eq('tipo', 'embajador').limit(5000),
    s.from('embajadores_colegas').select('embajador_id, profile_id, alta, nombre, tipo_perfil, clase, activo, puntos').limit(10000),
    s.from('embajadores_recompensas').select('embajador_id, escalon').limit(5000),
  ])

  const ahora = Date.now()
  type I = { id: string; token: string; nombre: string; genero: 'f' | 'm'; oficio: string; telefono: string | null; email: string | null
    estado: string; creada_at: string; caduca_at: string; aceptada_por: string | null; aceptada_at: string | null }
  const filas: FilaInvitacion[] = ((invitaciones ?? []) as I[]).map(i => ({
    ...i,
    estado: i.estado === 'pendiente' && Date.parse(i.caduca_at) < ahora ? 'caducada' : i.estado,
  }))

  // Embajadores: invitaciones aceptadas con su membresía.
  type M = { profile_id: string; hasta: string; renunciada_at: string | null; honor_at: string | null }
  const porPerfil = new Map(((membresias ?? []) as M[]).map(m => [m.profile_id, m]))
  const embajadoresBD: EmbajadorBD[] = filas
    .filter(f => f.estado === 'aceptada' && f.aceptada_por && porPerfil.has(f.aceptada_por))
    .map(f => {
      const m = porPerfil.get(f.aceptada_por!)!
      return { profile_id: f.aceptada_por!, nombre: f.nombre, genero: f.genero, aceptada_at: f.aceptada_at, hasta: m.hasta, renunciada_at: m.renunciada_at, honor_at: m.honor_at }
    })

  const listaColegas = (colegas ?? []) as ColegaEmbajadorBD[]
  const ids = listaColegas.map(c => c.profile_id)
  const [{ data: perfiles }, { data: subs }, { data: cortEmb }, { data: cortElenco }] = await Promise.all([
    ids.length ? s.from('profiles').select('id, plan').in('id', ids) : Promise.resolve({ data: [] }),
    ids.length ? s.from('subscriptions').select('profile_id, plan, status, stripe_price_id, created_at').in('profile_id', ids) : Promise.resolve({ data: [] }),
    ids.length ? s.from('membresias_cortesia').select('profile_id, plan').in('profile_id', ids).gt('hasta', ahoraIso).is('renunciada_at', null) : Promise.resolve({ data: [] }),
    ids.length ? s.from('elenco_cortesias').select('profile_id, plan').in('profile_id', ids).lte('desde', ahoraIso).gt('hasta', ahoraIso) : Promise.resolve({ data: [] }),
  ])
  const escalones = new Map<string, number>()
  for (const r of (recompensas ?? []) as { embajador_id: string; escalon: number }[]) {
    escalones.set(r.embajador_id, Math.max(escalones.get(r.embajador_id) ?? 0, r.escalon))
  }
  const cortesias = new Map<string, string>()
  for (const c of [...((cortEmb ?? []) as { profile_id: string; plan: string }[]), ...((cortElenco ?? []) as { profile_id: string; plan: string }[])]) {
    cortesias.set(c.profile_id, c.plan)
  }

  const { filas: embajadores, totales } = construirPanelEmbajadores({
    embajadores: embajadoresBD,
    colegas: listaColegas,
    planes: new Map(((perfiles ?? []) as { id: string; plan: string }[]).map(p => [p.id, p.plan])),
    suscripciones: new Map(((subs ?? []) as (Suscripcion & { profile_id: string })[]).map(x => [x.profile_id, x])),
    cortesias,
    escalones,
    ahora,
  })
  const ocupadas = plazasOcupadas((invitaciones ?? []) as I[], ahora)

  return (
    <Marco>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Embajadores de Escena</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Invitaciones personales: un año de Destacado por cortesía, sin tarjeta y sin compromiso. Sus colegas, tres meses de Premium o Empresas; su actividad renueva la membresía (5, 10 y 25 puntos). Todo lo de esta página es interno.</span>
        </div>
        <div className="admin-header-actions">
          <Link href="/admin" className="table-link">← Master Control</Link>
        </div>
      </div>

      <div className="obras-stat-grid obras-stat-grid--4">
        <div className="obras-stat-card"><div className="obras-stat-label">Plazas ocupadas</div><div className="obras-stat-value">{ocupadas}/{PLAZAS_FUNDADORAS}</div></div>
        <div className="obras-stat-card"><div className="obras-stat-label">Embajadores</div><div className="obras-stat-value obras-stat-value--green">{totales.embajadores}</div></div>
        <div className="obras-stat-card"><div className="obras-stat-label">Colegas registrados</div><div className="obras-stat-value">{totales.registrados}</div><div style={{ fontSize: '12px', color: 'var(--muted)' }}>{totales.activos} activos</div></div>
        <div className="obras-stat-card"><div className="obras-stat-label">Colegas de pago</div><div className="obras-stat-value obras-stat-value--amber">{totales.dePago}</div><div style={{ fontSize: '12px', color: 'var(--muted)' }}>Suscripción activa o en prueba</div></div>
      </div>

      <PanelEmbajadores invitaciones={filas} embajadores={embajadores} />
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
