import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import TopNav from '@/components/design-system/TopNav'
import Aceptar from './Aceptar'
import { PROPOSITO, distintivo } from '@/lib/elenco/textos'

const VISTA_PREVIA = {
  titulo: 'Invitación personal · Elenco Fundador',
  descripcion: 'ObrasDeTeatro®, la plataforma profesional del teatro en español en los 20 países de habla hispana.',
}

export const metadata: Metadata = {
  title: 'Invitación · Elenco Fundador | ObrasDeTeatro®',
  description: VISTA_PREVIA.descripcion,
  robots: { index: false, follow: false },
  openGraph: {
    title: VISTA_PREVIA.titulo,
    description: VISTA_PREVIA.descripcion,
    siteName: 'ObrasDeTeatro®',
    type: 'website',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'ObrasDeTeatro®' }],
  },
}
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ token: string }> }

/** Invitación personal al Elenco Fundador (el token es el secreto). Sin mencionar plazas ni a otros invitados. */
export default async function InvitacionElencoPage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()
  const [{ data }, { data: { user } }] = await Promise.all([
    /^[0-9a-f]{32}$/.test(token) ? supabase.rpc('elenco_invitacion_publica', { p_token: token }) : Promise.resolve({ data: null }),
    supabase.auth.getUser(),
  ])
  const inv = data?.[0] ?? null
  const volver = `/elenco/invitacion/${token}`

  if (!inv || inv.estado === 'anulada') {
    return (
      <Marco>
        <section className="inv-hero">
          <p className="inv-eyebrow">ObrasDeTeatro®</p>
          <h1 className="inv-titulo">Esta invitación ya no está disponible</h1>
          <p className="inv-lead">El enlace no es válido o ha sido retirado. Si crees que es un error, escríbenos a hola@obrasdeteatro.com.</p>
        </section>
      </Marco>
    )
  }

  const org = inv.tipo === 'organizacion'
  const nombre = org ? inv.nombre.trim() : inv.nombre.trim().split(/\s+/)[0]
  const plan = org ? 'Empresas' : 'Premium'

  return (
    <Marco>
      <section className="inv-hero">
        <p className="inv-eyebrow">Invitación personal</p>
        <h1 className="inv-titulo">{nombre}, {org ? 'os invitamos' : 'te invitamos'} al <em>Elenco Fundador</em></h1>
        <p className="inv-lead">{PROPOSITO} {org ? 'Queremos contar con vosotros' : 'Queremos contar contigo'} desde el principio. Es gratuito, para siempre y sin compromiso.</p>
        {inv.estado === 'aceptada' ? (
          <p className="inv-lead"><strong>Esta invitación ya ha sido aceptada.</strong> <Link href="/perfil/red">Ir a mi red →</Link></p>
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
        <h2 className="inv-h2">Formar parte del Elenco Fundador</h2>
        <ul className="inv-lista">
          <li>El distintivo «{distintivo(inv.numero)}» en {org ? 'vuestro perfil' : 'tu perfil'} y en el directorio que consultan profesionales de 20 países.</li>
          <li>Tres meses del plan {plan} para activar cuando {org ? 'queráis' : 'quieras'} durante el primer año, sin tarjeta y sin cobros.</li>
          <li>Un enlace propio para invitar a {org ? 'vuestros colegas' : 'tus colegas'}: cada colega que se une suma puntos y desbloquea más tiempo de {plan}, hasta ser Miembro de Honor.</li>
          <li><strong>Gratuito, para siempre y sin compromiso.</strong> {org ? 'Vuestro' : 'Tu'} plan de base es el gratuito; nada se cobra nunca sin que lo {org ? 'pidáis' : 'pidas'}.</li>
        </ul>
        <p className="inv-p"><Link href="/elenco-fundador/bases">Bases del programa →</Link></p>
      </section>

      <section className="inv-bloque">
        <h2 className="inv-h2">Qué es ObrasDeTeatro®</h2>
        <p className="inv-p">
          La plataforma profesional del teatro en español: reúne a actores, dramaturgos, directores, compañías, salas y festivales
          de los 20 países de habla hispana, con un directorio profesional, castings y convocatorias, cartelera, una biblioteca de
          miles de obras y un catálogo de teatros y salas.
        </p>
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
