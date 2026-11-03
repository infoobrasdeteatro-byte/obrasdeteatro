import type { Metadata } from 'next'
import TopNav from '@/components/design-system/TopNav'
import { ESCALONES_EMBAJADOR } from '@/lib/embajadores/textos'

export const metadata: Metadata = {
  title: 'Bases de Embajadores de Escena | ObrasDeTeatro®',
  description: 'Condiciones del programa Embajadores de Escena de ObrasDeTeatro®: membresía, cortesía para colegas, colegas activos y escalera de recompensas.',
}

/** Recompensa de cada escalón, en forma impersonal (vale para quien lea las bases). */
const RECOMPENSA: Record<(typeof ESCALONES_EMBAJADOR)[number], string> = {
  5: '6 meses más de membresía Destacado',
  10: '12 meses más de membresía Destacado',
  25: 'Embajador/a de Honor: la membresía Destacado, para siempre, y el distintivo «Embajadora de Honor» o «Embajador de Honor»',
}

/** Condiciones del programa. Debe coincidir con las migraciones 20261025120000 y 20261103120000. */
export default function BasesEmbajadoresPage() {
  return (
    <>
      <TopNav />
      <main className="inv">
        <section className="inv-hero">
          <p className="inv-eyebrow">Embajadores de Escena</p>
          <h1 className="inv-titulo">Bases del programa</h1>
          <p className="inv-lead">Todo el programa es <strong>gratuito y sin compromiso</strong>: nunca se pide tarjeta ni se cobra nada por formar parte de él.</p>
        </section>

        <section className="inv-bloque">
          <h2 className="inv-h2">1. Qué es</h2>
          <p className="inv-p">
            Embajadores de Escena reúne, por invitación personal de ObrasDeTeatro®, a profesionales de la escena cuya trayectoria es
            un referente. Cada invitación es personal, de un solo uso, y caduca a los 30 días si no se acepta.
          </p>
        </section>

        <section className="inv-bloque">
          <h2 className="inv-h2">2. Qué recibe el embajador o la embajadora</h2>
          <ul className="inv-lista">
            <li>Un año de membresía Destacado por cortesía, desde que acepta la invitación.</li>
            <li>El distintivo «Embajadora de Escena» o «Embajador de Escena» en su ficha profesional y en el Directorio, donde los embajadores aparecen en primer lugar.</li>
            <li>Un enlace personal para invitar a sus colegas, válido mientras su membresía está activa.</li>
            <li>Puede renunciar en cualquier momento. Al terminar la membresía, la cuenta vuelve a su plan; si ya paga un plan superior, lo conserva: el programa nunca baja un plan.</li>
          </ul>
        </section>

        <section className="inv-bloque">
          <h2 className="inv-h2">3. Tres meses para sus colegas</h2>
          <ul className="inv-lista">
            <li>Quien se registra con el enlace de un embajador recibe <strong>tres meses de Premium</strong> si es una persona, o <strong>tres meses del plan Empresas</strong> si es una organización (compañía, sala, escuela, productora, festival o institución).</li>
            <li>Se activa sola al confirmar el correo de la cuenta, sin tarjeta y sin ningún botón.</li>
            <li>Solo para cuentas nuevas y una sola vez por cuenta. Cuenta el primer enlace con el que se registra cada persona u organización.</li>
            <li>Si la cuenta ya tiene un plan superior, lo conserva. Al terminar los tres meses, vuelve a su plan.</li>
          </ul>
        </section>

        <section className="inv-bloque">
          <h2 className="inv-h2">4. Colegas activos y puntos</h2>
          <ul className="inv-lista">
            <li><strong>Profesional activo:</strong> correo confirmado, foto de perfil y al menos una profesión elegida. 1 punto.</li>
            <li><strong>Organización activa:</strong> perfil completo (logo, presentación y ciudad), o sala con su ficha de Espacios Escénicos reclamada y aprobada. 3 puntos.</li>
            <li>Las cuentas de público general pueden unirse con el enlace de un embajador, pero no suman puntos.</li>
            <li>Los puntos se calculan siempre con los datos reales de cada perfil.</li>
          </ul>
        </section>

        <section className="inv-bloque">
          <h2 className="inv-h2">5. Escalera de recompensas</h2>
          <ul className="inv-lista">
            {ESCALONES_EMBAJADOR.map(e => (
              <li key={e}><strong>{e} puntos.</strong> {RECOMPENSA[e]}.</li>
            ))}
          </ul>
          <p className="inv-p">
            Las recompensas se otorgan solas, una sola vez cada una, y avisamos por correo al embajador al subir de escalón. El tiempo
            ganado se suma al que le quede (o empieza ese día, si su membresía ya había terminado): nunca lo sustituye ni lo recorta. Si
            ya paga un plan superior a Destacado, lo conserva. Quien renuncia a su membresía deja de recibir recompensas.
          </p>
        </section>

        <section className="inv-bloque">
          <h2 className="inv-h2">6. Sin compromiso</h2>
          <p className="inv-p">
            Ni la membresía, ni los meses de los colegas, ni las recompensas generan cobros ni renovaciones automáticas. La suscripción a
            un plan de pago solo se produce si se pide expresamente. Para cualquier duda, el contacto es hola@obrasdeteatro.com.
          </p>
        </section>
      </main>
    </>
  )
}
