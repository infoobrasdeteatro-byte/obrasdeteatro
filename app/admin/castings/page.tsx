import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import ColaModeracion from './ColaModeracion'
import type { CastingPendiente } from './ColaModeracion'

export const metadata: Metadata = {
  title: 'Moderación de castings | ObrasDeTeatro',
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
 * Panel de moderación de castings. Ruta de administración, fuera del
 * dashboard normal y sin enlace en ninguna navegación: se llega por URL. Sirve en vivo que la RLS de moderación
 * (migración 20260911202739) y el guard del trigger
 * (20260911141543) se comportan como se diseñaron: todas las lecturas y
 * escrituras viajan con la sesión del usuario, nunca con service role.
 */
export default async function ModeracionCastingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: roles } = await supabase
    .from('profile_roles')
    .select('role')
    .eq('profile_id', user.id)
    .in('role', ['admin', 'moderator'])

  const rolesModeracion = roles ?? []

  if (rolesModeracion.length === 0) {
    return (
      <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
        <NavAutenticado />
        <div className="app-layout">
          <Sidebar />
          <main className="app-main">
            <div className="page-header">
              <h1 className="page-title">Acceso restringido</h1>
            </div>
            <div className="obras-empty">
              <p className="obras-empty-text">
                Esta página es del equipo de moderación. Tu cuenta no tiene el rol
                <strong style={{ color: 'var(--text)' }}> admin </strong>ni
                <strong style={{ color: 'var(--text)' }}> moderator</strong>, así que no
                puede revisar convocatorias ajenas.
              </p>
              <Link
                href="/dashboard"
                className="ds-btn-secondary"
                style={{ width: 'auto', display: 'inline-flex', padding: '10px 24px' }}
              >
                Volver al inicio
              </Link>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const { data: castings, error } = await supabase
    .from('castings')
    .select(
      'id, titulo, nombre_proyecto, entidad_organizadora, descripcion, sinopsis, fecha_apertura, fecha_cierre, created_at, user_id, motivo_filtro'
    )
    .eq('estado', 'pendiente_revision')
    .order('created_at', { ascending: true })

  const filas = castings ?? []

  // El organizador se resuelve en una segunda consulta en vez de con un embed
  // de PostgREST: el join viaja igualmente bajo la RLS del usuario, y así el
  // panel deja ver sin ambigüedad qué perfiles puede leer moderación y cuáles
  // no. Un perfil ausente se muestra como organizador sin identificar, nunca
  // se inventa un nombre.
  const idsOrganizadores = [...new Set(filas.map(c => c.user_id))]
  const { data: perfiles } = idsOrganizadores.length
    ? await supabase
        .from('profiles')
        .select('id, nombre, apellidos, tipo_perfil')
        .in('id', idsOrganizadores)
    : { data: [] }

  const porId = new Map((perfiles ?? []).map(p => [p.id, p]))

  const pendientes: CastingPendiente[] = filas.map(casting => {
    const perfil = porId.get(casting.user_id)
    const nombreCompleto = perfil
      ? [perfil.nombre, perfil.apellidos].filter(Boolean).join(' ').trim()
      : ''

    return {
      id: casting.id,
      titulo: casting.titulo,
      nombreProyecto: casting.nombre_proyecto,
      entidadOrganizadora: casting.entidad_organizadora,
      descripcion: casting.descripcion,
      sinopsis: casting.sinopsis,
      fechaApertura: casting.fecha_apertura,
      fechaCierre: casting.fecha_cierre,
      creadoEn: casting.created_at,
      motivoFiltro: casting.motivo_filtro,
      organizadorNombre: nombreCompleto.length > 0 ? nombreCompleto : null,
      organizadorTipo: perfil ? (TIPO_PERFIL_LABEL[perfil.tipo_perfil] ?? perfil.tipo_perfil) : null,
    }
  })

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Moderación de castings</h1>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Convocatorias en espera de revisión, de la más antigua a la más reciente.
              </span>
            </div>
            <span
              className="status-pill status-pill--draft"
              style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.04em' }}
            >
              ADMINISTRACIÓN
            </span>
          </div>

          {error && (
            <div className="ds-alert-error" style={{ marginBottom: '20px' }}>
              No se pudo leer la cola de revisión: {error.message}
            </div>
          )}

          <ColaModeracion pendientes={pendientes} />

        </main>
      </div>
    </div>
  )
}
