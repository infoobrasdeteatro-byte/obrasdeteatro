'use client'

import { createContext, useContext, useEffect, useRef } from 'react'

/**
 * En la página de edición, cada sección (funciones, entradas, ficha) puede
 * tener algo escrito sin haber pulsado su botón de añadir. Antes de enviar a
 * publicar, el panel de estado guarda esos pendientes en vez de perderlos.
 *
 * Cada guardado devuelve: 'nada' (no había nada escrito), 'ok' o 'error'
 * (la propia sección ya enseña el error junto a sus campos).
 */
export type ResultadoPendiente = 'nada' | 'ok' | 'error'
type Guardado = () => Promise<ResultadoPendiente>

const Contexto = createContext<{ registro: Map<string, Guardado> } | null>(null)

export function PendientesProvider({ children }: { children: React.ReactNode }) {
  const registro = useRef(new Map<string, Guardado>())
  return <Contexto.Provider value={{ registro: registro.current }}>{children}</Contexto.Provider>
}

/** Una sección registra cómo guardar lo que tenga escrito. */
export function useRegistrarPendiente(nombre: string, guardar: Guardado) {
  const ctx = useContext(Contexto)
  const ref = useRef(guardar)
  ref.current = guardar
  useEffect(() => {
    if (!ctx) return
    ctx.registro.set(nombre, () => ref.current())
    return () => { ctx.registro.delete(nombre) }
  }, [ctx, nombre])
}

/** Guarda todos los pendientes; devuelve cuántos se guardaron y si alguno falló. */
export function useGuardarPendientes() {
  const ctx = useContext(Contexto)
  return async (): Promise<{ guardados: string[]; fallidos: string[] }> => {
    const guardados: string[] = []
    const fallidos: string[] = []
    for (const [nombre, guardar] of ctx?.registro ?? []) {
      const r = await guardar()
      if (r === 'ok') guardados.push(nombre)
      if (r === 'error') fallidos.push(nombre)
    }
    return { guardados, fallidos }
  }
}
