import type { Metadata } from 'next'
import Link from 'next/link'
import BrandIcon from '@/components/brand/BrandIcon'

export const metadata: Metadata = { title: 'Confirmación de cuenta', robots: { index: false } }

/**
 * Resultado de una confirmación de registro que no ha podido abrir sesión.
 * - confirmada: Supabase confirmó el correo, pero este aparato no pudo
 *   entrar (enlace antiguo abierto en otro aparato que el del registro).
 * - enlace: el enlace ya se usó o caducó; puede que la cuenta ya esté
 *   confirmada, o que haga falta uno nuevo.
 * Nunca es la pantalla de recuperación de contraseña.
 */
export default async function ConfirmadaPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams
  const confirmada = estado === 'confirmada'

  return (
    <div className="auth-page">
      <Link href="/" className="auth-logo">
        <BrandIcon />
        obras<span>de</span>teatro.com
      </Link>
      <div className="auth-card">
        {confirmada ? (
          <>
            <h1 className="auth-title">Tu cuenta está confirmada</h1>
            <p className="auth-tagline">
              Ya puedes entrar con tu correo y tu contraseña. Si tienes abierta la página del registro en otro aparato, entrará sola en unos segundos.
            </p>
            <Link href="/auth/login" className="ds-btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: '8px' }}>
              Iniciar sesión
            </Link>
          </>
        ) : (
          <>
            <h1 className="auth-title">Este enlace ya no es válido</h1>
            <p className="auth-tagline">
              El enlace de confirmación ya se ha usado o ha caducado. Si ya confirmaste tu cuenta, inicia sesión; si no, te enviamos uno nuevo.
            </p>
            <Link href="/auth/login" className="ds-btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: '8px' }}>
              Iniciar sesión
            </Link>
            <Link href="/auth/confirmar" className="ds-btn-secondary" style={{ display: 'block', textAlign: 'center', marginTop: '8px' }}>
              Enviarme un enlace nuevo
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
