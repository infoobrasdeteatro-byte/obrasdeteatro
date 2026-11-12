import type { Metadata } from 'next'
import TopNav from '@/components/design-system/TopNav'
import BrandIcon from '@/components/brand/BrandIcon'
import { BotonInstalar } from '@/components/app/Instalar'

const TITULO = 'Aplicación | ObrasDeTeatro®'
const DESCRIPCION =
  'Instala ObrasDeTeatro® en tu móvil, tableta u ordenador: entra con un toque y a pantalla completa. Gratuita y sin pasar por ninguna tienda.'

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  alternates: { canonical: '/app' },
  openGraph: {
    title: TITULO,
    description: DESCRIPCION,
    url: '/app',
    siteName: 'ObrasDeTeatro',
    locale: 'es_ES',
    type: 'website',
  },
}

/**
 * Página de ayuda de la versión instalable (ver app/manifest.ts). Destino del
 * enlace del menú móvil, de la tarjeta del panel y de las comunicaciones.
 * El botón se adapta al dispositivo; las instrucciones valen para todos.
 */
export default function AppPage() {
  return (
    <>
      <TopNav />
      <main style={{ background: 'var(--off)', minHeight: '100vh', padding: '32px 24px 64px' }}>
        <div className="inst-pagina">

          <header className="inst-cabecera">
            <span className="inst-icono" aria-hidden="true"><BrandIcon /></span>
            <h1 className="page-title">ObrasDeTeatro® en tu móvil</h1>
            <p className="inst-entrada">
              Instala la plataforma como una aplicación: queda con su icono entre las tuyas y se abre
              con un toque, a pantalla completa.
            </p>
            <BotonInstalar />
          </header>

          <section className="inst-pasos" aria-label="Cómo instalarla">
            <article id="android" className="account-card inst-paso">
              <h2 className="inst-paso-titulo">En Android</h2>
              <p className="inst-paso-nav">Con Chrome</p>
              <ol>
                <li>Abre <strong>obrasdeteatro.com</strong> en Chrome.</li>
                <li>Toca los <strong>tres puntos</strong> de arriba a la derecha.</li>
                <li>Elige <strong>«Instalar aplicación»</strong> o «Añadir a pantalla de inicio».</li>
                <li>Confirma con <strong>«Instalar»</strong>.</li>
              </ol>
            </article>

            <article id="iphone" className="account-card inst-paso">
              <h2 className="inst-paso-titulo">En iPhone y iPad</h2>
              <p className="inst-paso-nav">Con Safari</p>
              <ol>
                <li>Abre <strong>obrasdeteatro.com</strong> en Safari.</li>
                <li>Toca el botón de <strong>compartir</strong>, el cuadrado con la flecha hacia arriba.</li>
                <li>Elige <strong>«Añadir a pantalla de inicio»</strong>.</li>
                <li>Confirma con <strong>«Añadir»</strong>.</li>
              </ol>
            </article>

            <article id="ordenador" className="account-card inst-paso">
              <h2 className="inst-paso-titulo">En el ordenador</h2>
              <p className="inst-paso-nav">Con Chrome o Edge</p>
              <ol>
                <li>Abre <strong>obrasdeteatro.com</strong>.</li>
                <li>Pulsa el icono de <strong>instalar</strong> que aparece al final de la barra de direcciones.</li>
                <li>Confirma con <strong>«Instalar»</strong>.</li>
              </ol>
            </article>
          </section>

          <section className="inst-dudas" aria-labelledby="inst-dudas-titulo">
            <h2 id="inst-dudas-titulo" className="inst-dudas-titulo">Lo que conviene saber</h2>
            <dl>
              <div>
                <dt>¿Tiene algún coste?</dt>
                <dd>No. Es gratuita y no hay que descargarla de ninguna tienda.</dd>
              </div>
              <div>
                <dt>¿Es distinta de la web?</dt>
                <dd>Es la misma plataforma, con tu misma cuenta. Cualquier novedad de la web aparece en la aplicación sin que tengas que actualizar nada.</dd>
              </div>
              <div>
                <dt>¿Ocupa espacio en el teléfono?</dt>
                <dd>Apenas. No guarda contenidos en el dispositivo, así que necesita conexión a internet.</dd>
              </div>
              <div>
                <dt>¿Cómo se quita?</dt>
                <dd>Como cualquier otra aplicación: mantén pulsado su icono y elige «Desinstalar» o «Eliminar».</dd>
              </div>
            </dl>
          </section>

        </div>
      </main>
    </>
  )
}
