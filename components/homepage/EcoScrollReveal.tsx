'use client'

import { useEffect } from 'react'

/**
 * Activa la revelación al hacer scroll (.eco-reveal -> .eco-is-visible) para
 * el bloque "El pulso del ecosistema". Único componente cliente de este
 * bloque -- el resto es estático y se renderiza en servidor.
 */
export default function EcoScrollReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll('.eco-reveal')

    if (!('IntersectionObserver' in window)) {
      targets.forEach(el => el.classList.add('eco-is-visible'))
      return
    }

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('eco-is-visible')
          io.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12 })

    targets.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  return null
}
