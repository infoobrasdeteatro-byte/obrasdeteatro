import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import TopNav from '@/components/design-system/TopNav'
import { darDeBaja } from '../acciones'
import { configBoletin } from '@/lib/boletin/datos'
import { verificarTokenBaja } from '@/lib/boletin/boletin'

export const metadata: Metadata = { title: 'Baja del boletín | ObrasDeTeatro', robots: { index: false, follow: false } }

type Props = { searchParams: Promise<{ t?: string; resultado?: string }> }

/** Baja del boletín. Como en las alertas, NO da de baja al abrirse: un botón hace el POST. */
export default async function BajaBoletinPage({ searchParams }: Props) {
  const { t, resultado } = await searchParams
  const { nombre } = await configBoletin()

  async function accion(form: FormData) {
    'use server'
    const r = await darDeBaja(String(form.get('t') ?? ''))
    redirect(`/boletin/baja?resultado=${r}`)
  }

  let contenido: React.ReactNode
  if (resultado === 'hecha') {
    contenido = (
      <>
        <h1 className="page-title">Te has dado de baja</h1>
        <p style={{ fontSize: '14px', color: 'var(--text)', marginTop: '10px', lineHeight: 1.6 }}>
          No recibirás más {nombre}. Si cambias de idea, puedes volver a suscribirte en <Link href="/boletin" className="table-link">obrasdeteatro.com/boletin</Link>.
        </p>
      </>
    )
  } else if (resultado === 'error') {
    contenido = <p style={{ fontSize: '14px', color: 'var(--text)' }}>No se pudo completar la baja. Inténtalo de nuevo en unos minutos.</p>
  } else if (resultado === 'invalido' || !verificarTokenBaja(t)) {
    contenido = (
      <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6 }}>
        Este enlace de baja no es válido. Escríbenos a <a href="mailto:hola@obrasdeteatro.com" className="table-link">hola@obrasdeteatro.com</a> y te damos de baja.
      </p>
    )
  } else {
    contenido = (
      <>
        <h1 className="page-title">{nombre}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text)', marginTop: '10px' }}>¿Quieres dejar de recibir el boletín?</p>
        <form action={accion} style={{ marginTop: '16px' }}>
          <input type="hidden" name="t" value={t} />
          <button type="submit" className="ds-btn-primary" style={{ width: 'auto', padding: '10px 22px', fontSize: '13px' }}>Darme de baja</button>
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
