import { IconPlus } from './EcoIcons'
import EcosistemaSidebar from './EcosistemaSidebar'
import EcosistemaStatsGrid from './EcosistemaStatsGrid'
import EcosistemaObrasDestacadas from './EcosistemaObrasDestacadas'
import EcosistemaConvocatorias from './EcosistemaConvocatorias'
import EcosistemaMapaHispano from './EcosistemaMapaHispano'
import EcosistemaScenaIACard from './EcosistemaScenaIACard'
import EcosistemaNoticias from './EcosistemaNoticias'
import EcoScrollReveal from './EcoScrollReveal'
import type { DatosPortada } from '@/lib/portada/datos'

/**
 * Bloque "El pulso del ecosistema teatral hispano" de la home pública,
 * entre la sección narrativa y el footer. Cifras, obras, convocatorias y
 * noticias vienen de Supabase (lib/portada/datos); lo que no tiene dato
 * real se dice con texto o no se pinta.
 */
export default function EcosistemaPulso({ datos }: { datos: DatosPortada }) {
  return (
    <section className="eco-section" id="pulso" aria-labelledby="eco-pulso-heading">
      <EcoScrollReveal />
      <div className="eco-layout">
        <EcosistemaSidebar />

        <main className="eco-main">
          <div className="eco-welcome-bar">
            <div className="eco-welcome-text">
              <h2 id="eco-pulso-heading">El pulso del ecosistema <em>teatral hispano.</em></h2>
              <p>Tu espacio dentro de la escena contemporánea.</p>
            </div>
            <div className="eco-btn-add">
              <IconPlus />
              Añadir obra
            </div>
          </div>

          <EcosistemaStatsGrid datos={datos} />
          <EcosistemaObrasDestacadas obras={datos.ultimasObras} />

          <div className="eco-two-col">
            <EcosistemaConvocatorias convocatorias={datos.ultimasConvocatorias} />
            <div className="eco-right-col">
              <EcosistemaMapaHispano />
              <EcosistemaScenaIACard />
            </div>
          </div>

          <EcosistemaNoticias noticias={datos.ultimasNoticias} />
        </main>
      </div>
    </section>
  )
}
