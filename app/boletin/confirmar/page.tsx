import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import TopNav from '@/components/design-system/TopNav'
import { confirmar } from '../acciones'
import { configBoletin } from '@/lib/boletin/datos'

export const metadata: Metadata = { title: 'Confirmar suscripción | ObrasDeTeatro', robots: { index: false, follow: false } }

type Props = { searchParams: Promise<{ t?: string; resultado?: string }> }

/**
 * Confirmación del boletín. NO CONFIRMA AL ABRIRSE: los antivirus de correo
 * abren los enlaces solos y confirmarían suscripciones que nadie ha pedido.
 * Un botón hace el POST.
 */
export default async function ConfirmarBoletinPage({ searchParams }: Props) {
  const { t, resultado } = await searchParams
  const { nombre } = await configBoletin()

  async function accion(form: FormData) {
    'use server'
    const r = await confirmar(String(form.get('t') ?? ''))
    redirect(`/boletin/confirmar?resultado=${r}`)
  }

  let contenido: React.ReactNode
  if (resultado === 'hecha') {
    contenido = (
      <>
        <h1 className="page-title">¡Suscripción confirmada!</h1>
        <p style={{ fontSize: '14px', color: 'var(--text)', marginTop: '10px', lineHeight: 1.6 }}>
          Desde esta semana recibirás <strong>{nombre}</strong> en tu correo. Puedes darte de baja cuando quieras desde el enlace de cada envío.
        </p>
        <Link href="/" className="ds-btn-primary" style={{ width: 'auto', display: 'inline-flex', padding: '10px 22px', marginTop: '16px' }}>Ir a la portada</Link>
      </>
    )
  } else if (resultado === 'invalido' || (!resultado && !t)) {
    contenido = (
      <>
        <h1 className="page-title">Enlace no válido o caducado</h1>
        <p style={{ fontSize: '14px', color: 'var(--text)', marginTop: '10px', lineHeight: 1.6 }}>
          Puede que ya hayas confirmado o que el enlace tenga más de 7 días. Vuelve a suscribirte desde <Link href="/boletin" className="table-link">esta página</Link>.
        </p>
      </>
    )
  } else if (resultado === 'error') {
    contenido = <p style={{ fontSize: '14px', color: 'var(--text)' }}>No se pudo confirmar. Inténtalo de nuevo en unos minutos.</p>
  } else {
    contenido = (
      <>
        <h1 className="page-title">Confirma tu suscripción</h1>
        <p style={{ fontSize: '14px', color: 'var(--text)', marginTop: '10px' }}>Pulsa el botón para empezar a recibir {nombre}.</p>
        <form action={accion} style={{ marginTop: '16px' }}>
          <input type="hidden" name="t" value={t} />
          <button type="submit" className="ds-btn-primary" style={{ width: 'auto', padding: '10px 22px', fontSize: '13px' }}>Confirmar suscripción</button>
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
