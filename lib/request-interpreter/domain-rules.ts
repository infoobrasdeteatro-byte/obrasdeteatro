import type { KnowledgeDomain } from '@/lib/knowledge-assets'

/**
 * Tabla estatica palabra-clave -> dominio, restringida exclusivamente a los
 * 8 dominios oficiales de CAT-001. `Inteligencia` no tiene palabras clave
 * propias en v1: es un dominio derivado internamente por el ecosistema, no
 * vocabulario que un usuario use directamente en su peticion -- ausencia
 * intencional, no un olvido. Las claves se comparan ya normalizadas (sin
 * diacriticos, ver normalize-text.ts), por lo que aqui solo aparecen formas
 * sin acento.
 */
const DOMAIN_KEYWORDS: Record<KnowledgeDomain, string[]> = {
  Personas: ['perfil', 'actor', 'actriz', 'director', 'directora', 'dramaturgo', 'dramaturga', 'profesional'],
  Obras: ['obra', 'guion', 'texto teatral', 'dramaturgia', 'repertorio'],
  Organizaciones: ['compania', 'teatro', 'festival', 'productora', 'escuela', 'institucion'],
  Oportunidades: ['casting', 'audicion', 'convocatoria', 'ayuda', 'subvencion'],
  Editorial: ['articulo', 'publicacion', 'editorial'],
  Relaciones: ['colabora', 'colaboracion', 'conexion', 'relacion'],
  Trayectoria: ['trayectoria', 'carrera', 'experiencia'],
  Inteligencia: [],
}

export function detectKnowledgeDomains(normalizedText: string): KnowledgeDomain[] {
  const domains: KnowledgeDomain[] = []

  for (const domain of Object.keys(DOMAIN_KEYWORDS) as KnowledgeDomain[]) {
    const keywords = DOMAIN_KEYWORDS[domain]
    if (keywords.some((keyword) => normalizedText.includes(keyword))) {
      domains.push(domain)
    }
  }

  return domains
}
