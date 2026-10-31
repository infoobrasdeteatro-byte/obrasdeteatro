import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { SupabaseClient } from '@supabase/supabase-js'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import PanelElenco, { type Espectaculo } from './PanelElenco'
import { construirPanel, type ColegaBD, type FundadorBD } from '@/lib/elenco/admin'
import type { Suscripcion } from '@/lib/elenco/origen-plan'

export const metadata: Metadata = { title: 'Elenco Fundador | Administración | ObrasDeTeatro', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/** Elenco Fundador: invitaciones 001–100, referidos, puntos, escalones y bono. Solo administración. */
export default async function AdminElencoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/elenco')
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
  const ahora = new Date().toISOString()
  const [{ data: fundadores }, { data: colegas }, { data: recompensas }, { data: usos }, { data: bonos }] = await Promise.all([
    s.from('elenco_fundadores')
      .select('id, numero, token, nombre, tipo, oficio, telefono, email, nota, estado, creada_at, aceptada_por, aceptada_at, bono_activado_at')
      .order('numero').limit(500),
    s.from('elenco_colegas').select('fundador_id, profile_id, alta, nombre, tipo_perfil, clase, activo, puntos').limit(10000),
    s.from('elenco_recompensas').select('fundador_id, escalon, semanas_cartelera').limit(1000),
    s.from('elenco_cartelera_usos').select('fundador_id').limit(5000),
    s.from('elenco_cortesias').select('fundador_id, hasta').eq('motivo', 'bono').limit(1000),
  ])

  const listaColegas = (colegas ?? []) as ColegaBD[]
  const fundadoresBD = (fundadores ?? []) as FundadorBD[]
  const ids = listaColegas.map(c => c.profile_id)
  const titulares = fundadoresBD.map(f => f.aceptada_por).filter((x): x is string => !!x)

  const [{ data: perfiles }, { data: subs }, { data: cortEmb }, { data: cortElenco }, { data: espectaculos }] = await Promise.all([
    ids.length ? s.from('profiles').select('id, plan').in('id', ids) : Promise.resolve({ data: [] }),
    ids.length ? s.from('subscriptions').select('profile_id, plan, status, stripe_price_id, created_at').in('profile_id', ids) : Promise.resolve({ data: [] }),
    ids.length ? s.from('membresias_cortesia').select('profile_id, plan').in('profile_id', ids).gt('hasta', ahora).is('renunciada_at', null) : Promise.resolve({ data: [] }),
    ids.length ? s.from('elenco_cortesias').select('profile_id, plan').in('profile_id', ids).lte('desde', ahora).gt('hasta', ahora) : Promise.resolve({ data: [] }),
    titulares.length ? s.from('espectaculos').select('id, titulo, user_id').in('user_id', titulares).limit(1000) : Promise.resolve({ data: [] }),
  ])

  const escalones = new Map<string, number>()
  const semanas = new Map<string, number>()
  for (const r of (recompensas ?? []) as { fundador_id: string; escalon: number; semanas_cartelera: number }[]) {
    escalones.set(r.fundador_id, Math.max(escalones.get(r.fundador_id) ?? 0, r.escalon))
    semanas.set(r.fundador_id, (semanas.get(r.fundador_id) ?? 0) + r.semanas_cartelera)
  }
  for (const u of (usos ?? []) as { fundador_id: string }[]) semanas.set(u.fundador_id, (semanas.get(u.fundador_id) ?? 0) - 1)
  const bonoHasta = new Map<string, string>()
  for (const b of (bonos ?? []) as { fundador_id: string; hasta: string }[]) {
    const prev = bonoHasta.get(b.fundador_id)
    if (!prev || b.hasta > prev) bonoHasta.set(b.fundador_id, b.hasta)
  }
  const cortesias = new Map<string, string>()
  for (const c of [...((cortEmb ?? []) as { profile_id: string; plan: string }[]), ...((cortElenco ?? []) as { profile_id: string; plan: string }[])]) {
    cortesias.set(c.profile_id, c.plan)
  }

  const { filas, totales } = construirPanel({
    fundadores: fundadoresBD,
    colegas: listaColegas,
    planes: new Map(((perfiles ?? []) as { id: string; plan: string }[]).map(p => [p.id, p.plan])),
    suscripciones: new Map(((subs ?? []) as (Suscripcion & { profile_id: string })[]).map(x => [x.profile_id, x])),
    cortesias,
    escalones,
    semanasPendientes: semanas,
    bonoHasta,
    ahora: Date.now(),
  })

  const porTitular = new Map<string, Espectaculo[]>()
  for (const e of (espectaculos ?? []) as { id: string; titulo: string; user_id: string }[]) {
    porTitular.set(e.user_id, [...(porTitular.get(e.user_id) ?? []), { id: e.id, titulo: e.titulo }])
  }
  const espectaculosPorFundador: Record<string, Espectaculo[]> = {}
  for (const f of filas) if (f.aceptadaPor) espectaculosPorFundador[f.id] = porTitular.get(f.aceptadaPor) ?? []
  const ocupadas = filas.length

  return (
    <Marco>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Elenco Fundador</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Invitaciones personales numeradas del 001 al 100. Plan de base gratuito; bono, escalera y referidos. Todo lo de esta página es interno.</span>
        </div>
        <div className="admin-header-actions">
          <Link href="/admin" className="table-link">← Master Control</Link>
        </div>
      </div>

      <div className="obras-stat-grid obras-stat-grid--4">
        <div className="obras-stat-card"><div className="obras-stat-label">Fundadores</div><div className="obras-stat-value obras-stat-value--green">{totales.fundadores}</div><div style={{ fontSize: '12px', color: 'var(--muted)' }}>{ocupadas}/100 plazas ocupadas</div></div>
        <div className="obras-stat-card"><div className="obras-stat-label">Referidos registrados</div><div className="obras-stat-value">{totales.registrados}</div><div style={{ fontSize: '12px', color: 'var(--muted)' }}>{totales.activos} activos</div></div>
        <div className="obras-stat-card"><div className="obras-stat-label">Referidos de pago</div><div className="obras-stat-value obras-stat-value--amber">{totales.dePago}</div></div>
        <div className="obras-stat-card"><div className="obras-stat-label">Ingresos mensuales</div><div className="obras-stat-value">{totales.ingresosMensuales.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div><div style={{ fontSize: '12px', color: 'var(--muted)' }}>A precio de tarifa; anuales ÷ 12</div></div>
      </div>

      <PanelElenco filas={filas} espectaculos={espectaculosPorFundador} />
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
