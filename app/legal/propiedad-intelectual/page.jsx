import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Política de Propiedad Intelectual | ObrasDeTeatro®",
  description: "Política de Propiedad Intelectual de ObrasDeTeatro®: titularidad, uso y protección de los contenidos publicados en la plataforma.",
};

const SECTIONS = [
  {
    title: "1. Objeto",
    content: [
      { type: "text", text: "La presente Política regula el uso, publicación, gestión y protección de los contenidos difundidos a través de ObrasDeTeatro®, titularidad de CONECTA PLUS GLOBAL, S.L.U., con la finalidad de proteger los derechos de autores, dramaturgos, compañías, productoras, festivales y demás usuarios que publiquen contenidos en la plataforma." },
    ],
  },
  {
    title: "2. Titularidad de los derechos",
    content: [
      { type: "text", text: "Todos los derechos de propiedad intelectual sobre obras, guiones, textos, fotografías, vídeos, imágenes, logotipos, carteles y demás contenidos publicados en ObrasDeTeatro® pertenecen a sus respectivos titulares." },
      { type: "highlight", text: "La publicación de contenidos en la plataforma no implica cesión de derechos de propiedad intelectual a favor de ObrasDeTeatro®." },
    ],
  },
  {
    title: "3. Responsabilidad de los usuarios",
    content: [
      { type: "text", text: "Cada usuario será el único responsable de los contenidos que publique. Al publicar cualquier contenido, el usuario declara y garantiza que es titular de los derechos correspondientes o dispone de autorización suficiente para su utilización y publicación." },
      { type: "text", text: "ObrasDeTeatro® podrá solicitar documentación acreditativa cuando lo considere necesario." },
    ],
  },
  {
    title: "4. Obras libres de derechos",
    content: [
      { type: "text", text: "Las obras identificadas como libres de derechos podrán ponerse a disposición de los usuarios conforme a las condiciones establecidas por sus respectivos titulares. ObrasDeTeatro® no garantiza la existencia, vigencia o alcance de dichas autorizaciones." },
      { type: "text", text: "Corresponde al usuario verificar la situación jurídica de cada obra antes de su utilización." },
    ],
  },
  {
    title: "5. Obras protegidas por derechos de autor",
    content: [
      { type: "text", text: "Las obras protegidas únicamente podrán mostrar título, autor, sinopsis, información artística y fragmentos autorizados expresamente por el titular." },
      { type: "highlight", text: "Salvo autorización expresa, no se permitirá la descarga ni reproducción íntegra de obras protegidas." },
    ],
  },
  {
    title: "6. Derechos de representación",
    content: [
      { type: "text", text: "ObrasDeTeatro® podrá facilitar el contacto entre interesados y titulares de derechos para la gestión de representaciones teatrales, adaptaciones audiovisuales, traducciones, publicaciones editoriales y licencias de explotación." },
      { type: "text", text: "La plataforma actúa exclusivamente como intermediario tecnológico. Los acuerdos alcanzados serán responsabilidad exclusiva de las partes implicadas." },
    ],
  },
  {
    title: "7. Contenidos generados por los usuarios",
    content: [
      { type: "text", text: "Los usuarios conservarán en todo momento la titularidad de los contenidos que publiquen." },
      { type: "text", text: "No obstante, al publicar contenidos en ObrasDeTeatro®, el usuario concede a la plataforma una licencia no exclusiva, mundial y gratuita para alojar, mostrar, indexar y promocionar los contenidos dentro de la plataforma. Esta autorización permanecerá vigente mientras el contenido permanezca publicado." },
    ],
  },
  {
    title: "8. ScenaIA y propiedad intelectual",
    content: [
      { type: "text", text: "Los contenidos enviados para análisis a ScenaIA no se transfieren a ObrasDeTeatro® como propiedad y continúan siendo titularidad de sus respectivos autores." },
      { type: "text", text: "El usuario declara disponer de los derechos necesarios sobre cualquier documento enviado. Los resultados generados tienen carácter orientativo y no implican atribución de derechos de propiedad intelectual a ObrasDeTeatro®." },
    ],
  },
  {
    title: "9. Prohibiciones",
    content: [
      { type: "list", items: [
        "Publicar contenidos sin autorización.",
        "Publicar obras ajenas como propias.",
        "Distribuir material protegido sin autorización.",
        "Eliminar información de autoría.",
        "Suplantar la identidad de autores o titulares de derechos.",
        "Utilizar la plataforma para actividades contrarias a la legislación vigente.",
      ]},
    ],
  },
  {
    title: "10. Procedimiento de retirada de contenidos",
    content: [
      { type: "text", text: "Los titulares de derechos podrán solicitar la revisión o retirada de contenidos mediante comunicación a legal@obrasdeteatro.com, incluyendo:" },
      { type: "list", items: [
        "Identificación del reclamante.",
        "Identificación del contenido afectado.",
        "Justificación de la titularidad.",
      ]},
      { type: "text", text: "ObrasDeTeatro® podrá suspender temporalmente o retirar definitivamente el contenido." },
    ],
  },
  {
    title: "11. Reincidencia",
    content: [
      { type: "text", text: "Los usuarios que acumulen reclamaciones fundadas por infracción de derechos podrán ser objeto de advertencias, suspensión temporal, suspensión definitiva, eliminación de contenidos o cancelación de la cuenta." },
    ],
  },
  {
    title: "12. Contacto",
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

export default function PropiedadIntelectualPage() {
  return (
    <LegalPage
      title="Política de Propiedad Intelectual"
      lastUpdate="18 de septiembre de 2026"
      sections={SECTIONS}
    />
  );
}
