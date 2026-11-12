'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import BrandIcon from '@/components/brand/BrandIcon'
import { CLAVE_TARJETA_OCULTA, RUTA_APP } from '@/lib/app/instalacion'
import { useInstalacion } from './useInstalacion'

/**
 * Entrada «Instalar la aplicación» del menú móvil. Lleva a /app, donde están
 * el botón y las instrucciones. Desaparece cuando ya se usa como aplicación.
 */
export function EnlaceInstalarMenu({ onNavegar }: { onNavegar?: () => void }) {
  const { estado } = useInstalacion()
  if (estado === 'instalada' || estado === 'recien-instalada') return null
  return (
    <>
      <hr className="nav-mobile-divider" />
      <span className="nav-mobile-section-label">Aplicación</span>
      <Link href={RUTA_APP} className="nav-mobile-link" onClick={onNavegar}>
        Instalar la aplicación
      </Link>
    </>
  )
}

/**
 * Botón principal de /app. Con un navegador que lo permite, instala con un
 * toque; en el resto, señala las instrucciones de la propia página.
 */
export function BotonInstalar() {
  const { estado, instalar } = useInstalacion()

  if (estado === null) {
    // Reserva el alto del botón mientras se comprueba el dispositivo.
    return <div className="inst-accion" aria-hidden="true" style={{ visibility: 'hidden' }}><span className="ds-btn-primary inst-boton">Instalar</span></div>
  }
  if (estado === 'instalada') {
    return (
      <div className="inst-accion">
        <p className="inst-hecho" role="status">Ya estás usando la aplicación en este dispositivo.</p>
      </div>
    )
  }
  if (estado === 'recien-instalada') {
    return (
      <div className="inst-accion">
        <p className="inst-hecho" role="status">
          Aplicación instalada. En unos segundos tendrás el icono de ObrasDeTeatro® entre tus aplicaciones: ábrela desde ahí.
        </p>
      </div>
    )
  }
  if (estado === 'disponible') {
    return (
      <div className="inst-accion">
        <button type="button" className="ds-btn-primary inst-boton" onClick={() => { void instalar() }}>
          Instalar la aplicación
        </button>
        <p className="inst-nota">Gratuita. Se instala en unos segundos, sin pasar por ninguna tienda.</p>
      </div>
    )
  }
  return (
    <div className="inst-accion">
      <a href={estado === 'ios' ? '#iphone' : '#android'} className="ds-btn-primary inst-boton">
        Ver cómo instalarla
      </a>
      <p className="inst-nota">
        {estado === 'ios'
          ? 'En iPhone y iPad se instala desde Safari, en dos pasos.'
          : 'Se instala desde el menú del navegador, en dos pasos.'}
      </p>
    </div>
  )
}

/**
 * Tarjeta del panel del usuario. Se puede cerrar (se recuerda en este
 * navegador) y no aparece si ya se usa como aplicación.
 */
export function TarjetaInstalar() {
  const { estado, instalar } = useInstalacion()
  const [oculta, setOculta] = useState(true)

  useEffect(() => {
    try {
      setOculta(window.localStorage.getItem(CLAVE_TARJETA_OCULTA) === '1')
    } catch {
      setOculta(false)
    }
  }, [])

  if (estado === null || estado === 'instalada' || oculta) return null

  const cerrar = () => {
    setOculta(true)
    try { window.localStorage.setItem(CLAVE_TARJETA_OCULTA, '1') } catch { /* sin almacenamiento: se oculta solo esta vez */ }
  }

  if (estado === 'recien-instalada') {
    return (
      <aside className="account-card inst-tarjeta" aria-label="Aplicación instalada">
        <span className="inst-tarjeta-icono" aria-hidden="true"><BrandIcon /></span>
        <div className="inst-tarjeta-texto" role="status">
          <h3 className="inst-tarjeta-titulo">Aplicación instalada</h3>
          <p className="inst-tarjeta-desc">En unos segundos tendrás el icono de ObrasDeTeatro® entre tus aplicaciones: ábrela desde ahí.</p>
        </div>
      </aside>
    )
  }

  return (
    <aside className="account-card inst-tarjeta" aria-label="Instalar la aplicación">
      <span className="inst-tarjeta-icono" aria-hidden="true"><BrandIcon /></span>
      <div className="inst-tarjeta-texto">
        <h3 className="inst-tarjeta-titulo">Lleva ObrasDeTeatro® en tu móvil</h3>
        <p className="inst-tarjeta-desc">Instala la aplicación y entra con un toque, a pantalla completa. Es gratuita.</p>
      </div>
      <div className="inst-tarjeta-acciones">
        {estado === 'disponible' ? (
          <button type="button" className="ds-btn-primary inst-tarjeta-boton" onClick={() => { void instalar() }}>
            Instalar
          </button>
        ) : (
          <Link href={RUTA_APP} className="ds-btn-primary inst-tarjeta-boton">
            Cómo instalarla
          </Link>
        )}
        <button type="button" className="inst-tarjeta-cerrar" onClick={cerrar} aria-label="Ocultar este aviso">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </aside>
  )
}
