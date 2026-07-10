import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import PerfilForm from '@/app/perfil/PerfilForm'
import FormacionPremiosEditor from '@/app/perfil/FormacionPremiosEditor'
import EspecialidadesEditor from '@/app/perfil/EspecialidadesEditor'
import ExperienciaEditor from '@/app/perfil/ExperienciaEditor'
import RedesEditor from '@/app/perfil/RedesEditor'
import DisponibilidadEditor from '@/app/perfil/DisponibilidadEditor'

// ── Block metadata ────────────────────────────────────────────────────────────

const BLOCK_META: Record<string, { title: string; description: string }> = {
  '1': { title: 'Información Personal',    description: 'Nombre, avatar, biografía breve y ubicación geográfica'           },
  '2': { title: 'Formación y Premios',     description: 'Estudios, cursos, talleres y reconocimientos profesionales'        },
  '3': { title: 'Especialidades',          description: 'Géneros y áreas de especialización escénica'                       },
  '4': { title: 'Experiencia Profesional', description: 'Trayectoria y experiencia en el sector escénico'                   },
  '5': { title: 'Material Audiovisual',    description: 'Foto de perfil, portada y galería de imágenes'                     },
  '6': { title: 'Redes y Contacto',        description: 'Web profesional y redes sociales'                                  },
  '7': { title: 'Disponibilidad',          description: 'Disponibilidad para proyectos, giras y colaboraciones'              },
  '8': { title: 'Documentación',           description: 'CV descargable y dossier artístico profesional'                    },
  '9': { title: 'Perfil Verificado',       description: 'Solicitar verificación de identidad profesional'                   },
}

type SocialLinks = Partial<Record<'instagram' | 'linkedin' | 'twitter' | 'facebook' | 'tiktok' | 'youtube', string>>

type Props = { params: Promise<{ n: string }> }

export default async function BloqueEditorPage({ params }: Props) {
  const { n } = await params

  if (!BLOCK_META[n]) notFound()
  const meta = BLOCK_META[n]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nombre, apellidos, nombre_artistico, bio, pais, ciudad, country_code, region, postal_code, tipo_perfil, perfil_publico, slug, avatar_url, plan, website_url, social_links')
    .eq('id', user.id)
    .single()

  function Layout({ children }: { children: ReactNode }) {
    return (
      <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
        <NavAutenticado />
        <div className="app-layout">
          <Sidebar />
          <main className="app-main">
            <div className="page-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <Link
                href="/perfil"
                style={{ fontSize: '12px', color: 'var(--muted)', textDecoration: 'none', fontFamily: 'var(--sans)', letterSpacing: '0.01em' }}
              >
                ← Mi perfil
              </Link>
              <h1 className="page-title">
                <span style={{ color: 'var(--muted)', fontWeight: 400, marginRight: '8px' }}>B{n}</span>
                {meta.title}
              </h1>
            </div>
            {children}
          </main>
        </div>
      </div>
    )
  }

  // ── B1: Información Personal ──────────────────────────────────────────────
  if (n === '1') {
    return (
      <Layout>
        <PerfilForm profile={profile} />
      </Layout>
    )
  }

  // ── B2: Formación y Premios ───────────────────────────────────────────────
  if (n === '2') {
    const [{ data: training }, { data: awards }] = await Promise.all([
      supabase
        .from('profile_training')
        .select('id, titulo, institucion, fecha_inicio, fecha_fin, en_curso, descripcion')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('profile_awards')
        .select('id, nombre, entidad, anio, descripcion')
        .eq('profile_id', user.id)
        .order('anio', { ascending: false, nullsFirst: false }),
    ])

    return (
      <Layout>
        <FormacionPremiosEditor
          profileId={user.id}
          initialTraining={training ?? []}
          initialAwards={awards ?? []}
        />
      </Layout>
    )
  }

  // ── B3: Especialidades ────────────────────────────────────────────────────
  if (n === '3') {
    const { data: specialties } = await supabase
      .from('profile_specialties')
      .select('id, specialty, is_primary')
      .eq('profile_id', user.id)
      .order('is_primary', { ascending: false })

    return (
      <Layout>
        <EspecialidadesEditor
          profileId={user.id}
          plan={profile?.plan ?? 'gratuito'}
          initialData={specialties ?? []}
        />
      </Layout>
    )
  }

  // ── B4: Experiencia Profesional ───────────────────────────────────────────
  if (n === '4') {
    const { data: experience } = await supabase
      .from('professional_experience')
      .select('id, tipo, titulo, organizacion, descripcion, fecha_inicio, fecha_fin, en_curso')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })

    return (
      <Layout>
        <ExperienciaEditor
          profileId={user.id}
          plan={profile?.plan ?? 'gratuito'}
          initialData={experience ?? []}
        />
      </Layout>
    )
  }

  // ── B6: Redes y Contacto ──────────────────────────────────────────────────
  if (n === '6') {
    return (
      <Layout>
        <RedesEditor
          profileId={user.id}
          plan={profile?.plan ?? 'gratuito'}
          initialWebsite={profile?.website_url ?? null}
          initialSocial={profile?.social_links as SocialLinks | null}
        />
      </Layout>
    )
  }

  // ── B7: Disponibilidad ────────────────────────────────────────────────────
  if (n === '7') {
    const { data: availability } = await supabase
      .from('profile_availability')
      .select('id, estado, alcance, nota')
      .eq('profile_id', user.id)
      .maybeSingle()

    return (
      <Layout>
        <DisponibilidadEditor
          profileId={user.id}
          initialData={availability ?? null}
        />
      </Layout>
    )
  }

  // ── B8: Documentación (plan-gated) ────────────────────────────────────────
  if (n === '8' && profile?.plan === 'gratuito') {
    return (
      <Layout>
        <div className="account-card">
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)', letterSpacing: '-0.3px', marginBottom: '12px' }}>
            {meta.title}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6', fontFamily: 'var(--sans)', marginBottom: '20px' }}>
            La gestión de documentación profesional — CV descargable, dossier artístico y material corporativo — está disponible a partir del plan Premium.
          </p>
          <Link href="/precios" className="ds-btn-primary" style={{ width: 'auto', display: 'inline-block', padding: '10px 20px' }}>
            Ver planes →
          </Link>
        </div>
      </Layout>
    )
  }

  // ── Resto: próximamente ───────────────────────────────────────────────────
  return (
    <Layout>
      <div className="account-card">
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)', letterSpacing: '-0.3px', marginBottom: '12px' }}>
          {meta.title}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6', fontFamily: 'var(--sans)', marginBottom: '4px' }}>
          {meta.description}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '16px', fontFamily: 'var(--sans)' }}>
          Este bloque estará disponible en una próxima fase de desarrollo.
        </p>
      </div>
    </Layout>
  )
}
