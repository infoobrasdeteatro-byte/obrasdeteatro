import type { Metadata } from 'next'
import Link from 'next/link'
import TopNav from '@/components/design-system/TopNav'
import { ESCALONES, PROPOSITO, recompensaEscalon } from '@/lib/elenco/textos'

export const metadata: Metadata = {
  title: 'Bases del Elenco Fundador | ObrasDeTeatro®',
  description: 'Condiciones del programa Elenco Fundador de ObrasDeTeatro®: bono, plazos, colegas activos y escalera de recompensas.',
}

/** Condiciones del programa. Debe coincidir con la migración 20261031120000_elenco_fundador. */
export default function BasesElencoPage() {
  return (
    <>
      <TopNav />
      <main className="inv">
        <section className="inv-hero">
          <p className="inv-eyebrow">Elenco Fundador</p>
          <h1 className="inv-titulo">Bases del programa</h1>
          <p className="inv-lead">{PROPOSITO} Todo el programa es <strong>gratuito y sin compromiso</strong>: nunca se pide tarjeta ni se cobra nada por formar parte de él.</p>
        </section>

        <section className="inv-bloque">
          <h2 className="inv-h2">1. Qué es</h2>
          <p className="inv-p">
            El Elenco Fundador reúne, por invitación personal de ObrasDeTeatro®, a profesionales de cualquier oficio de la escena y a
            organizaciones (compañías, salas, escuelas, productoras y festivales). Cada fundador tiene un número propio y el distintivo
            «Elenco Fundador nº …» en su perfil público y en el directorio. Su plan de base es el gratuito, para siempre.
          </p>
        </section>

        <section className="inv-bloque">
          <h2 className="inv-h2">2. Bono de bienvenida</h2>
          <ul className="inv-lista">
            <li>Tres meses de Premium si eres una persona, o tres meses del plan Empresas si eres una organización.</li>
            <li>No se activa solo: lo activas tú con un botón en «Mi red», cuando quieras, dentro de los 12 meses siguientes a aceptar la invitación. Si no lo activas en ese plazo, caduca.</li>
            <li>Al terminar, tu cuenta vuelve a su plan. Si ya pagas un plan superior, lo conservas: el programa nunca baja un plan.</li>
          </ul>
        </section>

        <section className="inv-bloque">
          <h2 className="inv-h2">3. Tu enlace y tus colegas</h2>
          <ul className="inv-lista">
            <li>Cada fundador tiene un enlace público para invitar a sus colegas. Quien se une con él entra en el plan gratuito.</li>
            <li>Cuenta el primer enlace con el que se registra cada persona u organización, una sola vez por cuenta. Quien ya tiene cuenta no se atribuye a nadie.</li>
            <li><strong>Colega activo:</strong> una persona con el correo confirmado y foto de perfil (1 punto); una organización con el perfil completo y su logo, o una sala con su ficha de Espacios Escénicos reclamada y aprobada (3 puntos).</li>
            <li>Los puntos se calculan siempre con los datos reales de cada perfil.</li>
          </ul>
        </section>

        <section className="inv-bloque">
          <h2 className="inv-h2">4. Escalera de recompensas</h2>
          <ul className="inv-lista">
            {ESCALONES.map(e => (
              <li key={e}><strong>{e} puntos.</strong> Personas: {recompensaEscalon(e, 'persona')}. Organizaciones: {recompensaEscalon(e, 'organizacion')}.</li>
            ))}
          </ul>
          <p className="inv-p">
            Las recompensas se otorgan solas, una sola vez cada una, y te avisamos por correo al subir de escalón. El tiempo que ganas se suma
            al que ya tengas: nunca lo sustituye ni lo recorta. Los planes Empresas del programa incluyen todas sus funciones.
          </p>
        </section>

        <section className="inv-bloque">
          <h2 className="inv-h2">5. Sin compromiso</h2>
          <p className="inv-p">
            Ni el bono ni las recompensas generan cobros ni renovaciones automáticas. Si en algún momento decides suscribirte a un plan,
            será siempre porque lo pides tú. Para cualquier duda, escríbenos a hola@obrasdeteatro.com.
          </p>
        </section>

        <p className="inv-p"><Link href="/elenco-fundador">Conoce el Elenco Fundador →</Link></p>
      </main>
    </>
  )
}
