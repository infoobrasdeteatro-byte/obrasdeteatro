import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Términos y Condiciones | ObrasDeTeatro®",
  description: "Términos y Condiciones de uso de ObrasDeTeatro®, la plataforma digital profesional para el ecosistema teatral en lengua española.",
};

const SECTIONS = [
  {
    title: "1. Objeto",
    content: [
      { type: "text", text: "Los presentes Términos y Condiciones regulan el acceso, navegación, registro y utilización de la plataforma digital ObrasDeTeatro®, gestionada por CONECTA PLUS GLOBAL, S.L.U." },
      { type: "text", text: "La plataforma constituye un ecosistema digital profesional destinado a conectar actores, directores, dramaturgos, compañías, productoras, teatros, festivales, escuelas, instituciones públicas y demás agentes relacionados con las artes escénicas." },
    ],
  },
  {
    title: "2. Aceptación de los términos",
    content: [
      { type: "text", text: "El acceso o utilización de la plataforma implica la aceptación íntegra de estos términos. Si el usuario no acepta cualquiera de las disposiciones contenidas en el presente documento, deberá abstenerse de utilizar la plataforma." },
    ],
  },
  {
    title: "3. Requisitos de registro",
    content: [
      { type: "highlight", text: "Podrán registrarse únicamente personas mayores de dieciocho (18) años." },
      { type: "text", text: "Al registrarse, el usuario declara:" },
      { type: "list", items: [
        "Ser mayor de edad.",
        "Disponer de capacidad legal suficiente.",
        "Facilitar información veraz.",
        "Mantener actualizados sus datos.",
      ]},
      { type: "text", text: "La plataforma podrá suspender o cancelar cuentas que contengan información falsa o engañosa." },
    ],
  },
  {
    title: "4. Tipos de usuario",
    content: [
      { type: "text", text: "La plataforma admite, entre otros:" },
      { type: "list", items: [
        "Actores.", "Directores.", "Dramaturgos.", "Compañías teatrales.", "Productoras.",
        "Teatros.", "Festivales.", "Escuelas de interpretación.", "Instituciones públicas.",
        "Entidades culturales.", "Usuarios generales interesados en las artes escénicas.",
      ]},
    ],
  },
  {
    title: "5. Creación de perfiles",
    content: [
      { type: "text", text: "Cada usuario podrá disponer de un perfil profesional o institucional. El usuario será responsable de toda la información publicada en su perfil. ObrasDeTeatro® podrá solicitar documentación adicional para verificar determinados perfiles." },
    ],
  },
  {
    title: "6. Sistema de verificación",
    content: [
      { type: "text", text: "La plataforma podrá otorgar distintivos de verificación. La verificación únicamente acredita que ObrasDeTeatro® ha revisado determinada documentación o información." },
      { type: "text", text: "La verificación no implica garantía sobre profesionalidad, solvencia, experiencia, capacidad artística ni calidad de los servicios ofrecidos." },
    ],
  },
  {
    title: "7. Publicación de obras teatrales",
    content: [
      { type: "text", text: "Los usuarios podrán publicar fichas informativas de obras teatrales incluyendo título, autor, sinopsis, género, duración, reparto, fotografías, material promocional y fragmentos autorizados." },
      { type: "text", text: "Las obras protegidas por derechos de autor únicamente podrán mostrar información descriptiva y fragmentos autorizados. Salvo autorización expresa del titular, no se facilitarán textos completos ni material protegido susceptible de explotación." },
    ],
  },
  {
    title: "8. Castings",
    content: [
      { type: "text", text: "Los usuarios autorizados podrán publicar castings incluyendo nombre del proyecto, descripción, perfil buscado, remuneración, ubicación, fechas e información de contacto." },
      { type: "text", text: "ObrasDeTeatro® no garantiza la contratación de candidatos ni la autenticidad absoluta de todas las ofertas publicadas." },
    ],
  },
  {
    title: "9. Convocatorias",
    content: [
      { type: "text", text: "Las convocatorias publicadas podrán incluir becas, premios, residencias, ayudas públicas, festivales y oportunidades relacionadas con las artes escénicas. Todas las convocatorias estarán sujetas a revisión previa por parte de la plataforma." },
    ],
  },
  {
    title: "10. ScenaIA",
    content: [
      { type: "text", text: "ScenaIA es una herramienta basada en inteligencia artificial destinada a apoyar procesos creativos y profesionales. Podrá analizar currículums, guiones, obras, textos y documentos aportados por los usuarios." },
      { type: "text", text: "Los resultados generados tienen carácter orientativo. ObrasDeTeatro® no garantiza exactitud absoluta, resultados profesionales concretos, éxito artístico, obtención de empleo ni contrataciones." },
      { type: "text", text: "El usuario declara ser titular de los derechos o disponer de autorización suficiente sobre los documentos enviados para análisis, y mantendrá indemne a ObrasDeTeatro® frente a cualquier reclamación derivada de dichos contenidos." },
    ],
  },
  {
    title: "11. Suscripciones y renovaciones",
    content: [
      { type: "text", text: "La plataforma ofrece planes gratuitos y planes de pago. Los planes de pago pueden incluir mayor visibilidad, herramientas avanzadas, funciones premium, servicios de inteligencia artificial, estadísticas y perfiles destacados." },
      { type: "text", text: "Las suscripciones se renovarán automáticamente salvo cancelación expresa por parte del usuario. La cancelación impedirá futuras renovaciones pero no dará derecho a devolución de cantidades ya abonadas, salvo obligación legal." },
      { type: "highlight", text: "La contratación de servicios premium no garantiza contrataciones, audiciones, representaciones, ventas, visibilidad específica ni resultados económicos." },
    ],
  },
  {
    title: "12. Suspensión de cuentas",
    content: [
      { type: "text", text: "ObrasDeTeatro® podrá suspender o cancelar cuentas cuando exista incumplimiento de estos términos, uso fraudulento, infracción de derechos de terceros o riesgo para la seguridad de la plataforma." },
    ],
  },
  {
    title: "13. Exclusión de responsabilidad",
    content: [
      { type: "text", text: "ObrasDeTeatro® actúa como plataforma tecnológica e intermediaria digital. No será responsable de acuerdos celebrados entre usuarios, contrataciones, representaciones teatrales, negociaciones privadas ni contenidos aportados por terceros." },
    ],
  },
  {
    title: "14. Ley aplicable y jurisdicción",
    content: [
      { type: "text", text: "Los presentes términos se regirán por la legislación española. Las controversias que pudieran surgir se someterán a los Juzgados y Tribunales de Santa Cruz de Tenerife, salvo disposición legal imperativa en contrario." },
    ],
  },
];

export default function TerminosPage() {
  return (
    <LegalPage
      title="Términos y Condiciones de Uso"
      lastUpdate="15 de junio de 2026"
      sections={SECTIONS}
    />
  );
}
