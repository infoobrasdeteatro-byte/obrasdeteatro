import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Política de Reembolsos | ObrasDeTeatro®",
  description: "Política de Reembolsos de ObrasDeTeatro®: devoluciones, cancelaciones y cobros duplicados en las suscripciones de pago.",
};

// Las secciones sobre entradas y eventos del texto original (entradas para
// eventos, eventos cancelados, no asistencia) se retiraron a propósito: el
// módulo de ticketing todavía no existe. Volverán junto con
// /legal/venta-entradas cuando se construya.

const SECTIONS = [
  {
    title: "1. Objeto",
    content: [
      { type: "text", text: "La presente Política regula las condiciones aplicables a devoluciones, reembolsos, cancelaciones y solicitudes relacionadas con pagos efectuados a través de ObrasDeTeatro®." },
    ],
  },
  {
    title: "2. Ámbito de aplicación",
    content: [
      { type: "list", items: [
        "Suscripciones Premium, Destacadas y Empresas.",
        "Servicios adicionales ofrecidos por la plataforma.",
      ]},
    ],
  },
  {
    title: "3. Suscripciones",
    content: [
      { type: "text", text: "Los planes de suscripción proporcionan acceso inmediato a funcionalidades digitales." },
      { type: "highlight", text: "Una vez activado el acceso al servicio, no procederán reembolsos automáticos de períodos ya iniciados, salvo cuando exista obligación legal aplicable." },
    ],
  },
  {
    title: "4. Cancelación de suscripciones",
    content: [
      { type: "highlight", text: "Actualmente la plataforma no ofrece una opción para cancelar solo la suscripción o su renovación automática manteniendo la cuenta. La única forma de cancelar una suscripción desde la cuenta es eliminar la cuenta (Cuenta → Eliminar cuenta)." },
      { type: "text", text: "Solicitar la eliminación no cancela todavía la suscripción. La cancelación:" },
      { type: "list", items: [
        "Se produce en el momento en que el usuario completa la eliminación de la cuenta, sin esperar al final del período abonado, con la pérdida del acceso a las funcionalidades del plan y a la propia cuenta.",
        "Impedirá futuras renovaciones.",
        "No generará devolución automática de importes previamente cobrados, incluida la parte no disfrutada del período en curso, salvo obligación legal aplicable.",
      ]},
    ],
  },
  {
    title: "5. Cobros duplicados",
    content: [
      { type: "text", text: "Cuando se produzca un cobro duplicado por error técnico verificable, el usuario deberá comunicar la incidencia. ObrasDeTeatro® revisará la operación y procederá al reembolso cuando se confirme el error." },
    ],
  },
  {
    title: "6. Limitación de responsabilidad",
    content: [
      { type: "text", text: "ObrasDeTeatro® no será responsable de errores imputables a terceros, incidencias bancarias ni problemas técnicos ajenos a la plataforma." },
    ],
  },
  {
    title: "7. Contacto",
    content: [
      { type: "contact", items: [
        { label: "Solicitudes de reembolso", value: "comercial@obrasdeteatro.com", href: "mailto:comercial@obrasdeteatro.com" },
        { label: "Asuntos legales", value: "legal@obrasdeteatro.com", href: "mailto:legal@obrasdeteatro.com" },
        { label: "Protección de datos", value: "protecciondatos@obrasdeteatro.com", href: "mailto:protecciondatos@obrasdeteatro.com" },
        { label: "Contacto general", value: "info@obrasdeteatro.com", href: "mailto:info@obrasdeteatro.com" },
        { label: "Razón Social", value: "CONECTA PLUS GLOBAL, S.L.U." },
        { label: "Domicilio", value: "Carretera General del Sur, S/N, Local 3, 38107 – Santa Cruz de Tenerife, España" },
      ]},
    ],
  },
];

export default function ReembolsosPage() {
  return (
    <LegalPage
      title="Política de Reembolsos"
      lastUpdate="18 de septiembre de 2026"
      sections={SECTIONS}
    />
  );
}
