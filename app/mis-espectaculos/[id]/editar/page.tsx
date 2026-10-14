import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import EspectaculoForm from '@/components/cartelera/EspectaculoForm'
import CartelEditor from '@/components/cartelera/CartelEditor'
import FuncionesEditor from '@/components/cartelera/FuncionesEditor'
import EntradasEditor from '@/components/cartelera/EntradasEditor'
import FichaArtisticaEditor from '@/components/cartelera/FichaArtisticaEditor'
import EstadoPanel from '@/components/cartelera/EstadoPanel'
import { camposDesdeFila, cartelValido, MONEDA_PAIS } from '@/lib/cartelera/cartelera'

export const metadata: Metadata = {
  title: 'Editar espectáculo | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ nuevo?: string }> }

export default async function EditarEspectaculoPage({ params, searchParams }: Props) {
  const { id } = await params
  const { nuevo } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=/mis-espectaculos/${id}/editar`)

  const { data: e } = await supabase
    .from('espectaculos')
    .select('id, titulo, compania_nombre, genero_id, sinopsis, duracion_min, edad_minima, idioma, cartel_url, estado, motivo_rechazo')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!e) notFound()

  const [{ data: funciones }, { data: opciones }, { data: personas }, { data: perfil }, { data: limites }, { count: publicados }] = await Promise.all([
    supabase.from('funciones').select('id, inicio, zona_horaria, lugar_nombre, ciudad, pais_code, estado, nota').eq('espectaculo_id', id).order('inicio'),
    supabase.from('opciones_compra').select('id, funcion_id, tipo, proveedor, url, precio_desde, moneda, etiqueta').eq('espectaculo_id', id).order('orden'),
    supabase.from('espectaculo_personas').select('id, nombre, rol, personaje, orden').eq('espectaculo_id', id).order('orden'),
    supabase.from('profiles').select('plan').eq('id', user.id).single(),
    supabase.from('cartelera_limites_plan').select('plan, max_activos'),
    supabase.from('espectaculos').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('estado', 'publicado'),
  ])

  const ahora = Date.now()
  const funcionesFuturas = (funciones ?? []).filter(f => f.estado !== 'cancelada' && new Date(f.inicio).getTime() > ahora).length
  const paisFuncion = funciones?.[0]?.pais_code
  const monedaSugerida = MONEDA_PAIS[paisFuncion ?? ''] ?? 'EUR'
  const maximo = (limites ?? []).find(l => l.plan === (perfil?.plan ?? 'gratuito'))?.max_activos ?? null
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">{e.titulo}</h1>
              <Link href="/mis-espectaculos" className="page-back">← Mis espectáculos</Link>
            </div>
          </div>

          {e.estado === 'retirado' ? (
            <div className="obras-empty">
              <p className="obras-empty-text">
                El equipo de ObrasDeTeatro ha retirado este espectáculo y ya no se puede editar.
                Escríbenos a hola@obrasdeteatro.com si crees que es un error.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {nuevo === '1' && (
                <div className="ds-alert-success">
                  Borrador creado. Ahora añade el cartel, las funciones y las entradas, y envíalo a publicar.
                </div>
              )}
              <EstadoPanel espectaculo={{ id: e.id, estado: e.estado, motivo_rechazo: e.motivo_rechazo }}
                funcionesFuturas={funcionesFuturas} limite={{ maximo, publicados: publicados ?? 0 }} />
              <CartelEditor userId={user.id} espectaculoId={e.id} supabaseUrl={supabaseUrl}
                cartelUrl={cartelValido(e.cartel_url, supabaseUrl, user.id)} />
              <FuncionesEditor espectaculoId={e.id} funciones={funciones ?? []} />
              <EntradasEditor espectaculoId={e.id} opciones={opciones ?? []} funciones={funciones ?? []} monedaSugerida={monedaSugerida} />
              <FichaArtisticaEditor espectaculoId={e.id} personas={personas ?? []} />
              <EspectaculoForm userId={user.id} inicial={camposDesdeFila(e)} espectaculo={{ id: e.id, estado: e.estado }} />
              {/* El mismo panel al final: al terminar de rellenar la ficha no hace falta volver arriba. */}
              <EstadoPanel espectaculo={{ id: e.id, estado: e.estado, motivo_rechazo: e.motivo_rechazo }}
                funcionesFuturas={funcionesFuturas} limite={{ maximo, publicados: publicados ?? 0 }} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
