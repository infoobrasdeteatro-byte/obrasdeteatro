'use client'

import { useEffect } from 'react'
import { EVENTO_COOKIES, GA_ID, analiticaConsentida } from '@/lib/analitica'

type VentanaGA = Window & {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
  [clave: `ga-disable-${string}`]: boolean | undefined
}

let cargado = false

function consentida(): boolean {
  try {
    return analiticaConsentida(
      window.localStorage.getItem('cookiePreferences'),
      window.localStorage.getItem('cookieConsentDate'),
    )
  } catch {
    return false
  }
}

/**
 * Carga Google Analytics SOLO cuando hay consentimiento. Sin él no se pide
 * nada a Google ni se escribe ninguna cookie. Si el consentimiento se retira
 * después, se desactiva el envío y se le comunica a la etiqueta.
 *
 * La publicidad queda siempre denegada: la web no usa cookies publicitarias.
 * Las vistas de página al navegar las registra la «medición mejorada» de GA4.
 */
function aplicar() {
  const w = window as unknown as VentanaGA
  const ok = consentida()
  w[`ga-disable-${GA_ID}`] = !ok

  if (!ok) {
    if (cargado) w.gtag?.('consent', 'update', { analytics_storage: 'denied' })
    return
  }
  if (cargado) {
    w.gtag?.('consent', 'update', { analytics_storage: 'granted' })
    return
  }
  cargado = true
  w.dataLayer = w.dataLayer || []
  // gtag debe empujar el objeto `arguments`, no un array.
  // eslint-disable-next-line prefer-rest-params
  w.gtag = function gtag() { w.dataLayer!.push(arguments) }
  w.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
  w.gtag('js', new Date())
  w.gtag('config', GA_ID)

  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)
}

export default function Analitica() {
  useEffect(() => {
    aplicar()
    window.addEventListener(EVENTO_COOKIES, aplicar)
    return () => window.removeEventListener(EVENTO_COOKIES, aplicar)
  }, [])
  return null
}
