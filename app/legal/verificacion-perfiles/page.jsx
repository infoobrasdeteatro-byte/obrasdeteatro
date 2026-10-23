import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Política de Verificación de Perfiles | ObrasDeTeatro®",
  description: "Política de Verificación de Perfiles de ObrasDeTeatro®: qué significa el distintivo de perfil verificado, qué requisitos exige y cómo se concede.",
};

const SECTIONS = [
  {
    title: "1. Objetivo",
    content: [
      { type: "text", text: "La presente Política regula el procedimiento mediante el cual ObrasDeTeatro® podrá otorgar distintivos de perfil verificado a determinados usuarios, profesionales, empresas e instituciones registradas en la plataforma, con la finalidad de aumentar la confianza, transparencia y credibilidad dentro del ecosistema teatral." },
    ],
  },
  {
    title: "2. ¿Qué es un perfil verificado?",
    content: [
      { type: "text", text: "Un perfil verificado es aquel que muestra el distintivo «✓ Verificado» porque ObrasDeTeatro® ha comprobado que la persona u organización titular del perfil controla la presencia profesional pública que declara (una web propia o una red social profesional) y que su ficha está completa." },
      { type: "highlight", text: "La verificación no constituye aval profesional, certificación de calidad, garantía de contratación, garantía de solvencia ni garantía de comportamiento futuro." },
    ],
  },
  {
    title: "3. Perfiles elegibles",
    content: [
      { type: "list", items: [
        "Profesionales de las artes escénicas.",
        "Compañías teatrales.",
        "Productoras.",
        "Teatros y salas.",
        "Festivales.",
        "Escuelas de formación.",
        "Instituciones públicas.",
        "Otras entidades aprobadas por ObrasDeTeatro®.",
      ]},
    ],
  },
  {
    title: "4. Requisitos",
    content: [
      { type: "text", text: "Para obtener el distintivo deben cumplirse a la vez estas tres condiciones:" },
      { type: "list", items: [
        "Plan de pago activo (Premium, Destacado o Empresas).",
        "Ficha completa: foto de perfil o logotipo, biografía, ciudad y, en el caso de personas, al menos una profesión.",
        "Presencia profesional comprobada: el titular publica temporalmente un código de verificación personal en la biografía de una red social profesional o en una página de su web, y facilita el enlace.",
      ]},
      { type: "highlight", text: "ObrasDeTeatro® no solicita ni conserva documentos de identidad para este proceso. Solo se guardan el enlace facilitado, el código, la fecha y el resultado de la revisión." },
    ],
  },
  {
    title: "5. Proceso y plazo de revisión",
    content: [
      { type: "text", text: "El proceso incluye la solicitud desde el perfil y una comprobación automática del enlace. Si el código se encuentra, la verificación se aprueba en el momento; si la web o la red no permiten comprobarlo, la solicitud pasa a revisión manual por el equipo de moderación. La resolución se comunica por correo electrónico." },
      { type: "text", text: "ObrasDeTeatro® podrá aprobar o rechazar la solicitud de forma motivada en un plazo aproximado de hasta 30 días naturales. Una vez aprobada, el titular puede retirar el código de su red o su web." },
    ],
  },
  {
    title: "6. Denegación y retirada de la verificación",
    content: [
      { type: "text", text: "La solicitud podrá rechazarse cuando el código no aparezca en el enlace facilitado, el enlace no corresponda al titular del perfil, la información sea inconsistente o se detecten intentos de fraude." },
      { type: "text", text: "El distintivo se retira automáticamente si el plan de pago deja de estar activo y se repone, sin nueva solicitud, si se reactiva. También podrá retirarse cuando se detecte información falsa, cambien las circunstancias verificadas, exista uso indebido del distintivo o se incumplan las Normas de la Comunidad." },
    ],
  },
  {
    title: "7. Limitación de responsabilidad",
    content: [
      { type: "text", text: "La verificación no implica garantía de calidad profesional, solvencia económica, legalidad futura ni comportamiento. Los usuarios seguirán siendo responsables de todas sus actuaciones dentro y fuera de la plataforma." },
    ],
  },
  {
    title: "8. Contacto",
    content: [
      { type: "contact", items: [
        { label: "Verificaciones", value: "info@obrasdeteatro.com", href: "mailto:info@obrasdeteatro.com" },
        { label: "Asuntos legales", value: "legal@obrasdeteatro.com", href: "mailto:legal@obrasdeteatro.com" },
        { label: "Protección de datos", value: "protecciondatos@obrasdeteatro.com", href: "mailto:protecciondatos@obrasdeteatro.com" },
        { label: "Razón Social", value: "CONECTA PLUS GLOBAL, S.L." },
        { label: "Domicilio", value: "Carretera General del Sur, S/N, Local 3, 38107 – Santa Cruz de Tenerife, España" },
      ]},
    ],
  },
];

export default function VerificacionPerfilesPage() {
  return (
    <LegalPage
      title="Política de Verificación de Perfiles"
      lastUpdate="23 de octubre de 2026"
      sections={SECTIONS}
    />
  );
}
