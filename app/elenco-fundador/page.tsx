import type { Metadata } from 'next'
import Link from 'next/link'
import { clienteAnonimo } from '@/lib/supabase/anonimo'
import TopNav from '@/components/design-system/TopNav'
import { PROPOSITO, distintivo } from '@/lib/elenco/textos'

export const metadata: Metadata = {
  title: 'Elenco Fundador | ObrasDeTeatro®',
  description: 'Los profesionales y organizaciones que construyen con nosotros la casa del teatro en español.',
}
export const revalidate = 600

/** Fundadores con escalón 10 o más; los de 25 o más, destacados. */
export default async function ElencoFundadorPage() {
  const { data } = await clienteAnonimo().rpc('elenco_publico')
  const lista = data ?? []
  const destacados = lista.filter(f => f.escalon >= 25)
  const resto = lista.filter(f => f.escalon < 25)

  return (
    <>
      <TopNav />
      <main className="inv">
        <section className="inv-hero">
          <p className="inv-eyebrow">ObrasDeTeatro®</p>
          <h1 className="inv-titulo">Elenco <em>Fundador</em></h1>
          <p className="inv-lead">{PROPOSITO} Estos son los profesionales y organizaciones que más están haciendo por ella.</p>
        </section>

        {lista.length === 0 ? (
          <section className="inv-bloque"><p className="inv-p">Muy pronto conocerás aquí a quienes están construyendo esta casa con nosotros.</p></section>
        ) : (
          <>
            {destacados.length > 0 && (
              <section className="inv-bloque">
                <h2 className="inv-h2">Destacados</h2>
                <Lista filas={destacados} destacada />
              </section>
            )}
            {resto.length > 0 && (
              <section className="inv-bloque">
                {destacados.length > 0 && <h2 className="inv-h2">El elenco</h2>}
                <Lista filas={resto} />
              </section>
            )}
          </>
        )}

        <p className="inv-p" style={{ marginTop: '28px' }}><Link href="/elenco-fundador/bases">Bases del programa →</Link></p>
      </main>
    </>
  )
}

type Fila = { numero: number; nombre: string; slug: string | null; avatar_url: string | null; tipo: string }

function Lista({ filas, destacada = false }: { filas: Fila[]; destacada?: boolean }) {
  return (
    <div className="elenco-lista">
      {filas.map(f => {
        const contenido = (
          <>
            {f.avatar_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={f.avatar_url} alt="" loading="lazy" />
              : <span className="elenco-inicial" aria-hidden="true">{f.nombre.trim().charAt(0).toUpperCase()}</span>}
            <strong>{f.nombre}</strong>
            <small>{distintivo(f.numero)}</small>
          </>
        )
        const clase = `elenco-ficha${destacada ? ' elenco-ficha--destacada' : ''}`
        return f.slug
          ? <Link key={f.numero} href={`/perfil/${f.slug}`} className={clase}>{contenido}</Link>
          : <div key={f.numero} className={clase}>{contenido}</div>
      })}
    </div>
  )
}
