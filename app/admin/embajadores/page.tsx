import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { SupabaseClient } from '@supabase/supabase-js'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import PanelEmbajadores, { type FilaInvitacion, type FilaEmbajador } from './PanelEmbajadores'
import { PLAZAS_FUNDADORAS } from '@/lib/embajadores/textos'

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
  const [{ data: invitaciones }, { data: cortesias }, { data: subs }] = await Promise.all([
    s.from('embajadores_invitaciones')
      .select('id, token, nombre, genero, oficio, telefono, email, estado, creada_at, caduca_at, aceptada_por, aceptada_at')
      .order('creada_at', { ascending: false }).limit(500),
    s.from('membresias_cortesia').select('profile_id, tipo, hasta, renunciada_at, referido_por').limit(5000),
    s.from('subscriptions').select('profile_id, status').in('status', ['active', 'trialing', 'past_due']).limit(5000),
  ])

  const ahora = Date.now()
  const pagando = new Set(((subs ?? []) as { profile_id: string }[]).map(x => x.profile_id))
  type C = { profile_id: string; tipo: string; hasta: string; renunciada_at: string | null; referido_por: string | null }
  const filasC = (cortesias ?? []) as C[]

  // Estadísticas internas por embajador/a: colegas que han entrado con su código y cuántos pagan.
  const porEmbajador = new Map<string, { referidos: number; pagan: number }>()
  for (const c of filasC) {
    if (c.tipo !== 'referido' || !c.referido_por) continue
    const e = porEmbajador.get(c.referido_por) ?? { referidos: 0, pagan: 0 }
    e.referidos++
    if (pagando.has(c.profile_id)) e.pagan++
    porEmbajador.set(c.referido_por, e)
  }
  const activa = new Map(filasC.filter(c => c.tipo === 'embajador').map(c => [c.profile_id, c.renunciada_at ? 'renuncio' : Date.parse(c.hasta) > ahora ? 'activa' : 'vencida']))

  type I = { id: string; token: string; nombre: string; genero: 'f' | 'm'; oficio: string; telefono: string | null; email: string | null
    estado: string; creada_at: string; caduca_at: string; aceptada_por: string | null; aceptada_at: string | null }
  const filas: FilaInvitacion[] = ((invitaciones ?? []) as I[]).map(i => ({
    ...i,
    estado: i.estado === 'pendiente' && Date.parse(i.caduca_at) < ahora ? 'caducada' : i.estado,
  }))
  const embajadores: FilaEmbajador[] = filas.filter(f => f.estado === 'aceptada' && f.aceptada_por).map(f => ({
    nombre: f.nombre, genero: f.genero,
    situacion: activa.get(f.aceptada_por!) ?? 'activa',
    referidos: porEmbajador.get(f.aceptada_por!)?.referidos ?? 0,
    pagan: porEmbajador.get(f.aceptada_por!)?.pagan ?? 0,
  }))
  const ocupadas = filas.filter(f => f.estado === 'aceptada' || f.estado === 'pendiente').length

  return (
    <Marco>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Embajadores de Escena</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Invitaciones personales: un año de Destacado por cortesía, sin tarjeta y sin compromiso. Todo lo de esta página es interno.</span>
        </div>
      </div>

      <div className="obras-stat-grid obras-stat-grid--4">
        <div className="obras-stat-card"><div className="obras-stat-label">Plazas ocupadas</div><div className="obras-stat-value">{ocupadas}/{PLAZAS_FUNDADORAS}</div></div>
        <div className="obras-stat-card"><div className="obras-stat-label">Embajadores</div><div className="obras-stat-value obras-stat-value--green">{embajadores.length}</div></div>
        <div className="obras-stat-card"><div className="obras-stat-label">Colegas referidos</div><div className="obras-stat-value">{embajadores.reduce((t, e) => t + e.referidos, 0)}</div></div>
        <div className="obras-stat-card"><div className="obras-stat-label">Referidos que pagan</div><div className="obras-stat-value obras-stat-value--amber">{embajadores.reduce((t, e) => t + e.pagan, 0)}</div></div>
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
