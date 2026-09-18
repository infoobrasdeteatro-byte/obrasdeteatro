import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Política de Uso de ScenaIA | ObrasDeTeatro®",
  description: "Política de Uso de ScenaIA, la herramienta de inteligencia artificial de ObrasDeTeatro® para las artes escénicas.",
};

const SECTIONS = [
  {
    title: "1. Objetivo",
    content: [
      { type: "text", text: "La presente Política regula el uso de ScenaIA, la herramienta de inteligencia artificial integrada en ObrasDeTeatro®, diseñada para asistir a profesionales, empresas e instituciones del ámbito de las artes escénicas mediante herramientas de análisis, recomendación y apoyo creativo." },
    ],
  },
  {
    title: "2. Definición de ScenaIA",
    content: [
      { type: "text", text: "ScenaIA es una solución tecnológica basada en inteligencia artificial que permite:" },
      { type: "list", items: [
        "Analizar currículums, perfiles artísticos, obras teatrales y guiones.",
        "Generar sinopsis, biografías profesionales y dossiers.",
        "Recomendar castings, convocatorias y festivales.",
        "Proporcionar sugerencias creativas.",
      ]},
      { type: "highlight", text: "Estas funciones se habilitan de forma progresiva, por lo que no todas están disponibles todavía. El estado actual de cada una puede consultarse en la página de precios (/precios)." },
    ],
  },
  {
    title: "3. Naturaleza del servicio",
    content: [
      { type: "text", text: "ScenaIA es una herramienta de apoyo." },
      { type: "highlight", text: "Los resultados proporcionados son orientativos y no constituyen asesoramiento profesional, jurídico, laboral, financiero ni artístico definitivo." },
      { type: "text", text: "Las decisiones adoptadas por los usuarios serán de su exclusiva responsabilidad." },
    ],
  },
  {
    title: "4. Declaración del usuario",
    content: [
      { type: "text", text: "Al utilizar ScenaIA, el usuario declara que dispone de los derechos necesarios sobre los documentos enviados, está autorizado para utilizar dichos contenidos y no vulnera derechos de terceros." },
      { type: "text", text: "El usuario será responsable exclusivo de los materiales proporcionados." },
    ],
  },
  {
    title: "5. Propiedad intelectual",
    content: [
      { type: "text", text: "La utilización de ScenaIA no implica transferencia de derechos de propiedad intelectual a favor de ObrasDeTeatro®. Los contenidos enviados continúan siendo propiedad de sus respectivos titulares." },
      { type: "text", text: "Los resultados generados podrán ser utilizados libremente por el usuario conforme a la legislación aplicable." },
    ],
  },
  {
    title: "6. Limitaciones del sistema",
    content: [
      { type: "text", text: "ScenaIA puede generar resultados inexactos, incompletos, desactualizados o subjetivos." },
      { type: "text", text: "ObrasDeTeatro® no garantiza exactitud absoluta, resultados concretos, éxito profesional, contrataciones, selección en castings, obtención de subvenciones ni participación en festivales." },
    ],
  },
  {
    title: "7. Usos prohibidos",
    content: [
      { type: "list", items: [
        "Actividades ilícitas.",
        "Suplantación de identidad.",
        "Infracción de derechos de autor.",
        "Difusión de información falsa.",
        "Obtención fraudulenta de ventajas.",
        "Acoso o discriminación.",
      ]},
    ],
  },
  {
    title: "8. Exclusión de responsabilidad",
    content: [
      { type: "text", text: "ObrasDeTeatro®, CONECTA PLUS GLOBAL, S.L.U. y sus colaboradores no serán responsables de decisiones adoptadas por los usuarios, consecuencias derivadas del uso de ScenaIA, pérdidas económicas, oportunidades perdidas ni errores generados por sistemas de inteligencia artificial." },
    ],
  },
  {
    title: "9. Contacto",
    content: [
      { type: "contact", items: [
        { label: "Asuntos legales", value: "legal@obrasdeteatro.com", href: "mailto:legal@obrasdeteatro.com" },
        { label: "Protección de datos", value: "protecciondatos@obrasdeteatro.com", href: "mailto:protecciondatos@obrasdeteatro.com" },
        { label: "Contacto general", value: "info@obrasdeteatro.com", href: "mailto:info@obrasdeteatro.com" },
        { label: "Razón Social", value: "CONECTA PLUS GLOBAL, S.L.U." },
        { label: "Domicilio", value: "Carretera General del Sur, S/N, Local 3, 38107 – Santa Cruz de Tenerife, España" },
      ]},
    ],
  },
];

export default function ScenaIAPage() {
  return (
    <LegalPage
      title="Política de Uso de ScenaIA"
      lastUpdate="18 de septiembre de 2026"
      sections={SECTIONS}
    />
  );
}
