'use client'

import { useCallback, useEffect, useState } from 'react'
import { estadoInstalacion, type EstadoInstalacion } from '@/lib/app/instalacion'

/** Evento no estándar de Chrome/Edge para instalar con un toque. */
interface AvisoInstalacion extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// El navegador lanza beforeinstallprompt una sola vez, poco después de cargar
// la página y a menudo antes de que se monte ningún componente. Se guarda aquí,
// al evaluarse el módulo, y los componentes se suscriben a los cambios.
//
// preventDefault() evita además que Chrome muestre su propio aviso emergente:
// la instalación solo se ofrece donde la web lo ha decidido (menú, tarjeta del
// panel y página /app), nunca como una interrupción a quien acaba de llegar.
let aviso: AvisoInstalacion | null = null
let instalada = false
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach(f => f())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    aviso = e as AvisoInstalacion
    avisar()
  })
  window.addEventListener('appinstalled', () => {
    aviso = null
    instalada = true
    avisar()
  })
}

function leerEstado(): EstadoInstalacion {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return estadoInstalacion({
    enPantallaCompleta:
      instalada || window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true,
    hayAvisoDelNavegador: aviso !== null,
    userAgent: nav.userAgent,
    plataforma: nav.platform,
    puntosTactiles: nav.maxTouchPoints,
  })
}

/**
 * Estado de la instalación en este navegador y la acción de instalar.
 * `estado` es null hasta que se monta en el cliente: el servidor no sabe nada
 * del dispositivo, así que no pinta nada que dependa de él.
 */
export function useInstalacion(): { estado: EstadoInstalacion | null; instalar: () => Promise<void> } {
  const [estado, setEstado] = useState<EstadoInstalacion | null>(null)

  useEffect(() => {
    const actualizar = () => setEstado(leerEstado())
    actualizar()
    oyentes.add(actualizar)
    return () => { oyentes.delete(actualizar) }
  }, [])

  const instalar = useCallback(async () => {
    if (!aviso) return
    const a = aviso
    await a.prompt()
    const { outcome } = await a.userChoice
    // El aviso solo sirve una vez, se acepte o no.
    aviso = null
    if (outcome === 'accepted') instalada = true
    avisar()
  }, [])

  return { estado, instalar }
}
