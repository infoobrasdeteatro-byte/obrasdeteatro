// Fuente única de las páginas legales publicadas. La usan el footer global
// (components/SiteFooter.tsx) y la navegación cruzada de components/LegalPage.jsx,
// así que una página nueva aparece en los dos sitios añadiéndola solo aquí.
//
// /legal/venta-entradas no está a propósito: el módulo de ticketing aún no
// existe y esa página se publicará cuando se construya.

export interface LegalLink {
  href: string
  label: string
}

export const LEGAL_LINKS: LegalLink[] = [
  { href: '/legal/aviso-legal', label: 'Aviso Legal' },
  { href: '/legal/privacidad', label: 'Política de Privacidad' },
  { href: '/legal/cookies', label: 'Política de Cookies' },
  { href: '/legal/terminos', label: 'Términos y Condiciones' },
  { href: '/legal/suscripciones', label: 'Condiciones de Suscripción' },
  { href: '/legal/reembolsos', label: 'Política de Reembolsos' },
  { href: '/legal/propiedad-intelectual', label: 'Propiedad Intelectual' },
  { href: '/legal/derechos-representacion', label: 'Derechos de Representación' },
  { href: '/legal/normas-comunidad', label: 'Normas de la Comunidad' },
  { href: '/legal/verificacion-perfiles', label: 'Verificación de Perfiles' },
  { href: '/legal/scenaia', label: 'Uso de ScenaIA' },
]
