import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Aviso Legal | ObrasDeTeatro®",
  description: "Aviso Legal de ObrasDeTeatro®, plataforma digital profesional para el ecosistema teatral en lengua española.",
};

const SECTIONS = [
  {
    title: "1. Identificación del titular",
    content: [
      { type: "text", text: "En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y Comercio Electrónico (LSSI-CE), se informa de que el presente sitio web, ObrasDeTeatro®, es propiedad y está gestionado por:" },
      { type: "contact", items: [
        { label: "Razón Social", value: "CONECTA PLUS GLOBAL, S.L.U." },
        { label: "Domicilio", value: "Carretera General del Sur, S/N, Local 3, 38107 – Santa Cruz de Tenerife, España" },
        { label: "Contacto general", value: "info@obrasdeteatro.com", href: "mailto:info@obrasdeteatro.com" },
        { label: "Protección de datos", value: "protecciondatos@obrasdeteatro.com", href: "mailto:protecciondatos@obrasdeteatro.com" },
        { label: "Asuntos legales", value: "legal@obrasdeteatro.com", href: "mailto:legal@obrasdeteatro.com" },
        { label: "Publicidad y colaboraciones", value: "comercial@obrasdeteatro.com", href: "mailto:comercial@obrasdeteatro.com" },
        { label: "Teléfono", value: "+34 822 298 007" },
        { label: "WhatsApp Business", value: "+34 656 407 971" },
      ]},
    ],
  },
  {
    title: "2. Objeto del sitio web",
    content: [
      { type: "text", text: "ObrasDeTeatro® es una plataforma digital profesional destinada a conectar a los diferentes agentes del ecosistema teatral y de las artes escénicas en lengua española. La plataforma ofrece, entre otros:" },
      { type: "list", items: [
        "Directorio profesional teatral.",
        "Publicación de perfiles profesionales.",
        "Difusión de obras teatrales.",
        "Publicación de castings y convocatorias.",
        "Difusión de festivales y eventos.",
        "Networking profesional.",
        "Herramientas basadas en inteligencia artificial (ScenaIA).",
        "Servicios de visibilidad y promoción.",
        "Suscripciones premium.",
        "Venta de entradas y servicios relacionados.",
        "Solicitudes de derechos de representación teatral.",
      ]},
    ],
  },
  {
    title: "3. Aceptación de las condiciones",
    content: [
      { type: "text", text: "El acceso y utilización de la plataforma implica la aceptación plena y sin reservas del presente Aviso Legal, así como de las demás políticas y condiciones publicadas por ObrasDeTeatro®." },
      { type: "text", text: "Si el usuario no estuviera de acuerdo con alguna de las condiciones aquí establecidas, deberá abstenerse de utilizar la plataforma." },
    ],
  },
  {
    title: "4. Mayoría de edad",
    content: [
      { type: "highlight", text: "El acceso a los servicios de registro de ObrasDeTeatro® está reservado exclusivamente a personas mayores de dieciocho (18) años." },
      { type: "text", text: "Al registrarse, el usuario declara expresamente ser mayor de edad y disponer de capacidad legal suficiente para contratar y utilizar los servicios ofrecidos por la plataforma." },
    ],
  },
  {
    title: "5. Uso correcto de la plataforma",
    content: [
      { type: "text", text: "Los usuarios se comprometen a utilizar la plataforma de forma diligente, responsable y conforme a la legislación vigente. Queda expresamente prohibido:" },
      { type: "list", items: [
        "Publicar información falsa o engañosa.",
        "Suplantar la identidad de terceros.",
        "Publicar contenido difamatorio o discriminatorio.",
        "Utilizar sistemas automatizados no autorizados.",
        "Introducir virus o software malicioso.",
        "Vulnerar derechos de propiedad intelectual.",
        "Utilizar la plataforma para fines ilícitos.",
      ]},
    ],
  },
  {
    title: "6. Contenidos publicados por los usuarios",
    content: [
      { type: "text", text: "Los usuarios son los únicos responsables de los contenidos que publiquen o compartan en la plataforma." },
      { type: "text", text: "ObrasDeTeatro® actúa como proveedor de servicios digitales y no asume responsabilidad sobre los contenidos aportados por los usuarios. No obstante, se reserva el derecho a revisar, suspender, modificar o eliminar cualquier contenido que considere contrario a la ley o a los presentes términos." },
    ],
  },
  {
    title: "7. Obras teatrales y propiedad intelectual",
    content: [
      { type: "text", text: "Las obras teatrales de dominio público o libres de derechos podrán ponerse a disposición de los usuarios conforme a las condiciones establecidas por la plataforma." },
      { type: "text", text: "Las obras sujetas a derechos de propiedad intelectual únicamente podrán mostrar información descriptiva (título, autor, sinopsis, género, datos técnicos y fragmentos autorizados). Salvo autorización expresa del titular, no se facilitará acceso al texto completo ni a materiales protegidos." },
      { type: "text", text: "El usuario declara y garantiza disponer de todos los derechos, autorizaciones o licencias necesarias para publicar cualquier contenido en la plataforma." },
    ],
  },
  {
    title: "8. ScenaIA",
    content: [
      { type: "text", text: "ScenaIA es un conjunto de herramientas basadas en inteligencia artificial destinadas a apoyar procesos creativos y profesionales. Los resultados generados tienen carácter exclusivamente orientativo. ObrasDeTeatro® no garantiza exactitud absoluta, resultados profesionales concretos, éxito artístico o comercial, ni asesoramiento jurídico, laboral o profesional." },
    ],
  },
  {
    title: "9. Exclusión de responsabilidad",
    content: [
      { type: "text", text: "ObrasDeTeatro® no será responsable de decisiones adoptadas por los usuarios, relaciones contractuales entre usuarios, daños derivados de contenidos de terceros, interrupciones temporales del servicio, errores tecnológicos inevitables ni pérdidas económicas derivadas del uso de la plataforma." },
    ],
  },
  {
    title: "10. Legislación aplicable y jurisdicción",
    content: [
      { type: "text", text: "La relación entre ObrasDeTeatro® y los usuarios se regirá por la legislación española. Para cualquier controversia, las partes se someterán a los Juzgados y Tribunales competentes de Santa Cruz de Tenerife, salvo que la normativa de protección de consumidores disponga otra cosa." },
    ],
  },
];

export default function AvisoLegalPage() {
  return (
    <LegalPage
      title="Aviso Legal"
      lastUpdate="15 de junio de 2026"
      sections={SECTIONS}
    />
  );
}
