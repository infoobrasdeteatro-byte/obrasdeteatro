/**
 * Verificación profesional (sello «✓ Verificado»). Las reglas que deciden de
 * verdad viven en la base (requisitos_verificacion, solicitar_verificacion,
 * resolver_verificacion: migración 20261023140000); aquí, lo que necesita la
 * interfaz y la comprobación automática del enlace.
 */

export const TIPOS_ENLACE = [
  { value: 'web', label: 'Web propia', hosts: [] as string[] },
  { value: 'instagram', label: 'Instagram', hosts: ['instagram.com'] },
  { value: 'facebook', label: 'Facebook', hosts: ['facebook.com', 'fb.com'] },
  { value: 'linkedin', label: 'LinkedIn', hosts: ['linkedin.com'] },
  { value: 'x', label: 'X (Twitter)', hosts: ['x.com', 'twitter.com'] },
  { value: 'tiktok', label: 'TikTok', hosts: ['tiktok.com'] },
  { value: 'youtube', label: 'YouTube', hosts: ['youtube.com'] },
  { value: 'otra', label: 'Otra red profesional', hosts: [] as string[] },
] as const

export type TipoEnlace = (typeof TIPOS_ENLACE)[number]['value']

export const REQUISITOS = [
  { clave: 'plan', texto: 'Plan de pago activo (Premium, Destacado o Empresas)', href: '/precios' },
  { clave: 'foto', texto: 'Foto de perfil (o logo, si es una organización)', href: '/perfil/bloque/1' },
  { clave: 'biografia', texto: 'Biografía de al menos 30 caracteres', href: '/perfil/bloque/1' },
  { clave: 'ciudad', texto: 'Ciudad', href: '/perfil/bloque/1' },
  { clave: 'profesiones', texto: 'Al menos una profesión', href: '/perfil/bloque/3' },
] as const

export type Requisitos = Partial<Record<(typeof REQUISITOS)[number]['clave'], boolean>>

export function cumpleRequisitos(r: Requisitos | null | undefined): boolean {
  return !!r && REQUISITOS.every(q => r[q.clave] === true)
}

function hostDe(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '')
}

/** Valida el enlace: https, dominio público y, en redes, el dominio de esa red. */
export function validarEnlace(tipo: string, enlace: string): { ok: true; url: string } | { ok: false; error: string } {
  const def = TIPOS_ENLACE.find(t => t.value === tipo)
  if (!def) return { ok: false, error: 'Elige dónde has puesto el código.' }
  let url: URL
  try { url = new URL(enlace.trim()) } catch { return { ok: false, error: 'El enlace no es una dirección válida.' } }
  if (url.protocol !== 'https:') return { ok: false, error: 'El enlace tiene que empezar por https://' }
  const host = hostDe(url)
  if (!host.includes('.') || /^[\d.]+$/.test(host) || host === 'localhost' || host.endsWith('.local')) {
    return { ok: false, error: 'El enlace tiene que ser de una web pública.' }
  }
  if (host === 'obrasdeteatro.com' || host.endsWith('.obrasdeteatro.com')) {
    return { ok: false, error: 'El enlace tiene que ser de tu web o tu red, no de ObrasDeTeatro.' }
  }
  if (def.hosts.length > 0 && !def.hosts.some(h => host === h || host.endsWith('.' + h))) {
    return { ok: false, error: `El enlace no es de ${def.label}.` }
  }
  if (url.href.length > 500) return { ok: false, error: 'El enlace es demasiado largo.' }
  return { ok: true, url: url.href }
}

/** ¿Aparece el código en el contenido? Ignora mayúsculas y espacios internos. */
export function contieneCodigo(contenido: string, codigo: string): boolean {
  const normal = (t: string) => t.toUpperCase().replace(/\s+/g, '')
  return normal(contenido).includes(normal(codigo))
}
