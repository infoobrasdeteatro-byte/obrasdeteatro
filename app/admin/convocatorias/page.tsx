import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import ColaModeracion, { type ConvocatoriaPendiente } from './ColaModeracion'

export const metadata: Metadata = {
  title: 'Moderación de convocatorias | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

const TIPO_PERFIL_LABEL: Record<string, string> = {
  actor:        'Actor / Actriz',
  director:     'Director/a',
  dramaturgo:   'Dramaturgo/a',
  compania:     'Compañía de teatro',
  productora:   'Productora',
  teatro:       'Teatro / Sala',
  festival:     'Festival',
  escuela:      'Escuela de artes escénicas',
  institucion:  'Institución pública',
  profesional:  'Profesional escénico',
  publico:      'Público general',
}

/**
 * Cola de moderación de convocatorias. Ruta de administración, mismo prefijo y
 * mismo guard que /admin/castings: sin enlace en ninguna navegación, se llega
 * por URL.
 *
 * El guard de rol de esta página NO es la seguridad. La política
 * «Moderación gestiona convocatorias» (es_moderador()) es quien deja leer las
 * ajenas, y el trigger es quien deja fijar 'publicado'. Quien no modere
 * recibiría cero filas aunque se saltara esta pantalla; el guard solo existe
 * para explicar por qué no ve nada.
 *
 * Todas las lecturas y escrituras viajan con la sesión del usuario, nunca con
 * service role: así el panel sirve de prueba en vivo de que la RLS y el guard
 * del trigger se comportan como se diseñaron.
 *
 * Orden ASCENDENTE por entrada en cola: primero lo que lleva más esperando.
 */
export default async function ModeracionConvocatoriasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: roles } = await supabase
    .from('profile_roles')
    .select('role')
    .eq('profile_id', user.id)
    .in('role', ['admin', 'moderator'])

  if ((roles ?? []).length === 0) {
    return (
      <Marco>
        <div className="page-header">
          <h1 className="page-title">Acceso restringido</h1>
        </div>
        <div className="obras-empty">
          <p className="obras-empty-text">
            Esta página es del equipo de moderación. Tu cuenta no tiene el rol
            <strong style={{ color: 'var(--text)' }}> admin </strong>ni
            <strong style={{ color: 'var(--text)' }}> moderator</strong>, así que no puede
            revisar convocatorias ajenas.
          </p>
          <Link href="/dashboard" className="ds-btn-secondary"
            style={{ width: 'auto', display: 'inline-flex', padding: '10px 24px' }}>
            Volver al inicio
          </Link>
        </div>
      </Marco>
    )
  }

  const { data: filas, error } = await supabase
    .from('calls')
    .select('id, title, description, category, location, deadline, prize, created_at, moderacion_entrada_at, motivo_filtro, profile_id')
    .eq('estado', 'pendiente_revision')
    .is('deleted_at', null)
    .order('moderacion_entrada_at', { ascending: true, nullsFirst: true })

  const lista = filas ?? []

  // El organizador se resuelve en una segunda consulta en vez de con un embed
  // de PostgREST: el join viaja igualmente bajo la RLS del usuario, y así el
  // panel deja ver sin ambigüedad qué perfiles puede leer moderación. Un
  // perfil ausente se muestra como organizador sin identificar.
  const idsOrganizadores = [...new Set(lista.map(c => c.profile_id))]
  const { data: perfiles } = idsOrganizadores.length
    ? await supabase
        .from('profiles')
        .select('id, nombre, apellidos, tipo_perfil')
        .in('id', idsOrganizadores)
    : { data: [] as { id: string; nombre: string | null; apellidos: string | null; tipo_perfil: string }[] }

  const porId = new Map((perfiles ?? []).map(p => [p.id, p]))

  const pendientes: ConvocatoriaPendiente[] = lista.map(c => {
    const perfil = porId.get(c.profile_id)
    const nombre = perfil ? [perfil.nombre, perfil.apellidos].filter(Boolean).join(' ').trim() : ''

    return {
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      location: c.location,
      deadline: c.deadline,
      prize: c.prize,
      creadaEn: c.created_at,
      entradaEnCola: c.moderacion_entrada_at,
      motivoFiltro: c.motivo_filtro,
      organizadorNombre: nombre.length > 0 ? nombre : null,
      organizadorTipo: perfil ? (TIPO_PERFIL_LABEL[perfil.tipo_perfil] ?? perfil.tipo_perfil) : null,
    }
  })

  return (
    <Marco>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Moderación de convocatorias</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Convocatorias en espera de revisión, de la más antigua a la más reciente.
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/admin/castings" className="table-link">Cola de castings →</Link>
          <span className="status-pill status-pill--draft"
            style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.04em' }}>
            ADMINISTRACIÓN
          </span>
        </div>
      </div>

      {error && (
        <div className="ds-alert-error" style={{ marginBottom: '20px' }}>
          No se pudo leer la cola de revisión: {error.message}
        </div>
      )}

      <ColaModeracion pendientes={pendientes} />
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
