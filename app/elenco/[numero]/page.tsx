import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import TopNav from '@/components/design-system/TopNav'
import { PROPOSITO, distintivo, leerNumero, numeroFundador } from '@/lib/elenco/textos'

type Props = { params: Promise<{ numero: string }> }

const DESCRIPCION = 'Únete gratis a ObrasDeTeatro®, la plataforma profesional del teatro en español en los 20 países de habla hispana.'

export const metadata: Metadata = {
  title: 'Te invitan al teatro en español | ObrasDeTeatro®',
  description: DESCRIPCION,
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Te invitan a ObrasDeTeatro® · Elenco Fundador',
    description: DESCRIPCION,
    siteName: 'ObrasDeTeatro®',
    type: 'website',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'ObrasDeTeatro®' }],
  },
}
export const dynamic = 'force-dynamic'

/** Enlace público y reutilizable de un fundador: /elenco/007. */
export default async function ElencoEnlacePage({ params }: Props) {
  const numero = leerNumero((await params).numero)
  const supabase = await createClient()
  const [{ data: { user } }, { data }] = await Promise.all([
    supabase.auth.getUser(),
    numero ? supabase.rpc('elenco_fundador_publico', { p_numero: numero }) : Promise.resolve({ data: null }),
  ])
  const fundador = data?.[0] ?? null

  if (user) {
    return (
      <Marco>
        <section className="inv-hero">
          <p className="inv-eyebrow">ObrasDeTeatro®</p>
          <h1 className="inv-titulo">Ya formas parte de ObrasDeTeatro®</h1>
          <p className="inv-lead">{PROPOSITO} Gracias por estar.</p>
          <div className="inv-acciones"><Link href="/dashboard" className="inv-btn">Ir a mi cuenta</Link></div>
        </section>
      </Marco>
    )
  }

  if (!numero || !fundador) {
    return (
      <Marco>
        <section className="inv-hero">
          <p className="inv-eyebrow">ObrasDeTeatro®</p>
          <h1 className="inv-titulo">Este enlace no está disponible</h1>
          <p className="inv-lead">{PROPOSITO} Puedes unirte igualmente, es gratis.</p>
          <div className="inv-acciones"><Link href="/auth/registro" className="inv-btn">Crear mi cuenta</Link></div>
        </section>
      </Marco>
    )
  }

  const base = `/elenco/${numeroFundador(numero)}/unirse`

  return (
    <Marco>
      <section className="inv-hero">
        <p className="inv-eyebrow">Te invita {fundador.nombre} · {distintivo(numero)}</p>
        <h1 className="inv-titulo">{PROPOSITO}</h1>
        <p className="inv-lead">
          Directorio de profesionales, castings, convocatorias, salas de 20 países y una biblioteca de miles de obras.
          Cuantos más estemos, más oportunidades habrá para todos. Unirte es gratis.
        </p>
      </section>

      <section className="inv-bloque">
        <h2 className="inv-h2">¿Cómo quieres unirte?</h2>
        <div className="elenco-opciones">
          <Link href={`${base}?como=profesional`} className="elenco-opcion">
            <strong>Soy profesional</strong>
            <span>Actor, actriz, dirección, dramaturgia, técnica, producción… cualquier oficio de la escena.</span>
          </Link>
          <div className="elenco-opcion elenco-opcion--doble">
            <strong>Represento una compañía, sala, escuela, productora o festival</strong>
            <Link href={`${base}?como=organizacion`} className="inv-btn inv-btn--sec">Compañía, escuela, productora o festival</Link>
            <form action={base} method="get" className="elenco-sala">
              <input type="hidden" name="como" value="sala" />
              <label htmlFor="elenco-sala-q">¿Una sala o teatro? Busca su ficha en Espacios Escénicos y reclámala:</label>
              <div className="elenco-sala-fila">
                <input id="elenco-sala-q" name="q" className="ds-input" placeholder="Nombre de la sala" maxLength={80} />
                <button type="submit" className="inv-btn inv-btn--sec">Buscar mi sala</button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {fundador.slug && (
        <p className="inv-firma"><Link href={`/perfil/${fundador.slug}`}>Ver el perfil de {fundador.nombre} →</Link></p>
      )}
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
