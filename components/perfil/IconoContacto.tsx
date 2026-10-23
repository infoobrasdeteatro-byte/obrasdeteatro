/**
 * Iconos de la zona «Contacto» de la ficha: web, correo, teléfono y WhatsApp.
 * Dibujos de línea propios (24×24, trazo currentColor), en una pastilla
 * redonda del mismo ancho que ocupaban las siglas para no mover el texto.
 * WhatsApp va en verde con un bocadillo y un auricular.
 */
export type TipoContacto = 'web' | 'email' | 'telefono' | 'whatsapp'

const ETIQUETA: Record<TipoContacto, string> = {
  web: 'Web',
  email: 'Correo',
  telefono: 'Teléfono',
  whatsapp: 'WhatsApp',
}

function Trazo({ tipo }: { tipo: TipoContacto }) {
  switch (tipo) {
    case 'web':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
        </>
      )
    case 'email':
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3.5 6.5 12 13l8.5-6.5" />
        </>
      )
    case 'telefono':
      return (
        <path d="M6.6 3.5h2.6l1.4 4.1-2 1.4a12 12 0 0 0 6.4 6.4l1.4-2 4.1 1.4v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z" />
      )
    case 'whatsapp':
      return (
        <>
          <path d="M20.5 12a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.2-4.2A8.5 8.5 0 1 1 20.5 12z" />
          <path d="M9.3 8.2h1.3l.7 1.9-.9.8a5.4 5.4 0 0 0 2.7 2.7l.8-.9 1.9.7v1.3a1 1 0 0 1-1.1 1 7 7 0 0 1-6.4-6.4 1 1 0 0 1 1-1.1z" />
        </>
      )
  }
}

export default function IconoContacto({ tipo }: { tipo: TipoContacto }) {
  const verde = tipo === 'whatsapp'
  return (
    <span
      title={ETIQUETA[tipo]}
      style={{
        width: '30px', height: '30px', flexShrink: 0, borderRadius: '50%',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: verde ? '#dcfce7' : 'var(--subtle)',
        color: verde ? '#15803d' : 'var(--black)',
        border: `1px solid ${verde ? '#bbf7d0' : 'var(--border)'}`,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <Trazo tipo={tipo} />
      </svg>
    </span>
  )
}
