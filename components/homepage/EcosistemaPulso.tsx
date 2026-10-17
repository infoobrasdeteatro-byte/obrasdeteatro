import Link from 'next/link'
import { IconPlus } from './EcoIcons'
import EcosistemaObrasDestacadas from './EcosistemaObrasDestacadas'
import EcosistemaConvocatorias from './EcosistemaConvocatorias'
import EcosistemaMapaHispano from './EcosistemaMapaHispano'
import EcosistemaScenaIACard from './EcosistemaScenaIACard'
import EcosistemaNoticias from './EcosistemaNoticias'
import EcoScrollReveal from './EcoScrollReveal'
import type { DatosPortada } from '@/lib/portada/datos'

/**
 * Bloque "El pulso del ecosistema teatral hispano" de la home pública,
 * entre la sección narrativa y «En cartel». Las cuatro tarjetas de cifras
 * (EcosistemaStatsGrid) van arriba, en la sección narrativa (app/page.tsx). Cifras, obras, convocatorias y
 * noticias vienen de Supabase (lib/portada/datos); lo que no tiene dato
 * real se dice con texto o no se pinta.
 */
export default function EcosistemaPulso({ datos }: { datos: DatosPortada }) {
  return (
    <section className="eco-section" id="pulso" aria-labelledby="eco-pulso-heading">
      <EcoScrollReveal />
      <div className="eco-layout">
        <main className="eco-main">
          <div className="eco-welcome-bar">
            <div className="eco-welcome-text">
              <h2 id="eco-pulso-heading">El pulso del ecosistema <em>teatral hispano.</em></h2>
              <p>Lo último de la biblioteca, las convocatorias y la actualidad del sector.</p>
            </div>
            <Link href="/obras/nueva" className="eco-btn-add">
              <IconPlus />
              Publicar una obra
            </Link>
          </div>

          <EcosistemaObrasDestacadas obras={datos.ultimasObras} />

          {/* Convocatorias y noticias, una al lado de la otra. */}
          <div className="eco-two-col">
            <EcosistemaConvocatorias convocatorias={datos.ultimasConvocatorias} />
            <EcosistemaNoticias noticias={datos.ultimasNoticias} />
          </div>

          {/* Mapa y ScenaIA, uno al lado del otro. */}
          <div className="eco-two-col eco-two-col--sep">
            <EcosistemaMapaHispano actividad={datos.actividadPaises} />
            <EcosistemaScenaIACard />
          </div>
        </main>
      </div>
    </section>
  )
}
