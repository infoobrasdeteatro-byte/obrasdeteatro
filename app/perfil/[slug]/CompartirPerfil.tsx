'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { enlacesCompartir } from '@/components/cartelera/Compartir'

const SITIO = 'https://www.obrasdeteatro.com'

/** URL pública de una ficha. */
export function urlPerfil(slug: string): string {
  return `${SITIO}/perfil/${encodeURIComponent(slug)}`
}

/** Enlace de WhatsApp para compartir la ficha. */
export function enlaceWhatsappPerfil(nombre: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${nombre} en ObrasDeTeatro®\n${url}`)}`
}

/** Nombre del PNG del QR: qr-<slug>.png */
export function nombreArchivoQr(slug: string): string {
  return `qr-${slug.replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'perfil'}.png`
}

/**
 * «Compartir perfil»: panel con el código QR de la ficha (descargable en PNG
 * para dossieres y carteles), copiar enlace y las redes (WhatsApp, Facebook,
 * X, Telegram, LinkedIn y correo). Solo en el móvil se añade «Más opciones»
 * con el menú del sistema (en el ordenador ese menú es el de Windows/macOS).
 */
export default function CompartirPerfil({ slug, nombre }: { slug: string; nombre: string }) {
  const url = urlPerfil(slug)
  const [abierto, setAbierto] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [nativo, setNativo] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNativo(typeof navigator !== 'undefined' && 'share' in navigator && window.matchMedia('(pointer: coarse)').matches)
  }, [])

  useEffect(() => {
    if (!abierto || qr) return
    QRCode.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#0a0a0a', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(null))
  }, [abierto, qr, url])

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc) }
  }, [abierto])

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const i = document.createElement('input'); i.value = url; document.body.appendChild(i); i.select(); document.execCommand('copy'); i.remove()
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const masOpciones = async () => {
    try { await navigator.share({ title: `${nombre} en ObrasDeTeatro®`, url }) } catch { /* cancelado */ }
  }

  return (
    <div ref={caja} className="compartir">
      <button type="button" className="ds-btn-secondary" style={{ width: 'auto', padding: '10px 18px', fontSize: '13px' }}
        onClick={() => setAbierto(a => !a)} aria-expanded={abierto} aria-haspopup="dialog">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '6px', verticalAlign: '-2px' }}>
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
        </svg>
        Compartir perfil
      </button>

      {abierto && (
        <div className="compartir-panel" role="dialog" aria-label={`Compartir el perfil de ${nombre}`}>
          <div className="compartir-qr">
            {qr
              // eslint-disable-next-line @next/next/no-img-element -- data URL generada en el navegador
              ? <img src={qr} alt={`Código QR del perfil de ${nombre}`} width={180} height={180} />
              : <span className="compartir-qr-cargando">Generando QR…</span>}
          </div>
          {qr && (
            <a className="compartir-descargar" href={qr} download={nombreArchivoQr(slug)}>Descargar QR (PNG)</a>
          )}
          <div className="compartir-url">
            <input readOnly value={url} aria-label="Enlace del perfil" onFocus={e => e.currentTarget.select()} />
            <button type="button" onClick={copiar}>{copiado ? '✓ Copiado' : 'Copiar enlace'}</button>
          </div>
          <div className="compartir-redes">
            {enlacesCompartir(url, `${nombre} en ObrasDeTeatro®`).map(r => (
              <a key={r.red} href={r.red === 'WhatsApp' ? enlaceWhatsappPerfil(nombre, url) : r.href} target="_blank" rel="noopener noreferrer">{r.red}</a>
            ))}
          </div>
          {nativo && (
            <button type="button" className="compartir-mas" onClick={masOpciones}>Más opciones del teléfono</button>
          )}
          <p>Al escanear el QR se abre esta ficha: úsalo en dossieres, carteles o tarjetas.</p>
        </div>
      )}
    </div>
  )
}
