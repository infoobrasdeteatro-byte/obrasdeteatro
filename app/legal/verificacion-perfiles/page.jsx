import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Política de Verificación de Perfiles | ObrasDeTeatro®",
  description: "Política de Verificación de Perfiles de ObrasDeTeatro®: qué significa el distintivo de perfil verificado y cómo se concede.",
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
      { type: "text", text: "Un perfil verificado es aquel que ha superado un proceso de comprobación documental realizado por ObrasDeTeatro®. La verificación indica únicamente que la información revisada coincide razonablemente con la documentación aportada en el momento de la revisión." },
      { type: "highlight", text: "La verificación no constituye aval profesional, certificación de calidad, garantía de contratación, garantía de solvencia ni garantía de comportamiento futuro." },
    ],
  },
  {
    title: "3. Perfiles elegibles",
    content: [
      { type: "list", items: [
        "Actores y actrices.",
        "Directores y directoras.",
        "Dramaturgos y dramaturgas.",
        "Compañías Teatrales.",
        "Productoras.",
        "Teatros y Salas.",
        "Festivales.",
        "Escuelas de Formación.",
        "Instituciones Públicas.",
        "Otras entidades aprobadas por ObrasDeTeatro®.",
      ]},
    ],
  },
  {
    title: "4. Documentación requerida",
    content: [
      { type: "text", text: "Personas físicas:" },
      { type: "list", items: [
        "Documento de identidad.",
        "Documento profesional.",
        "Página web profesional.",
        "Redes sociales verificables.",
        "Documentación complementaria.",
      ]},
      { type: "text", text: "Empresas e instituciones:" },
      { type: "list", items: [
        "CIF o equivalente.",
        "Certificado de existencia.",
        "Página web oficial.",
        "Correo corporativo.",
        "Documentación acreditativa.",
      ]},
    ],
  },
  {
    title: "5. Proceso y plazo de revisión",
    content: [
      { type: "text", text: "El proceso incluye recepción de la solicitud, revisión documental, posible solicitud de información adicional, verificación manual y resolución." },
      { type: "text", text: "ObrasDeTeatro® podrá aprobar o rechazar la solicitud discrecionalmente en un plazo aproximado de hasta 30 días naturales." },
    ],
  },
  {
    title: "6. Denegación y retirada de la verificación",
    content: [
      { type: "text", text: "La solicitud podrá ser rechazada cuando la documentación sea insuficiente, existan dudas sobre la identidad, la información sea inconsistente o se detecten intentos de fraude." },
      { type: "text", text: "El distintivo podrá retirarse cuando se detecte información falsa, cambien las circunstancias verificadas, exista uso indebido del distintivo o se incumplan las Normas de la Comunidad." },
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
        { label: "Razón Social", value: "CONECTA PLUS GLOBAL, S.L.U." },
        { label: "Domicilio", value: "Carretera General del Sur, S/N, Local 3, 38107 – Santa Cruz de Tenerife, España" },
      ]},
    ],
  },
];

export default function VerificacionPerfilesPage() {
  return (
    <LegalPage
      title="Política de Verificación de Perfiles"
      lastUpdate="18 de septiembre de 2026"
      sections={SECTIONS}
    />
  );
}
