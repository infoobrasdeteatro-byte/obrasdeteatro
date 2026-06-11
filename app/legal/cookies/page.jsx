import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Política de Cookies | ObrasDeTeatro®",
  description: "Política de Cookies de ObrasDeTeatro®. Información sobre los tipos de cookies utilizadas y cómo gestionarlas.",
};

const SECTIONS = [
  {
    title: "1. ¿Qué son las cookies?",
    content: [
      { type: "text", text: "Las cookies son pequeños archivos de texto que se almacenan en el dispositivo del usuario cuando visita un sitio web. Su finalidad es permitir el funcionamiento del sitio, recordar preferencias, mejorar la experiencia de navegación y obtener información estadística sobre el uso de la plataforma." },
    ],
  },
  {
    title: "2. Titular del sitio web",
    content: [
      { type: "contact", items: [
        { label: "Responsable", value: "CONECTA PLUS GLOBAL, S.L.U." },
        { label: "Domicilio", value: "Carretera General del Sur, S/N, Local 3, 38107 – Santa Cruz de Tenerife, España" },
        { label: "Correo electrónico", value: "info@obrasdeteatro.com", href: "mailto:info@obrasdeteatro.com" },
        { label: "Protección de Datos", value: "protecciondatos@obrasdeteatro.com", href: "mailto:protecciondatos@obrasdeteatro.com" },
      ]},
    ],
  },
  {
    title: "3. Tipos de cookies utilizadas",
    content: [
      { type: "highlight", text: "3.1 Cookies técnicas o necesarias — No requieren consentimiento" },
      { type: "text", text: "Imprescindibles para el funcionamiento de la plataforma. Permiten iniciar sesión, mantener sesiones activas, gestionar la seguridad, recordar preferencias básicas y completar formularios." },
      { type: "highlight", text: "3.2 Cookies de preferencias — Requieren consentimiento" },
      { type: "text", text: "Permiten recordar configuraciones elegidas por el usuario como idioma, zona geográfica y configuración de visualización." },
      { type: "highlight", text: "3.3 Cookies analíticas — Requieren consentimiento" },
      { type: "text", text: "Recopilan información estadística sobre la utilización de la plataforma mediante herramientas como Google Analytics y Google Tag Manager. Información recopilada: número de visitas, páginas visitadas, tiempo de navegación, procedencia del tráfico y dispositivos utilizados." },
      { type: "highlight", text: "3.4 Cookies de marketing y publicidad — Requieren consentimiento" },
      { type: "text", text: "Permiten mostrar contenidos promocionales relevantes para los usuarios. Podrán utilizarse para campañas publicitarias, remarketing, medición de conversiones y promoción de servicios." },
      { type: "highlight", text: "3.5 Cookies de redes sociales" },
      { type: "text", text: "Cuando el usuario interactúe con servicios externos como Facebook, Instagram, LinkedIn, TikTok, YouTube o WhatsApp, dichos servicios podrán instalar sus propias cookies. ObrasDeTeatro® no controla directamente estas cookies." },
    ],
  },
  {
    title: "4. Cookies de terceros",
    content: [
      { type: "text", text: "La plataforma podrá utilizar servicios de terceros que instalen cookies en nombre propio:" },
      { type: "list", items: ["Google", "Stripe", "YouTube", "Vimeo", "Meta", "LinkedIn", "Otros proveedores tecnológicos"] },
      { type: "text", text: "Cada proveedor es responsable de sus propias políticas de privacidad y cookies." },
    ],
  },
  {
    title: "5. Gestión del consentimiento",
    content: [
      { type: "text", text: "Al acceder por primera vez a ObrasDeTeatro®, el usuario podrá aceptar todas las cookies, rechazar las cookies no esenciales o configurar sus preferencias de forma individualizada." },
      { type: "text", text: "Las preferencias podrán modificarse en cualquier momento desde el Centro de Preferencias de Cookies habilitado por la plataforma." },
    ],
  },
  {
    title: "6. Retirada del consentimiento",
    content: [
      { type: "text", text: "El usuario podrá retirar o modificar su consentimiento en cualquier momento. La retirada del consentimiento no afectará a la licitud del tratamiento realizado con anterioridad." },
    ],
  },
  {
    title: "7. Configuración del navegador",
    content: [
      { type: "text", text: "Además del sistema de gestión de cookies de ObrasDeTeatro®, el usuario puede configurar su navegador para bloquear, eliminar o limitar cookies de terceros:" },
      { type: "list", items: [
        "Google Chrome: support.google.com/chrome",
        "Mozilla Firefox: support.mozilla.org",
        "Safari: support.apple.com",
        "Microsoft Edge: support.microsoft.com",
      ]},
    ],
  },
  {
    title: "8. Consecuencias de desactivar cookies",
    content: [
      { type: "text", text: "La desactivación de determinadas cookies puede afectar al funcionamiento de algunas funcionalidades como el inicio de sesión, el recordatorio de preferencias, las estadísticas personalizadas, las recomendaciones y las funciones avanzadas de ScenaIA." },
    ],
  },
  {
    title: "9. Conservación de las cookies",
    content: [
      { type: "list", items: [
        "Cookies de sesión: se eliminan al cerrar el navegador.",
        "Cookies persistentes: permanecen durante el plazo configurado o hasta que sean eliminadas manualmente por el usuario.",
      ]},
    ],
  },
  {
    title: "10. Modificaciones de la política de cookies",
    content: [
      { type: "text", text: "ObrasDeTeatro® podrá modificar la presente Política de Cookies para adaptarla a cambios normativos, tecnológicos, nuevas funcionalidades o nuevos proveedores. La versión vigente será siempre la publicada en el sitio web." },
    ],
  },
  {
    title: "11. Contacto",
    content: [
      { type: "contact", items: [
        { label: "Protección de Datos", value: "protecciondatos@obrasdeteatro.com", href: "mailto:protecciondatos@obrasdeteatro.com" },
        { label: "Información General", value: "info@obrasdeteatro.com", href: "mailto:info@obrasdeteatro.com" },
        { label: "Asuntos Legales", value: "legal@obrasdeteatro.com", href: "mailto:legal@obrasdeteatro.com" },
      ]},
    ],
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      title="Política de Cookies"
      lastUpdate="15 de junio de 2026"
      sections={SECTIONS}
    />
  );
}
