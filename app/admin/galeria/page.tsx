import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import { BUCKET_GALERIA, urlPublica, analizarVideo, miniaturaVideo } from '@/lib/perfil-multimedia/multimedia'
import { fechaHora } from '@/components/shared/formato'
import RetirarContenido, { type FilaAdmin } from './RetirarContenido'

export const metadata: Metadata = {
  title: 'Galerías de perfiles | Administración | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

const LIMITE = 50

/**
 * Retirada de fotos, vídeos y proyectos de los perfiles. Las fotos se
 * publican al momento, sin cola: esta página es el control posterior.
 *
 * Mismo patrón que el resto de /admin: el guard de rol solo explica; la
 * seguridad la ponen las políticas de moderación de las tablas y del bucket.
 * Todo con la sesión del moderador.
 */
export default async function AdminGaleriaPage() {
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

  const [{ data: fotos }, { data: videos }, { data: proyectos }] = await Promise.all([
    supabase.from('perfil_galeria_fotos').select('id, profile_id, ruta, pie, created_at').order('created_at', { ascending: false }).limit(LIMITE),
    supabase.from('perfil_galeria_videos').select('id, profile_id, url, titulo, created_at').order('created_at', { ascending: false }).limit(LIMITE),
    supabase.from('perfil_portfolio').select('id, profile_id, titulo, imagen_ruta, enlace, created_at').order('created_at', { ascending: false }).limit(LIMITE),
  ])

  const ids = [...new Set([...(fotos ?? []), ...(videos ?? []), ...(proyectos ?? [])].map(x => x.profile_id))]
  const { data: perfiles } = ids.length
    ? await supabase.from('profiles').select('id, nombre, apellidos, nombre_artistico, slug').in('id', ids)
    : { data: [] as { id: string; nombre: string | null; apellidos: string | null; nombre_artistico: string | null; slug: string | null }[] }
  const perfil = new Map((perfiles ?? []).map(p => [p.id, p]))
  const nombre = (id: string) => {
    const p = perfil.get(id)
    return p ? (p.nombre_artistico || [p.nombre, p.apellidos].filter(Boolean).join(' ') || 'Sin nombre') : 'Perfil desconocido'
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const filas: (FilaAdmin & { orden: string })[] = [
    ...(fotos ?? []).map(f => ({
      orden: f.created_at, clave: `foto-${f.id}`, elemento: { tipo: 'foto' as const, id: f.id, ruta: f.ruta },
      tipoEtiqueta: 'Foto', descripcion: f.pie ?? 'Sin pie de foto', miniatura: urlPublica(base, BUCKET_GALERIA, f.ruta),
      enlace: urlPublica(base, BUCKET_GALERIA, f.ruta),
      perfilNombre: nombre(f.profile_id), perfilSlug: perfil.get(f.profile_id)?.slug ?? null, creado: fechaHora(f.created_at),
    })),
    ...(videos ?? []).map(v => {
      const a = analizarVideo(v.url)
      return {
        orden: v.created_at, clave: `video-${v.id}`, elemento: { tipo: 'video' as const, id: v.id },
        tipoEtiqueta: 'Vídeo', descripcion: v.titulo ?? v.url, miniatura: a ? miniaturaVideo(a) : null, enlace: v.url,
        perfilNombre: nombre(v.profile_id), perfilSlug: perfil.get(v.profile_id)?.slug ?? null, creado: fechaHora(v.created_at),
      }
    }),
    ...(proyectos ?? []).map(p => ({
      orden: p.created_at, clave: `proyecto-${p.id}`, elemento: { tipo: 'proyecto' as const, id: p.id, imagen_ruta: p.imagen_ruta },
      tipoEtiqueta: 'Proyecto', descripcion: p.titulo,
      miniatura: p.imagen_ruta ? urlPublica(base, BUCKET_GALERIA, p.imagen_ruta) : null, enlace: p.enlace,
      perfilNombre: nombre(p.profile_id), perfilSlug: perfil.get(p.profile_id)?.slug ?? null, creado: fechaHora(p.created_at),
    })),
  ].sort((a, b) => b.orden.localeCompare(a.orden))

  return (
    <Marco>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Galerías de perfiles</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Últimas fotos, vídeos y proyectos subidos (se publican al momento). Retirar borra la fila y el archivo.
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/admin/convocatorias" className="table-link">Convocatorias →</Link>
          <Link href="/admin/espacios" className="table-link">Espacios escénicos →</Link>
          <span className="status-pill status-pill--draft" style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.04em' }}>ADMINISTRACIÓN</span>
        </div>
      </div>
      <RetirarContenido filas={filas} />
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
