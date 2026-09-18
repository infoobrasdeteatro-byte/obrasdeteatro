import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Solicitud de Derechos de Representación | ObrasDeTeatro®",
  description: "Procedimiento de ObrasDeTeatro® para solicitar la representación, licencia o adaptación de obras teatrales protegidas.",
};

const SECTIONS = [
  {
    title: "1. Objeto",
    content: [
      { type: "text", text: "El presente procedimiento regula las solicitudes de representación, licenciamiento, adaptación o utilización de obras teatrales protegidas por derechos de propiedad intelectual publicadas en ObrasDeTeatro®, con la finalidad de facilitar el contacto entre los interesados y los titulares de derechos." },
    ],
  },
  {
    title: "2. Función de ObrasDeTeatro®",
    content: [
      { type: "text", text: "ObrasDeTeatro® actúa exclusivamente como plataforma tecnológica de intermediación. La plataforma facilita el contacto entre las partes y canaliza solicitudes cuando proceda, pero no:" },
      { type: "list", items: [
        "Concede licencias.",
        "Autoriza representaciones.",
        "Gestiona derechos en nombre de terceros.",
        "Actúa como agente artístico o entidad de gestión colectiva.",
      ]},
    ],
  },
  {
    title: "3. Obras susceptibles de solicitud",
    content: [
      { type: "list", items: [
        "Obras teatrales.",
        "Adaptaciones.",
        "Traducciones.",
        "Monólogos.",
        "Microteatro.",
        "Obras musicales.",
        "Obras escénicas protegidas.",
      ]},
      { type: "text", text: "Siempre que el titular haya habilitado la recepción de solicitudes." },
    ],
  },
  {
    title: "4. Tipos de solicitud",
    content: [
      { type: "list", items: [
        "Representación teatral.",
        "Adaptación audiovisual.",
        "Traducción.",
        "Publicación editorial.",
        "Distribución.",
        "Lectura dramatizada.",
        "Producción internacional.",
        "Otra modalidad autorizada.",
      ]},
    ],
  },
  {
    title: "5. Negociación entre las partes",
    content: [
      { type: "text", text: "Las condiciones económicas y contractuales serán negociadas exclusivamente entre el titular de los derechos y el solicitante." },
      { type: "highlight", text: "ObrasDeTeatro® no interviene en honorarios, royalties, condiciones económicas ni contratos de explotación." },
    ],
  },
  {
    title: "6. Limitación de responsabilidad",
    content: [
      { type: "text", text: "ObrasDeTeatro® no garantiza la disponibilidad de los derechos, la respuesta del titular, la aceptación de solicitudes ni la celebración de acuerdos. La plataforma actúa únicamente como intermediario tecnológico." },
    ],
  },
  {
    title: "7. Contacto",
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

export default function DerechosRepresentacionPage() {
  return (
    <LegalPage
      title="Solicitud de Derechos de Representación"
      lastUpdate="18 de septiembre de 2026"
      sections={SECTIONS}
    />
  );
}
