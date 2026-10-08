import type { Metadata } from 'next'
import Link from 'next/link'
import TopNav from '@/components/design-system/TopNav'
import { verificarTokenBaja } from '@/lib/alertas/alertas'
import { confirmarBaja } from './actions'

export const metadata: Metadata = {
  title: 'Baja de las alertas de convocatorias | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

type Props = { searchParams: Promise<{ t?: string; resultado?: string }> }

/**
 * Baja de las alertas de convocatorias desde el enlace del correo, sin
 * iniciar sesión.
 *
 * ESTA PÁGINA NO DA DE BAJA AL ABRIRSE: los antivirus de correo abren los
 * enlaces por su cuenta y darían de baja a la gente sin querer. Enseña un
 * único botón que hace POST (confirmarBaja). La baja de verdad «de un clic»
 * la hace el propio cliente de correo con la cabecera List-Unsubscribe, que
 * llama a POST /api/alertas/baja.
 */
export default async function BajaAlertasPage({ searchParams }: Props) {
  const { t, resultado } = await searchParams

  let contenido: React.ReactNode
  if (resultado === 'hecha') {
    contenido = (
      <>
        <h1 className="page-title">Te has dado de baja</h1>
        <p style={{ fontSize: '14px', color: 'var(--text)', marginTop: '10px' }}>
          No recibirás más alertas de convocatorias. Puedes volver a activarlas cuando quieras desde tu Centro Profesional.
        </p>
        <Link href="/perfil/centro#alertas" className="table-link" style={{ display: 'inline-block', marginTop: '14px' }}>
          Ir a mis alertas →
        </Link>
      </>
    )
  } else if (resultado === 'error') {
    contenido = <p style={{ fontSize: '14px', color: 'var(--text)' }}>No se pudo completar la baja. Inténtalo de nuevo en unos minutos.</p>
  } else if (resultado === 'token_invalido' || !verificarTokenBaja(t)) {
    contenido = (
      <p style={{ fontSize: '14px', color: 'var(--text)' }}>
        Este enlace de baja no es válido. Puedes desactivar las alertas desde tu{' '}
        <Link href="/perfil/centro#alertas" className="table-link">Centro Profesional</Link>.
      </p>
    )
  } else {
    contenido = (
      <>
        <h1 className="page-title">Alertas de convocatorias</h1>
        <p style={{ fontSize: '14px', color: 'var(--text)', marginTop: '10px' }}>
          ¿Quieres dejar de recibir las alertas de convocatorias por correo?
        </p>
        <form action={confirmarBaja} style={{ marginTop: '16px' }}>
          <input type="hidden" name="t" value={t} />
          <button type="submit" className="ds-btn-primary" style={{ width: 'auto', padding: '10px 22px', fontSize: '13px' }}>
            Darme de baja
          </button>
        </form>
      </>
    )
  }

  return (
    <>
      <TopNav />
      <main style={{ background: 'var(--off)', minHeight: '70vh', padding: '48px 24px' }}>
        <div className="account-card" style={{ maxWidth: '560px', margin: '0 auto' }}>{contenido}</div>
      </main>
    </>
  )
}
