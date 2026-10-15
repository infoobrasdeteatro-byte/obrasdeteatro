'use client'

import { useEffect, useRef, useState } from 'react'

const SITIO = 'https://www.obrasdeteatro.com'

/** Texto que acompaña al enlace al compartir. */
export function textoCompartir(titulo: string, cuando?: string | null, donde?: string | null): string {
  return [titulo, [cuando, donde].filter(Boolean).join(' · ')].filter(Boolean).join('\n')
}

/** Enlaces de cada red (se abren en una pestaña nueva). */
export function enlacesCompartir(url: string, texto: string) {
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(texto)
  return [
    { red: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}` },
    { red: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { red: 'X', href: `https://x.com/intent/post?text=${t}&url=${u}` },
    { red: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
    { red: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { red: 'Correo', href: `mailto:?subject=${encodeURIComponent(texto.split('\n')[0])}&body=${encodeURIComponent(`${texto}\n\n${url}`)}` },
  ]
}

/**
 * Botón «Compartir»: en el móvil abre el menú del sistema (WhatsApp,
 * Instagram…); en el ordenador, un panel con las redes y «Copiar enlace».
 */
export default function Compartir({ slug, titulo, cuando, donde, variante = 'secundario' }: {
  slug: string; titulo: string; cuando?: string | null; donde?: string | null; variante?: 'primario' | 'secundario' | 'enlace'
}) {
  const url = `${SITIO}/cartelera/${slug}`
  const texto = textoCompartir(titulo, cuando, donde)
  const [abierto, setAbierto] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc) }
  }, [abierto])

  const pulsar = async () => {
    const movil = typeof navigator !== 'undefined' && 'share' in navigator && window.matchMedia('(pointer: coarse)').matches
    if (movil) {
      try { await navigator.share({ title: titulo, text: texto, url }); return } catch { /* cancelado: se abre el panel */ }
    }
    setAbierto(a => !a)
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const i = document.createElement('input'); i.value = url; document.body.appendChild(i); i.select(); document.execCommand('copy'); i.remove()
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const clase = variante === 'primario' ? 'ds-btn-primary' : variante === 'enlace' ? 'table-link' : 'ds-btn-secondary'
  const estilo = variante === 'enlace' ? undefined : { width: 'auto', padding: '9px 16px', fontSize: '13px' }

  return (
    <div ref={caja} className="compartir">
      <button type="button" className={clase} style={estilo} onClick={pulsar} aria-expanded={abierto} aria-haspopup="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '6px', verticalAlign: '-2px' }}>
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
        </svg>
        Compartir
      </button>
      {abierto && (
        <div className="compartir-panel" role="menu">
          <div className="compartir-url">
            <input readOnly value={url} aria-label="Enlace del espectáculo" onFocus={e => e.currentTarget.select()} />
            <button type="button" onClick={copiar}>{copiado ? '✓ Copiado' : 'Copiar enlace'}</button>
          </div>
          <div className="compartir-redes">
            {enlacesCompartir(url, texto).map(r => (
              <a key={r.red} href={r.href} target="_blank" rel="noopener noreferrer" role="menuitem" onClick={() => setAbierto(false)}>{r.red}</a>
            ))}
          </div>
          <p>Para Instagram: copia el enlace y pégalo en tu historia o en tu biografía.</p>
        </div>
      )}
    </div>
  )
}
