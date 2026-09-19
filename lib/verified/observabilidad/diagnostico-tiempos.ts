/**
 * TEMPORAL -- diagnóstico de latencia de ScenaIA (rama diag/scenaia-tiempos).
 * No fusionar a main: sirve para medir dónde se va el tiempo de un turno y se
 * retira en cuanto termine el diagnóstico.
 *
 * Mide cada etapa con `medir()` sin alterar su resultado ni sus errores, y al
 * final escribe UNA línea de log por turno:
 *
 *   [scenaia-tiempos] {"origen":"orquestador","totalMs":6825,"etapas":{...}}
 *
 * Si una etapa se repite (p. ej. reconstruir el conocimiento), sus tiempos se
 * suman y se cuenta cuántas veces ocurrió.
 */
export interface Cronometro {
  medir<T>(etapa: string, operacion: () => Promise<T>): Promise<T>
  volcar(extra?: Record<string, unknown>): void
}

export function crearCronometro(origen: string): Cronometro {
  const inicio = performance.now()
  const etapas: Record<string, { ms: number; veces: number }> = {}
  let volcado = false

  return {
    async medir<T>(etapa: string, operacion: () => Promise<T>): Promise<T> {
      const t = performance.now()
      try {
        return await operacion()
      } finally {
        const previa = etapas[etapa] ?? { ms: 0, veces: 0 }
        etapas[etapa] = { ms: previa.ms + Math.round(performance.now() - t), veces: previa.veces + 1 }
      }
    },
    volcar(extra: Record<string, unknown> = {}): void {
      if (volcado) return
      volcado = true
      try {
        console.log(
          `[scenaia-tiempos] ${JSON.stringify({ origen, ...extra, totalMs: Math.round(performance.now() - inicio), etapas })}`
        )
      } catch {
        // Medir nunca puede impedir responder.
      }
    },
  }
}
