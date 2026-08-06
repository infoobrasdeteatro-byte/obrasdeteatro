interface CacheEntry {
  readonly value: unknown
  readonly expiresAt: number
}

const store = new Map<string, CacheEntry>()

/**
 * Infraestructura auxiliar, no dependencia funcional (Definicion Tecnica,
 * revision arquitectonica): ante ausencia, fallo o desactivacion de este
 * mecanismo, el comportamiento correcto es invocar `loader()` directamente
 * -- exactamente lo que hace esta misma funcion en caso de fallo de miss o
 * expiracion. Quien la use conserva integramente su contrato funcional con
 * o sin ella.
 *
 * Contrato minimo (revision arquitectonica): sin `invalidate()`. Ninguna
 * lectura ya inventariada la necesita hoy; si aparece un caso real,
 * anadirla sera una ampliacion aditiva, no una reapertura de este
 * contrato.
 *
 * RA-006 (revision arquitectonica posterior al cierre v1): almacenamiento
 * en `Map` de memoria del proceso, elegido durante la implementacion sin
 * someterlo a revision -- la Definicion Tecnica dejo la tecnologia de
 * almacenamiento explicitamente sin decidir. Consecuencias conocidas, hoy
 * latentes porque P-018 (integracion real) sigue sin resolver: alcance por
 * proceso (sin coherencia entre instancias si la aplicacion corre en mas
 * de una), sin limite de crecimiento (una clave expirada no se libera
 * hasta que se vuelve a pedir), y sin coalescencia de peticiones
 * concurrentes para la misma clave. Ninguna es defecto de este contrato;
 * las tres deben revisarse explicitamente, no heredarse en silencio, antes
 * de que P-018 conecte este mecanismo a cualquier lectura real.
 */
export async function getOrSet<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const cached = store.get(key)
  const now = Date.now()

  if (cached && cached.expiresAt > now) {
    return cached.value as T
  }

  const value = await loader()
  store.set(key, { value, expiresAt: now + ttlSeconds * 1000 })
  return value
}
