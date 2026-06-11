import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Política de Privacidad | ObrasDeTeatro®",
  description: "Política de Privacidad de ObrasDeTeatro®. Cómo tratamos y protegemos tus datos personales conforme al RGPD.",
};

const SECTIONS = [
  {
    title: "1. Identidad del responsable del tratamiento",
    content: [
      { type: "contact", items: [
        { label: "Responsable", value: "CONECTA PLUS GLOBAL, S.L.U." },
        { label: "Domicilio", value: "Carretera General del Sur, S/N, Local 3, 38107 – Santa Cruz de Tenerife, España" },
        { label: "Correo electrónico", value: "info@obrasdeteatro.com", href: "mailto:info@obrasdeteatro.com" },
        { label: "Protección de datos", value: "protecciondatos@obrasdeteatro.com", href: "mailto:protecciondatos@obrasdeteatro.com" },
        { label: "Teléfono", value: "+34 822 298 007" },
        { label: "Sitio web", value: "ObrasDeTeatro®" },
      ]},
    ],
  },
  {
    title: "2. Finalidad del tratamiento",
    content: [
      { type: "text", text: "Los datos personales facilitados por los usuarios serán tratados con las siguientes finalidades:" },
      { type: "list", items: [
        "Gestionar el registro de usuarios.",
        "Gestionar perfiles profesionales e institucionales.",
        "Gestionar castings y convocatorias.",
        "Gestionar publicaciones de obras teatrales.",
        "Gestionar festivales y eventos.",
        "Gestionar comunicaciones entre usuarios.",
        "Gestionar solicitudes de representación de obras.",
        "Gestionar suscripciones y pagos.",
        "Gestionar consultas y solicitudes de información.",
        "Enviar comunicaciones relacionadas con la plataforma.",
        "Mejorar la experiencia del usuario.",
        "Garantizar la seguridad de la plataforma.",
        "Cumplir obligaciones legales.",
      ]},
    ],
  },
  {
    title: "3. Categorías de datos tratados",
    content: [
      { type: "text", text: "Datos identificativos: nombre, apellidos, nombre artístico, correo electrónico, teléfono, WhatsApp, país y ciudad." },
      { type: "text", text: "Datos profesionales: currículum, formación, experiencia profesional, obras publicadas, castings, convocatorias, redes sociales y página web." },
      { type: "text", text: "Contenido multimedia: fotografías, vídeos, dossiers y material promocional." },
      { type: "text", text: "Datos económicos: información de facturación e historial de suscripciones." },
      { type: "text", text: "Datos técnicos: dirección IP, navegador, dispositivo, cookies y registros de acceso." },
    ],
  },
  {
    title: "4. Legitimación del tratamiento",
    content: [
      { type: "list", items: [
        "Consentimiento del usuario.",
        "Ejecución de un contrato.",
        "Cumplimiento de obligaciones legales.",
        "Interés legítimo del responsable.",
      ]},
    ],
  },
  {
    title: "5. Destinatarios de los datos",
    content: [
      { type: "text", text: "Los datos podrán ser comunicados a proveedores tecnológicos, servicios de alojamiento, plataformas de pago, servicios de seguridad y autoridades competentes cuando exista obligación legal." },
      { type: "highlight", text: "ObrasDeTeatro® no venderá datos personales a terceros bajo ningún concepto." },
    ],
  },
  {
    title: "6. Stripe y pagos",
    content: [
      { type: "text", text: "Los pagos realizados dentro de la plataforma serán gestionados mediante Stripe. Los datos bancarios y de pago serán tratados directamente por Stripe conforme a sus propias políticas de privacidad y seguridad." },
      { type: "text", text: "ObrasDeTeatro® no almacena números completos de tarjetas bancarias." },
    ],
  },
  {
    title: "7. Conservación de los datos",
    content: [
      { type: "text", text: "Los datos se conservarán durante la existencia de la relación contractual, el tiempo necesario para cumplir obligaciones legales y los plazos exigidos por normativa fiscal, mercantil o administrativa." },
      { type: "text", text: "Los datos podrán conservarse bloqueados cuando sea necesario para la defensa de posibles reclamaciones." },
    ],
  },
  {
    title: "8. Derechos de los usuarios",
    content: [
      { type: "text", text: "Los usuarios podrán ejercer en cualquier momento los siguientes derechos: acceso, rectificación, supresión, oposición, limitación del tratamiento, portabilidad y retirada del consentimiento." },
      { type: "text", text: "Las solicitudes podrán dirigirse a:" },
      { type: "contact", items: [
        { label: "Email", value: "protecciondatos@obrasdeteatro.com", href: "mailto:protecciondatos@obrasdeteatro.com" },
      ]},
    ],
  },
  {
    title: "9. Medidas de seguridad",
    content: [
      { type: "text", text: "ObrasDeTeatro® aplica medidas técnicas y organizativas adecuadas para proteger los datos personales frente a acceso no autorizado, alteración, pérdida, destrucción o divulgación indebida." },
    ],
  },
  {
    title: "10. Transferencias internacionales",
    content: [
      { type: "text", text: "Algunos proveedores tecnológicos utilizados por la plataforma podrán encontrarse fuera del Espacio Económico Europeo. En tal caso, se adoptarán las garantías exigidas por el Reglamento General de Protección de Datos (RGPD)." },
    ],
  },
  {
    title: "11. Reclamaciones",
    content: [
      { type: "text", text: "Si el usuario considera que sus derechos no han sido respetados, podrá presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD)." },
      { type: "contact", items: [
        { label: "Web AEPD", value: "www.aepd.es", href: "https://www.aepd.es" },
      ]},
    ],
  },
  {
    title: "12. Contacto",
    content: [
      { type: "contact", items: [
        { label: "Protección de datos", value: "protecciondatos@obrasdeteatro.com", href: "mailto:protecciondatos@obrasdeteatro.com" },
        { label: "Asuntos legales", value: "legal@obrasdeteatro.com", href: "mailto:legal@obrasdeteatro.com" },
        { label: "Información general", value: "info@obrasdeteatro.com", href: "mailto:info@obrasdeteatro.com" },
      ]},
    ],
  },
];

export default function PrivacidadPage() {
  return (
    <LegalPage
      title="Política de Privacidad"
      lastUpdate="15 de junio de 2026"
      sections={SECTIONS}
    />
  );
}
