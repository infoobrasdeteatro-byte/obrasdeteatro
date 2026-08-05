import {
  IconDashboard, IconUser, IconTheater, IconUsers, IconBookmark,
  IconSearch, IconMap, IconCalendarEvent, IconSparkles, IconTool, IconSettings,
} from './EcoIcons'

/**
 * Sidebar puramente decorativo para el bloque "El pulso del ecosistema" en
 * la home pública. No debe confundirse con components/design-system/Sidebar.tsx
 * (el sidebar real del dashboard autenticado, con enlaces distintos) -- este
 * es una vista previa estática, sin navegación real, según lo aprobado.
 */
export default function EcosistemaSidebar() {
  return (
    <aside className="eco-sidebar">
      <div className="eco-sid-section">
        <span className="eco-sid-label">Mi cuenta</span>
        <div className="eco-sid-item eco-sid-item--active"><IconDashboard />Inicio</div>
        <div className="eco-sid-item"><IconUser />Mi perfil</div>
        <div className="eco-sid-item"><IconTheater />Mis obras<span className="eco-sid-count">3</span></div>
        <div className="eco-sid-item"><IconUsers />Mi compañía</div>
        <div className="eco-sid-item"><IconBookmark />Guardados<span className="eco-sid-count">12</span></div>
      </div>
      <div className="eco-sid-section">
        <span className="eco-sid-label">Explorar</span>
        <div className="eco-sid-item"><IconSearch />Buscador global</div>
        <div className="eco-sid-item"><IconMap />Mapa hispano</div>
        <div className="eco-sid-item"><IconCalendarEvent />Festivales</div>
        <div className="eco-sid-item"><IconSparkles />ScenaIA</div>
      </div>
      <div className="eco-sid-section">
        <span className="eco-sid-label">Recursos</span>
        <div className="eco-sid-item"><IconTool />Servicios</div>
        <div className="eco-sid-item"><IconSettings />Ajustes</div>
      </div>
    </aside>
  )
}
