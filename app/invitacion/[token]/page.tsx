import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import TopNav from '@/components/design-system/TopNav'
import Aceptar from './Aceptar'
import { CORTESIA, VENTAJAS_OFICIO, VISTA_PREVIA_INVITACION, esOficio, oficioPersona, tituloEmbajador, type Genero } from '@/lib/embajadores/textos'

export const metadata: Metadata = {
  title: 'Invitación · Embajadores de Escena | ObrasDeTeatro®',
  description: VISTA_PREVIA_INVITACION.descripcion,
  robots: { index: false, follow: false },
  // Vista previa al compartir el enlace (WhatsApp, correo…). La imagen es la de siempre.
  openGraph: {
    title: VISTA_PREVIA_INVITACION.titulo,
    description: VISTA_PREVIA_INVITACION.descripcion,
    siteName: 'ObrasDeTeatro®',
    type: 'website',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'ObrasDeTeatro®' }],
  },
}
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ token: string }> }

/** Página personal de la invitación (el token es el secreto). Sin precio y sin mencionar a otros invitados. */
export default async function InvitacionPage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()
  const [{ data }, { data: { user } }] = await Promise.all([
    /^[0-9a-f]{32}$/.test(token) ? supabase.rpc('invitacion_publica', { p_token: token }) : Promise.resolve({ data: null }),
    supabase.auth.getUser(),
  ])
  const inv = data?.[0] ?? null
  const volver = `/invitacion/${token}`

  if (!inv || inv.estado === 'anulada' || inv.estado === 'caducada' || !esOficio(inv.oficio)) {
    return (
      <Marco>
        <section className="inv-hero">
          <p className="inv-eyebrow">ObrasDeTeatro®</p>
          <h1 className="inv-titulo">Esta invitación ya no está disponible</h1>
          <p className="inv-lead">
            {inv?.estado === 'caducada'
              ? 'El plazo para aceptarla ha terminado. Escríbenos a hola@obrasdeteatro.com y te enviaremos una nueva.'
              : 'El enlace no es válido o ha sido retirado. Si crees que es un error, escríbenos a hola@obrasdeteatro.com.'}
          </p>
        </section>
      </Marco>
    )
  }

  const genero: Genero = inv.genero === 'f' ? 'f' : 'm'
  const nombre = inv.nombre.trim().split(/\s+/)[0]
  const titulo = tituloEmbajador(genero)

  return (
    <Marco>
      <section className="inv-hero">
        <p className="inv-eyebrow">Invitación personal</p>
        <h1 className="inv-titulo">{nombre}, te invitamos a ser <em>{titulo}</em></h1>
        <p className="inv-lead">{CORTESIA}</p>
        {inv.estado === 'aceptada' ? (
          <p className="inv-lead"><strong>Esta invitación ya ha sido aceptada.</strong> <Link href="/perfil/centro">Ir a mi Centro Profesional →</Link></p>
        ) : user ? (
          <Aceptar token={token} />
        ) : (
          <div className="inv-acciones">
            <Link href={`/auth/registro?next=${encodeURIComponent(volver)}`} className="inv-btn">Crear mi cuenta y aceptar</Link>
            <Link href={`/auth/login?next=${encodeURIComponent(volver)}`} className="inv-btn inv-btn--sec">Ya tengo cuenta</Link>
          </div>
        )}
      </section>

      <section className="inv-bloque">
        <h2 className="inv-h2">Lo que ObrasDeTeatro® puede hacer por ti como {oficioPersona(inv.oficio, genero)}</h2>
        <ul className="inv-lista">
          {VENTAJAS_OFICIO[inv.oficio].map(v => <li key={v}>{v}</li>)}
        </ul>
      </section>

      <section className="inv-bloque">
        <h2 className="inv-h2">Qué es ObrasDeTeatro®</h2>
        <p className="inv-p">
          La plataforma profesional del teatro en español: reúne a actores, dramaturgos, directores, compañías, salas y festivales
          de los 20 países de habla hispana, con un directorio profesional, castings y convocatorias, cartelera, una biblioteca de
          más de 5.800 obras y un catálogo de más de 3.900 teatros y salas.
        </p>
      </section>

      <section className="inv-bloque">
        <h2 className="inv-h2">Ser {titulo}</h2>
        <ul className="inv-lista">
          <li>Un año de membresía Destacado: tu perfil con la máxima presencia en el Directorio.</li>
          <li>El distintivo «{titulo}» en tu ficha profesional.</li>
          <li>Un enlace personal para invitar a tus colegas: quien se registre con él disfrutará de un mes de Premium.</li>
          <li><strong>Sin tarjeta y sin compromiso.</strong> Al terminar el año, si lo deseas, podrás continuar con tu suscripción. Puedes renunciar en cualquier momento.</li>
        </ul>
      </section>

      <p className="inv-firma">Renee Bausson · Fundador de ObrasDeTeatro®</p>
    </Marco>
  )
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <main className="inv">{children}</main>
    </>
  )
}
