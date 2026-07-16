import type { KnowledgeCompleteness } from '@/lib/scenaia-knowledge-model'

/** Aplica el orden obligatorio ya congelado de SC-002: solo se solicita IA si el conocimiento recuperado no basta. */
export function needsAI(knowledgeCompleteness: KnowledgeCompleteness): boolean {
  return knowledgeCompleteness !== 'completo'
}
