import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Política de Noticias | ObrasDeTeatro®",
  description: "Cómo selecciona, resume y publica ObrasDeTeatro® las noticias de artes escénicas, de qué fuentes y cómo solicitar una retirada.",
  alternates: { canonical: "/legal/politica-noticias" },
};

// BORRADOR pendiente de revisión de Dirección (02/10/2026).
const SECTIONS = [
  {
    title: "1. Qué publicamos",
    content: [
      { type: "text", text: "La sección Noticias de ObrasDeTeatro® ofrece cada día una selección breve de la actualidad de las artes escénicas en los veinte países de habla hispana: estrenos, festivales, temporadas, premios, convocatorias y la vida de compañías, teatros y centros de formación." },
      { type: "text", text: "Publicamos dos o tres noticias al día como máximo. Preferimos pocas y bien escogidas a un flujo constante: la sección quiere ser un punto de encuentro del sector, no un agregador." },
    ],
  },
  {
    title: "2. Con qué criterio las elegimos",
    content: [
      { type: "list", items: [
        "Relevancia para profesionales y aficionados de las artes escénicas.",
        "Equilibrio entre países: ningún país debe dominar la sección, y revisamos periódicamente el reparto.",
        "Fiabilidad de la fuente: solo trabajamos con medios que nos han dado permiso y con fuentes públicas cuyas condiciones permiten la reutilización.",
        "Actualidad: si una noticia no se revisa en unos días, se descarta.",
      ]},
    ],
  },
  {
    title: "3. Resúmenes propios, siempre con enlace a la fuente",
    content: [
      { type: "text", text: "Cada noticia es un resumen breve redactado para ObrasDeTeatro®, de unas pocas líneas, que indica con claridad la fuente de la que procede e incluye un enlace a la información original." },
      { type: "highlight", text: "No reproducimos artículos, no copiamos su texto ni utilizamos imágenes de terceros. Para leer la información completa, remitimos siempre a la fuente original." },
      { type: "text", text: "No hay fichas individuales de noticias en la plataforma: la sección es un listado de resúmenes que dirige el tráfico hacia los medios y organismos que generan la información." },
    ],
  },
  {
    title: "4. Uso de inteligencia artificial y revisión humana",
    content: [
      { type: "text", text: "Para preparar la selección diaria nos apoyamos en herramientas de inteligencia artificial que ayudan a identificar noticias relevantes y a redactar un primer borrador del resumen." },
      { type: "text", text: "Ninguna noticia se publica de forma automática. Una persona del equipo revisa cada propuesta, comprueba el resumen frente a la fuente original y decide si se publica, se corrige o se descarta." },
    ],
  },
  {
    title: "5. Fuentes y licencias",
    content: [
      { type: "list", items: [
        "Medios de comunicación: solo publicamos resúmenes de medios que nos han concedido permiso expreso para ello.",
        "Fuentes públicas: la información de administraciones y organismos públicos se reutiliza conforme a las condiciones de reutilización o aviso legal de cada fuente, citando siempre su origen.",
      ]},
      { type: "text", text: "Las marcas, nombres y contenidos de las fuentes pertenecen a sus respectivos titulares. La mención de una fuente no implica ninguna relación comercial con ella." },
    ],
  },
  {
    title: "6. Solicitar una retirada o una corrección",
    content: [
      { type: "text", text: "Si eres titular de una fuente citada, apareces en una noticia o detectas un error, puedes pedirnos que la corrijamos o la retiremos escribiendo a legal@obrasdeteatro.com e indicando el titular de la noticia y el motivo de tu solicitud." },
      { type: "highlight", text: "Respondemos a las solicitudes de retirada en un plazo máximo de 48 horas. Mientras las estudiamos, podemos retirar la noticia de forma cautelar." },
      { type: "contact", items: [
        { label: "Solicitudes de retirada", value: "legal@obrasdeteatro.com", href: "mailto:legal@obrasdeteatro.com?subject=Solicitud%20de%20retirada%20de%20una%20noticia" },
        { label: "Contacto general", value: "info@obrasdeteatro.com", href: "mailto:info@obrasdeteatro.com" },
      ]},
    ],
  },
];

export default function PoliticaNoticiasPage() {
  return (
    <LegalPage
      title="Política de Noticias"
      lastUpdate="2 de octubre de 2026"
      sections={SECTIONS}
    />
  );
}
