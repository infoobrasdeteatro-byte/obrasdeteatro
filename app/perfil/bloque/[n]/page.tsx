import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import PerfilForm from '@/app/perfil/PerfilForm'
import DirectorProSection from '@/app/perfil/DirectorProSection'

const BLOCK_META: Record<string, { title: string; description: string }> = {
  '1': { title: 'Información Personal',    description: 'Nombre, avatar, biografía breve y ubicación geográfica'       },
  '2': { title: 'Información Profesional', description: 'Biografía extensa, trayectoria y formación académica'          },
  '3': { title: 'Especialidades',          description: 'Géneros y áreas de especialización escénica'                   },
  '4': { title: 'Experiencia y Obras',     description: 'Producciones y obras publicadas en la plataforma'              },
  '5': { title: 'Material Audiovisual',    description: 'Foto de perfil, portada y galería de imágenes'                 },
  '6': { title: 'Redes y Contacto',        description: 'Redes sociales y contacto profesional'                         },
  '7': { title: 'Disponibilidad',          description: 'Disponibilidad para proyectos, giras y colaboraciones'         },
  '8': { title: 'Documentación',           description: 'CV descargable y dossier artístico profesional'                },
  '9': { title: 'Perfil Verificado',       description: 'Solicitar verificación de identidad profesional'               },
}

const TIPO_PERFIL_LABEL: Record<string, string> = {
  actor: 'Actor / Actriz', director: 'Director/a', dramaturgo: 'Dramaturgo/a',
  compania: 'Compañía de teatro', productora: 'Productora', teatro: 'Teatro / Sala',
  festival: 'Festival', escuela: 'Escuela de artes escénicas',
  institucion: 'Institución pública', profesional: 'Profesional escénico', publico: 'Público general',
}

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
    .select('id, nombre, apellidos, nombre_artistico, bio, pais, ciudad, country_code, region, postal_code, tipo_perfil, perfil_publico, slug, avatar_url, plan')
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

  // ── Block 1: Información Personal ──────────────────────────────────────
  if (n === '1') {
    return (
      <Layout>
        <PerfilForm profile={profile} />
      </Layout>
    )
  }

  // ── Block 2: Información Profesional ───────────────────────────────────
  if (n === '2') {
    if (profile?.tipo_perfil !== 'director') {
      const tipo = profile?.tipo_perfil ? (TIPO_PERFIL_LABEL[profile.tipo_perfil] ?? profile.tipo_perfil) : 'tu tipo de perfil'
      return (
        <Layout>
          <div className="account-card">
            <p style={{ fontSize: '14px', color: 'var(--muted)', fontFamily: 'var(--sans)', lineHeight: '1.6' }}>
              La información profesional para <strong>{tipo}</strong> estará disponible próximamente como parte del rollout del Dashboard Profesional.
            </p>
          </div>
        </Layout>
      )
    }

    const { data: directorData } = await supabase
      .from('perfil_director')
      .select('id, biografia, trayectoria, formacion')
      .eq('user_id', user.id)
      .maybeSingle()

    return (
      <Layout>
        <DirectorProSection profileId={profile.id} initialData={directorData} />
      </Layout>
    )
  }

  // ── Block 8: Documentación (plan-gated) ────────────────────────────────
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

  // ── Blocks 3–9 (not yet implemented) ──────────────────────────────────
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
          Este bloque forma parte del Dashboard Profesional y estará disponible en la próxima fase de desarrollo.
        </p>
      </div>
    </Layout>
  )
}
