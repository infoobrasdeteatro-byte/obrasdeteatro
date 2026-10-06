import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Política de Noticias | ObrasDeTeatro®",
  description: "Cómo selecciona, resume y publica ObrasDeTeatro® las noticias de artes escénicas, de qué fuentes y cómo solicitar una retirada.",
  alternates: { canonical: "/legal/politica-noticias" },
};

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
      { type: "text", text: "CONECTA PLUS GLOBAL, S.L.U., titular de ObrasDeTeatro®, asume la responsabilidad editorial de los resúmenes publicados en esta sección." },
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
      { type: "text", text: "Si eres titular de una fuente citada, apareces en una noticia o detectas un error, puedes pedirnos que la corrijamos o la retiremos escribiendo a hola@obrasdeteatro.com e indicando el titular de la noticia y el motivo de tu solicitud." },
      { type: "highlight", text: "Respondemos a las solicitudes de retirada en un plazo máximo de 48 horas. Mientras las estudiamos, podemos retirar la noticia de forma cautelar." },
      { type: "contact", items: [
        { label: "Solicitudes de retirada", value: "hola@obrasdeteatro.com", href: "mailto:hola@obrasdeteatro.com?subject=Solicitud%20de%20retirada%20de%20una%20noticia" },
        { label: "Contacto general", value: "info@obrasdeteatro.com", href: "mailto:info@obrasdeteatro.com" },
      ]},
    ],
  },
  {
    title: "7. Convocatorias recopiladas por la redacción",
    content: [
      { type: "text", text: "Además de las convocatorias que publican directamente los usuarios, la redacción de ObrasDeTeatro® recopila convocatorias públicas de artes escénicas (festivales, premios, residencias, becas, ayudas y subvenciones) de los veinte países de habla hispana." },
      { type: "list", items: [
        "Fuentes públicas: solo recogemos convocatorias difundidas públicamente por la entidad que convoca o por organismos y medios que las anuncian.",
        "Resumen propio: cada convocatoria se presenta con un resumen breve redactado para ObrasDeTeatro®, que indica la entidad convocante, el país, la fecha límite y, si la hay, la dotación. No reproducimos las bases.",
        "Enlace a las bases oficiales: cada ficha enlaza a las bases publicadas por la entidad convocante, que son las únicas que rigen la convocatoria, e indica la fuente de la que procede.",
        "Revisión humana antes de publicar: nos apoyamos en herramientas de inteligencia artificial para localizar convocatorias y redactar un primer borrador, pero ninguna se publica de forma automática. Una persona del equipo revisa cada propuesta frente a sus bases antes de publicarla.",
      ]},
      { type: "highlight", text: "Las fichas de la redacción llevan el aviso «Información recopilada por la redacción de obrasdeteatro.com a partir de fuentes públicas. Consulta siempre las bases oficiales.». En caso de discrepancia, prevalecen siempre las bases oficiales." },
      { type: "text", text: "Si representas a la entidad convocante y quieres que retiremos o corrijamos una convocatoria, escríbenos a hola@obrasdeteatro.com indicando el título de la convocatoria y el motivo de tu solicitud." },
      { type: "contact", items: [
        { label: "Retirada o corrección de una convocatoria", value: "hola@obrasdeteatro.com", href: "mailto:hola@obrasdeteatro.com?subject=Retirada%20o%20correcci%C3%B3n%20de%20una%20convocatoria" },
      ]},
    ],
  },
];

export default function PoliticaNoticiasPage() {
  return (
    <LegalPage
      title="Política de Noticias"
      lastUpdate="6 de octubre de 2026"
      sections={SECTIONS}
    />
  );
}
