import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeNextPath, withNext } from '@/lib/auth/next-param'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    // Perfiles: la ficha /perfil/<slug> es PÚBLICA -- la ven visitantes sin
    // cuenta, Google y las vistas previas de redes. Un startsWith('/perfil')
    // la arrastraba detrás del muro junto con las privadas. Se enumeran las
    // privadas una a una, como ya se hace más abajo con /castings.
    pathname === '/perfil' ||
    pathname.startsWith('/perfil/centro') ||
    pathname.startsWith('/perfil/bloque') ||
    pathname.startsWith('/mis-obras') ||
    pathname.startsWith('/cuenta') ||
    pathname.startsWith('/obras/nueva') ||
    (pathname.startsWith('/obras/') && pathname.endsWith('/editar')) ||
    // Castings: el listado y la ficha son públicos, pero crear, editar y
    // gestionar no. Se enumeran las rutas privadas una a una justamente para
    // no arrastrar /castings entero detrás del muro.
    pathname.startsWith('/mis-castings') ||
    pathname.startsWith('/mis-postulaciones') ||
    pathname.startsWith('/castings/nuevo') ||
    (pathname.startsWith('/castings/') && pathname.endsWith('/editar')) ||
    pathname.startsWith('/admin')

  const isAuthRoute =
    pathname.startsWith('/auth') &&
    !pathname.startsWith('/auth/logout') &&
    !pathname.startsWith('/auth/callback') &&
    !pathname.startsWith('/auth/update-password')

  // Sin sesión en una ruta privada: al login, conservando a dónde iba para
  // volver tras iniciar sesión (solo rutas internas: lib/auth/next-param.ts).
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL(withNext('/auth/login', pathname + request.nextUrl.search), request.url))
  }

  // Con sesión en /auth: a `next` si es una ruta interna válida, como hace el
  // formulario de login; si no, al panel. Un `next` que vuelva a /auth solo
  // daría otro salto por aquí, así que también va al panel.
  if (isAuthRoute && user) {
    const next = safeNextPath(request.nextUrl.searchParams.get('next'))
    const destino = next !== null && !next.startsWith('/auth') ? next : '/dashboard'
    return NextResponse.redirect(new URL(destino, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
