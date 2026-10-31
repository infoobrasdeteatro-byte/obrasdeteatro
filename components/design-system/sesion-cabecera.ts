// Estado de sesión que ve la cabecera pública (TopNav).
// Se resuelve en el cliente para no romper el renderizado estático ni el
// revalidate de las páginas públicas: el servidor siempre pinta 'comprobando'.
export type EstadoSesion = 'comprobando' | 'con-sesion' | 'sin-sesion'

// Lo mínimo que necesitamos del cliente de Supabase del navegador.
export interface ClienteAuth {
  auth: {
    getSession: () => Promise<{ data: { session: unknown | null } }>
    onAuthStateChange: (
      callback: (evento: string, session: unknown | null) => void
    ) => { data: { subscription: { unsubscribe: () => void } } }
  }
}

/**
 * Comprueba la sesión al montar y se suscribe a sus cambios.
 * Devuelve la función de limpieza para el desmontaje.
 * Si la comprobación falla, se trata como «sin sesión».
 */
export function vigilarSesion(
  cliente: ClienteAuth,
  onCambio: (estado: EstadoSesion) => void
): () => void {
  let activo = true
  const emitir = (session: unknown | null) => {
    if (activo) onCambio(session ? 'con-sesion' : 'sin-sesion')
  }

  const { data } = cliente.auth.onAuthStateChange((_evento, session) => emitir(session))

  cliente.auth
    .getSession()
    .then(({ data: d }) => emitir(d.session))
    .catch(() => emitir(null))

  return () => {
    activo = false
    data.subscription.unsubscribe()
  }
}
