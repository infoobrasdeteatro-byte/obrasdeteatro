import { IconPlus } from './EcoIcons'
import EcosistemaSidebar from './EcosistemaSidebar'
import EcosistemaStatsGrid from './EcosistemaStatsGrid'
import EcosistemaObrasDestacadas from './EcosistemaObrasDestacadas'
import EcosistemaConvocatorias from './EcosistemaConvocatorias'
import EcosistemaMapaHispano from './EcosistemaMapaHispano'
import EcosistemaScenaIACard from './EcosistemaScenaIACard'
import EcoScrollReveal from './EcoScrollReveal'

/**
 * Bloque "El pulso del ecosistema teatral hispano" -- vista previa visual
 * estática para la home pública, insertada entre la sección narrativa y el
 * footer. Todo el contenido es de muestra (no viene de Supabase todavía);
 * ver docs de la conversación para el roadmap de conexión a datos reales.
 */
export default function EcosistemaPulso() {
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

          <EcosistemaStatsGrid />
          <EcosistemaObrasDestacadas />

          <div className="eco-two-col">
            <EcosistemaConvocatorias />
            <div className="eco-right-col">
              <EcosistemaMapaHispano />
              <EcosistemaScenaIACard />
            </div>
          </div>
        </main>
      </div>
    </section>
  )
}
