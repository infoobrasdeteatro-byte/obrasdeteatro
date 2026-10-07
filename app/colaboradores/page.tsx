import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import TopNav from '@/components/design-system/TopNav'
import { colaboradoresActivos } from '@/lib/colaboradores/datos'
import { MAILTO_COLABORAR, agruparPorTipo, urlSegura } from '@/lib/colaboradores/colaboradores'
import { nombrePais } from '@/lib/noticias/presentacion'

const TITULO = 'Colaboradores | ObrasDeTeatro®'
const DESCRIPCION =
  'Medios, instituciones y patrocinadores que colaboran con ObrasDeTeatro®, el ecosistema digital del teatro en español en los 20 países de habla hispana.'

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  alternates: { canonical: '/colaboradores' },
  openGraph: {
    title: TITULO,
    description: DESCRIPCION,
    url: '/colaboradores',
    siteName: 'ObrasDeTeatro',
    locale: 'es_ES',
    type: 'website',
  },
}

// Mismo criterio que la portada: datos públicos con el cliente anónimo y
// revalidación cada 10 minutos. Activar un colaborador tarda como mucho eso.
export const revalidate = 600

/**
 * Colaboradores activos, agrupados por tipo (Medios colaboradores,
 * Instituciones, Patrocinadores). Los grupos vacíos no se muestran.
 *
 * Sin ningún colaborador activo, la página no existe: 404 (y el pie de página
 * tampoco enlaza aquí). El proyecto no tiene sitemap, así que no hay nada que
 * excluir; un 404 ya no se indexa.
 */
export default async function ColaboradoresPage() {
  const grupos = agruparPorTipo(await colaboradoresActivos())
  if (grupos.length === 0) notFound()

  return (
    <>
      <TopNav />
      <main style={{ background: 'var(--off)', minHeight: '100vh', padding: '32px 24px 64px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Colaboradores</h1>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Medios, instituciones y patrocinadores que acompañan a ObrasDeTeatro®.
              </span>
            </div>
          </div>

          {grupos.map(g => (
            <section key={g.tipo} className="colab-grupo" aria-labelledby={`grupo-${g.tipo}`}>
              <h2 id={`grupo-${g.tipo}`} className="colab-grupo-titulo">{g.titulo}</h2>
              <ul className="colab-tarjetas">
                {g.colaboradores.map(c => {
                  const web = urlSegura(c.url_web)
                  const logo = urlSegura(c.logo_url)
                  return (
                    <li key={c.id}>
                      <article className="account-card colab-tarjeta">
                        {logo && (
                          <div className="colab-tarjeta-logo">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={logo} alt={`Logo de ${c.nombre}`} loading="lazy" decoding="async" />
                          </div>
                        )}
                        <h3 className="colab-tarjeta-nombre">{c.nombre}</h3>
                        {c.pais_code && <p className="colab-tarjeta-pais">{nombrePais(c.pais_code)}</p>}
                        {c.descripcion && <p className="colab-tarjeta-desc">{c.descripcion}</p>}
                        {web && (
                          <p className="colab-tarjeta-web">
                            <a href={web} target="_blank" rel="noopener" className="table-link">
                              Visitar la web ↗
                            </a>
                          </p>
                        )}
                      </article>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}

          <aside className="colab-colaborar" aria-labelledby="colab-colaborar-titulo">
            <h2 id="colab-colaborar-titulo" className="colab-colaborar-titulo">¿Quieres colaborar con obrasdeteatro.com?</h2>
            <p className="colab-colaborar-texto">
              Medios, instituciones y patrocinadores que quieran sumarse al ecosistema del teatro en español pueden escribirnos.
            </p>
            <a href={MAILTO_COLABORAR} className="table-link">hola@obrasdeteatro.com</a>
          </aside>

        </div>
      </main>
    </>
  )
}
