import LegalPage from "@/components/LegalPage";
import { PLANES } from "@/lib/plans";

export const metadata = {
  title: "Condiciones de Suscripción | ObrasDeTeatro®",
  description: "Condiciones de Suscripción de ObrasDeTeatro®: planes, pago, renovación automática, cancelación y desistimiento.",
};

// Nombre y precio de cada plan se leen de lib/plans.ts (la misma fuente que
// /precios) para que el texto legal no vuelva a desfasarse del precio real.
// Los beneficios resumen solo lo que ya funciona hoy; las funciones marcadas
// «Próximamente» en /precios no se enumeran aquí. Los límites de castings son
// los que aplica el trigger castings_sync_estado: castings activos a la vez.
const BENEFICIOS = {
  gratuito: "perfil básico en el directorio, acceso a la Biblioteca Digital, hasta 3 obras publicadas y hasta 3 convocatorias publicadas al mes. No incluye la publicación de castings.",
  premium: "perfil profesional completo, obras publicadas ilimitadas, convocatorias sin límite mensual y publicación de hasta 3 castings activos a la vez, con gestión de las candidaturas recibidas.",
  destacado: "todo lo del plan Premium, perfil destacado en el directorio, prioridad en búsquedas, analítica del perfil y publicación de hasta 10 castings activos a la vez.",
  empresas: "perfil institucional con gestión de equipo, prioridad máxima en el directorio, convocatorias sin límite mensual, castings activos ilimitados y soporte prioritario con gestor asignado.",
};

const formatoPrecio = (precio) =>
  precio === 0 ? "0 €" : `${precio.toFixed(2).replace(".", ",")} €/mes`;

const SECTIONS = [
  {
    title: "1. Objeto",
    content: [
      { type: "text", text: "Las presentes Condiciones regulan la contratación, renovación y cancelación de los planes de suscripción ofrecidos por ObrasDeTeatro®, plataforma gestionada por CONECTA PLUS GLOBAL, S.L.U." },
      { type: "highlight", text: "La contratación de cualquier plan implica la aceptación íntegra de estas condiciones." },
    ],
  },
  {
    title: "2. Planes disponibles",
    content: [
      { type: "list", items: PLANES.map((plan) => `${plan.nombre} (${formatoPrecio(plan.precio)}): ${BENEFICIOS[plan.id]}`) },
      { type: "text", text: "El detalle completo y actualizado de las funcionalidades de cada plan se publica en la página de precios (/precios)." },
    ],
  },
  {
    title: "3. Método de pago",
    content: [
      { type: "text", text: "Los pagos serán gestionados mediante Stripe u otros proveedores autorizados. Los métodos disponibles podrán incluir tarjeta de crédito, tarjeta de débito, Apple Pay, Google Pay y otros métodos habilitados." },
    ],
  },
  {
    title: "4. Renovación automática",
    content: [
      { type: "text", text: "Las suscripciones de pago se renovarán automáticamente al finalizar cada período contratado." },
      { type: "highlight", text: "El usuario autoriza expresamente dicha renovación al contratar un plan de pago." },
    ],
  },
  {
    title: "5. Cancelación",
    content: [
      { type: "highlight", text: "Actualmente la plataforma no ofrece una opción para cancelar solo la suscripción o su renovación automática manteniendo la cuenta. La única forma de cancelar una suscripción desde la cuenta es eliminar la cuenta (Cuenta → Eliminar cuenta)." },
      { type: "text", text: "Solicitar la eliminación no cancela todavía la suscripción. La suscripción se cancela en el momento en que el usuario completa la eliminación de la cuenta, sin esperar al final del período abonado: se pierde el acceso a las funcionalidades del plan y a la propia cuenta, y no se producirán futuras renovaciones. La cancelación no supondrá la devolución automática de cantidades ya abonadas, salvo obligación legal aplicable." },
    ],
  },
  {
    title: "6. Derecho de desistimiento",
    content: [
      { type: "text", text: "Cuando resulte aplicable conforme a la normativa de consumidores y usuarios, el usuario podrá ejercer su derecho de desistimiento dentro de los plazos legalmente establecidos." },
      { type: "text", text: "Sin embargo, cuando el usuario solicite expresamente el acceso inmediato a servicios digitales, podrá perder dicho derecho una vez iniciada la prestación efectiva del servicio." },
    ],
  },
  {
    title: "7. Limitación de responsabilidad",
    content: [
      { type: "text", text: "La contratación de un plan premium no garantiza contrataciones profesionales, participación en castings, selección en convocatorias, obtención de subvenciones, participación en festivales ni beneficios económicos." },
      { type: "text", text: "Las funcionalidades premium constituyen herramientas tecnológicas de apoyo." },
    ],
  },
  {
    title: "8. Contacto",
    content: [
      { type: "contact", items: [
        { label: "Facturación y comercial", value: "comercial@obrasdeteatro.com", href: "mailto:comercial@obrasdeteatro.com" },
        { label: "Asuntos legales", value: "legal@obrasdeteatro.com", href: "mailto:legal@obrasdeteatro.com" },
        { label: "Protección de datos", value: "protecciondatos@obrasdeteatro.com", href: "mailto:protecciondatos@obrasdeteatro.com" },
        { label: "Contacto general", value: "info@obrasdeteatro.com", href: "mailto:info@obrasdeteatro.com" },
        { label: "Razón Social", value: "CONECTA PLUS GLOBAL, S.L.U." },
        { label: "Domicilio", value: "Carretera General del Sur, S/N, Local 3, 38107 – Santa Cruz de Tenerife, España" },
      ]},
    ],
  },
];

export default function SuscripcionesPage() {
  return (
    <LegalPage
      title="Condiciones de Suscripción"
      lastUpdate="18 de septiembre de 2026"
      sections={SECTIONS}
    />
  );
}
