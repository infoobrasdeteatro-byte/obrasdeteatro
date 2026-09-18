import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import BandejaList, { type PostulacionRecibida } from './BandejaList'
import { leerCursor, escribirCursor } from '@/components/shared/cursor'

export const metadata: Metadata = {
  title: 'Postulaciones recibidas | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

const TAMANO_PAGINA = 20

type Props = {
  searchParams: Promise<{ casting?: string; status?: string; cursor?: string }>
}

/**
 * Bandeja de postulaciones recibidas.
 *
 * Una sola pantalla para todos los castings del organizador: con cientos
 * de castings, entrar uno a uno no sería manejable.
 *
 * La página NO consulta casting_applications directamente: llama a
 * public.bandeja_postulaciones(), que fija la forma del plan de consulta. La
 * misma consulta como join embebido de PostgREST cuesta 65 ms donde esta
 * cuesta 8 (medido sobre 2.401 filas) porque el planificador pierde el
 * recorrido ordenado del índice.
 */
export default async function PostulacionesRecibidasPage({ searchParams }: Props) {
  const { casting, status, cursor } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const c = leerCursor(cursor)

  // Se pide una fila de más que el tamaño de página: si llega, hay siguiente.
  const { data: pagina, error } = await supabase.rpc('bandeja_postulaciones', {
    p_casting: casting || undefined,
    p_status: status || undefined,
    p_cursor_applied_at: c?.appliedAt,
    p_cursor_id: c?.id,
    p_limite: TAMANO_PAGINA + 1,
  })

  const filas = pagina ?? []
  const haySiguiente = filas.length > TAMANO_PAGINA
  const visibles = haySiguiente ? filas.slice(0, TAMANO_PAGINA) : filas
  const ultima = visibles[visibles.length - 1]

  // Los castings propios, para el selector de filtro.
  const { data: misCastings } = await supabase
    .from('castings')
    .select('id, titulo')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Datos de los postulantes de ESTA página. Dos consultas por lote en vez de
  // una por fila: son búsquedas por clave primaria, indexadas.
  const idsPostulantes = [...new Set(visibles.map(f => f.applicant_id))]
  const idsCastings = [...new Set(visibles.map(f => f.casting_id))]

  const [{ data: perfiles }, { data: actores }, { data: castingsDeLaPagina }] = await Promise.all([
    idsPostulantes.length
      ? supabase.from('profiles').select('id, nombre, apellidos, slug').in('id', idsPostulantes)
      : Promise.resolve({ data: [] as { id: string; nombre: string | null; apellidos: string | null; slug: string | null }[] }),
    idsPostulantes.length
      ? supabase.from('perfil_actor').select('*').in('user_id', idsPostulantes)
      : Promise.resolve({ data: [] as Record<string, never>[] }),
    idsCastings.length
      ? supabase.from('castings').select('id, titulo').in('id', idsCastings)
      : Promise.resolve({ data: [] as { id: string; titulo: string }[] }),
  ])

  const porPerfil = new Map((perfiles ?? []).map(p => [p.id, p]))
  const porActor = new Map((actores ?? []).map(a => [a.user_id as string, a]))
  const porCasting = new Map((castingsDeLaPagina ?? []).map(x => [x.id, x.titulo]))

  const postulaciones: PostulacionRecibida[] = visibles.map(f => {
    const perfil = porPerfil.get(f.applicant_id)
    const actor = porActor.get(f.applicant_id)
    const nombre = perfil
      ? [perfil.nombre, perfil.apellidos].filter(Boolean).join(' ').trim()
      : ''

    return {
      id: f.id,
      castingId: f.casting_id,
      castingTitulo: porCasting.get(f.casting_id) ?? 'Casting',
      status: f.status ?? 'pending',
      appliedAt: f.applied_at,
      coverLetter: f.cover_letter,
      portfolioUrl: f.portfolio_url,
      notes: f.notes,
      nombre: nombre.length > 0 ? nombre : null,
      slug: perfil?.slug ?? null,
      actor: actor ? mapearActor(actor) : null,
    }
  })

  const queryBase = new URLSearchParams()
  if (casting) queryBase.set('casting', casting)
  if (status) queryBase.set('status', status)
  const siguienteHref = haySiguiente && ultima?.applied_at
    ? `?${new URLSearchParams({ ...Object.fromEntries(queryBase), cursor: escribirCursor(ultima.applied_at, ultima.id) })}`
    : null

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Postulaciones recibidas</h1>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Candidaturas a todos tus castings, de la más reciente a la más antigua.
              </span>
            </div>
          </div>

          <form method="get" className="account-card" style={{ marginBottom: '20px' }}>
            <div className="ds-form-grid">
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="casting">Casting</label>
                <select id="casting" name="casting" className="ds-select" defaultValue={casting ?? ''}>
                  <option value="">Todas</option>
                  {(misCastings ?? []).map(mc => (
                    <option key={mc.id} value={mc.id}>{mc.titulo}</option>
                  ))}
                </select>
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="status">Estado</label>
                <select id="status" name="status" className="ds-select" defaultValue={status ?? ''}>
                  <option value="">Todos</option>
                  <option value="pending">Pendiente</option>
                  <option value="reviewed">Revisada</option>
                  <option value="selected">Seleccionada</option>
                  <option value="rejected">Descartada</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '14px' }}>
              <button type="submit" className="ds-btn-primary"
                style={{ width: 'auto', padding: '10px 22px', fontSize: '13px' }}>
                Filtrar
              </button>
              {(casting || status) && (
                <Link href="/mis-castings/postulaciones" className="table-link">Quitar filtros</Link>
              )}
            </div>
          </form>

          {error && (
            <div className="ds-alert-error" style={{ marginBottom: '16px' }}>
              No se pudieron cargar las postulaciones: {error.message}
            </div>
          )}

          <BandejaList postulaciones={postulaciones} />

          {siguienteHref && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
              <Link href={siguienteHref} className="ds-btn-secondary" style={{ padding: '10px 24px' }}>
                Ver más antiguas →
              </Link>
            </div>
          )}

          {cursor && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
              <Link href={`/mis-castings/postulaciones?${queryBase}`} className="table-link">
                Volver al principio
              </Link>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapearActor(a: any) {
  return {
    fotoPrincipal: a.foto_principal ?? null,
    biografia: a.biografia ?? null,
    experiencia: a.experiencia ?? null,
    formacion: a.formacion ?? null,
    idiomas: (a.idiomas ?? null) as string[] | null,
    otrasHabilidades: a.otras_habilidades ?? null,
    habilidades: [
      a.habilidad_canto && 'Canto',
      a.habilidad_danza && 'Danza',
      a.habilidad_improvisacion && 'Improvisación',
      a.habilidad_esgrima && 'Esgrima',
      a.habilidad_musical && 'Música',
      a.habilidad_doblaje && 'Doblaje',
      a.habilidad_presentacion && 'Presentación',
      a.habilidad_magia && 'Magia',
      a.habilidad_circo && 'Circo',
    ].filter(Boolean) as string[],
    disponibilidad: [
      a.disp_castings && 'Castings',
      a.disp_teatro && 'Teatro',
      a.disp_cine && 'Cine',
      a.disp_television && 'Televisión',
      a.disp_publicidad && 'Publicidad',
      a.disp_giras && 'Giras',
      a.disp_internacional && 'Internacional',
    ].filter(Boolean) as string[],
    // Contacto: SOLO lo que el propio actor haya marcado como visible. La
    // interfaz no decide nada aquí; si la bandera está en false, el dato no
    // sale de esta función.
    email: a.mostrar_email ? (a.email_profesional ?? null) : null,
    telefono: a.mostrar_telefono ? (a.telefono ?? null) : null,
    whatsapp: a.mostrar_whatsapp ? (a.whatsapp ?? null) : null,
    redes: a.mostrar_redes
      ? ([
          a.instagram && { red: 'Instagram', valor: a.instagram as string },
          a.facebook && { red: 'Facebook', valor: a.facebook as string },
          a.tiktok && { red: 'TikTok', valor: a.tiktok as string },
          a.linkedin && { red: 'LinkedIn', valor: a.linkedin as string },
          a.youtube && { red: 'YouTube', valor: a.youtube as string },
          a.web && { red: 'Web', valor: a.web as string },
        ].filter(Boolean) as { red: string; valor: string }[])
      : [],
  }
}
