import type { Metadata } from 'next'
import Link from 'next/link'
import TopNav from '@/components/design-system/TopNav'
import FormularioBoletin from '@/components/boletin/FormularioBoletin'
import { configBoletin } from '@/lib/boletin/datos'
import { DIAS } from '@/lib/boletin/boletin'

export async function generateMetadata(): Promise<Metadata> {
  const { nombre } = await configBoletin()
  return {
    title: `${nombre}: el boletín semanal | ObrasDeTeatro`,
    description: `Suscríbete a ${nombre}, el boletín semanal de obrasdeteatro.com: noticias, convocatorias, formación y Mediateca del teatro en español.`,
    alternates: { canonical: '/boletin' },
  }
}

export default async function BoletinPage() {
  const config = await configBoletin()
  const dia = DIAS[config.dia_envio - 1] ?? 'jueves'

  return (
    <>
      <TopNav />
      <main style={{ background: 'var(--off)', minHeight: '80vh', padding: '48px 24px 64px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <p className="obras-stat-label">El boletín de obrasdeteatro.com</p>
          <h1 className="page-title" style={{ marginTop: '6px' }}>{config.nombre}</h1>
          <p style={{ fontSize: '15px', color: 'var(--text)', lineHeight: 1.7, marginTop: '12px' }}>
            Cada {dia}, en tu correo, lo más destacado de la semana en el teatro en español: las noticias, las convocatorias
            abiertas, los cursos y talleres, y los nuevos episodios de la Mediateca. Gratis y sin publicidad invasiva.
          </p>

          <section className="account-card" style={{ marginTop: '24px' }}>
            {!config.activo ? (
              <p style={{ fontSize: '14px', color: 'var(--text)' }}>Muy pronto podrás suscribirte. Estamos preparando el primer número.</p>
            ) : config.acceso === 'pago' ? (
              <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6 }}>
                Ahora mismo {config.nombre} es exclusivo para los planes de pago. <Link href="/precios" className="table-link">Ver planes →</Link>
              </p>
            ) : (
              <FormularioBoletin nombre={config.nombre} origen="otro" />
            )}
          </section>
        </div>
      </main>
    </>
  )
}
