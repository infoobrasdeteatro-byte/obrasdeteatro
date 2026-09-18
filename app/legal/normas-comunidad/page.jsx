import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Normas de la Comunidad | ObrasDeTeatro®",
  description: "Normas de la Comunidad de ObrasDeTeatro®: reglas de convivencia para un entorno profesional, seguro y respetuoso.",
};

const SECTIONS = [
  {
    title: "1. Objetivo",
    content: [
      { type: "text", text: "Las presentes Normas tienen como finalidad garantizar un entorno profesional, seguro y respetuoso dentro de ObrasDeTeatro®. Todos los usuarios deberán cumplirlas al utilizar la plataforma." },
    ],
  },
  {
    title: "2. Principios generales",
    content: [
      { type: "list", items: [
        "Respeto profesional.",
        "Colaboración artística.",
        "Transparencia.",
        "Creatividad.",
        "Protección de los derechos de autor.",
        "Diversidad cultural.",
        "Intercambio profesional dentro del ecosistema teatral.",
      ]},
    ],
  },
  {
    title: "3. Comportamiento respetuoso",
    content: [
      { type: "text", text: "Los usuarios deberán mantener un comportamiento adecuado y profesional. No se permitirá acoso, amenazas, insultos, discriminación, difamación, hostigamiento, lenguaje ofensivo ni intimidación." },
    ],
  },
  {
    title: "4. Uso de la mensajería",
    content: [
      { type: "highlight", text: "La mensajería interna es una funcionalidad planificada que todavía no está activa en la plataforma." },
      { type: "text", text: "Cuando esté disponible, la mensajería interna deberá utilizarse exclusivamente para fines relacionados con la actividad profesional y artística. Quedará prohibido el spam, publicidad masiva no solicitada, mensajes fraudulentos, solicitudes engañosas y acoso reiterado." },
    ],
  },
  {
    title: "5. Información veraz",
    content: [
      { type: "text", text: "Los usuarios deberán proporcionar información real y actualizada. No se permitirá la suplantación de identidad, perfiles falsos, documentación manipulada ni información engañosa." },
    ],
  },
  {
    title: "6. Propiedad intelectual",
    content: [
      { type: "text", text: "Los usuarios deberán respetar los derechos de propiedad intelectual de terceros. Queda prohibido publicar obras ajenas sin autorización, compartir material protegido sin permiso, eliminar créditos de autoría o utilizar contenido de terceros de forma indebida." },
    ],
  },
  {
    title: "7. Castings y convocatorias",
    content: [
      { type: "text", text: "Toda convocatoria o casting deberá ser real, estar correctamente identificada, contener información veraz y cumplir la legislación aplicable." },
      { type: "highlight", text: "No se permitirán castings ficticios, convocatorias engañosas ni promesas falsas de contratación." },
    ],
  },
  {
    title: "8. Contenidos prohibidos",
    content: [
      { type: "list", items: [
        "Contenido ilegal o fraudulento.",
        "Material que vulnere derechos de terceros.",
        "Información falsa.",
        "Malware o enlaces maliciosos.",
        "Contenido discriminatorio o difamatorio.",
      ]},
    ],
  },
  {
    title: "9. Protección de menores",
    content: [
      { type: "highlight", text: "La plataforma está dirigida exclusivamente a personas mayores de 18 años. No se permitirá el registro de menores de edad." },
    ],
  },
  {
    title: "10. Uso de ScenaIA",
    content: [
      { type: "text", text: "Los usuarios deberán utilizar ScenaIA de forma responsable. No se permitirá analizar documentos sin autorización, introducir contenidos ilícitos ni utilizar la herramienta para vulnerar derechos de terceros." },
      { type: "text", text: "Los resultados generados tienen carácter orientativo." },
    ],
  },
  {
    title: "11. Medidas disciplinarias",
    content: [
      { type: "text", text: "El incumplimiento de estas normas podrá dar lugar a advertencia, suspensión temporal, restricción de funcionalidades, eliminación de contenidos o cancelación definitiva de la cuenta." },
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

export default function NormasComunidadPage() {
  return (
    <LegalPage
      title="Normas de la Comunidad"
      lastUpdate="18 de septiembre de 2026"
      sections={SECTIONS}
    />
  );
}
