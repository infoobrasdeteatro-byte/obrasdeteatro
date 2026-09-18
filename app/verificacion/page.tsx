import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveScenaiaAccess } from '@/lib/auth/scenaia-access'

/**
 * UX-003 — QUE LE PASA A QUIEN NO HA VERIFICADO SU CORREO.
 *
 * P1.3 cerro correctamente el acceso a ScenaIA para quien no ha confirmado
 * su direccion, pero lo dejaba en `/dashboard` sin decirle nada: un bloqueo
 * correcto que se vivia como una averia. Esta pagina es la explicacion que
 * faltaba, y solo eso.
 *
 * NO CONCEDE NADA. La decision sigue siendo de `resolveScenaiaAccess`, y la
 * frontera de seguridad sigue siendo el endpoint. Esta pagina se limita a
 * consultar el mismo veredicto y contarlo en castellano.
 *
 * VIVE FUERA DE `/auth/` a proposito. El middleware devuelve a `/dashboard`
 * a todo usuario autenticado que entre en `/auth/*` -- con las excepciones
 * ya declaradas alli --, de modo que una ruta bajo `/auth/` rebotaria
 * precisamente al sitio del que queremos sacarlo. Fuera de `/auth/` no
 * dispara ninguna regla del middleware, y por eso no hace falta tocarlo.
 */
export default async function VerificacionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  /*
   * Mismo veredicto que la pagina de ScenaIA y que el endpoint. Esta pagina
   * no comprueba `verificado` por su cuenta: preguntar dos veces con dos
   * criterios distintos es como se abren los huecos que P1.3 cerro.
   */
  const acceso = await resolveScenaiaAccess(user?.id ?? null)

  if (acceso.allowed) {
    // Ya no le falta nada: aqui no tiene nada que hacer.
    redirect('/scenaia')
  }

  if (acceso.reason !== 'no_verificado') {
    // Sin sesion, al login. Cualquier otra causa no es "verifica tu correo"
    // y contarsela como si lo fuera seria mentirle.
    redirect(acceso.reason === 'no_autenticado' ? '/auth/login' : '/dashboard')
  }

  return (
    <div className="auth-page">
      <Link href="/" className="auth-logo">
        obras<span>de</span>teatro.com
      </Link>

      <div className="auth-card">
        <h1 className="auth-title">Verifica tu correo electrónico</h1>

        <p className="auth-tagline" style={{ textAlign: 'left' }}>
          Para acceder a ScenaIA necesitas verificar tu correo electrónico.
        </p>

        <p className="auth-tagline" style={{ textAlign: 'left' }}>
          Revisa el correo que utilizaste al registrarte y completa el proceso de verificación. Si no
          lo encuentras, revisa también la carpeta de spam o correo no deseado.
        </p>

        <p className="auth-tagline" style={{ textAlign: 'left' }}>
          Cuando hayas verificado tu correo, vuelve a intentarlo.
        </p>

        {/*
         * "Volver a intentar" es un enlace a la propia ScenaIA, no una
         * comprobacion propia: al entrar, el acceso se resuelve de nuevo con
         * el mecanismo real. Si el usuario confirmo en otra pestana o en otro
         * dispositivo, entrara; si no, volvera aqui. No hay una segunda
         * politica que pueda decir algo distinto.
         */}
        <Link href="/scenaia" className="ds-btn-primary" style={{ marginTop: '4px' }}>
          Volver a intentar
        </Link>

        <p className="auth-footer">
          <Link href="/dashboard">Ir a mi panel</Link>
        </p>
      </div>
    </div>
  )
}
