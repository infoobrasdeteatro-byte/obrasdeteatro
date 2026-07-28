import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const MODULE_FILES = [
  'works-knowledge.ts',
  'organizations-knowledge.ts',
  'structured-knowledge.ts',
  'semantic-retriever.ts',
  'interpret-work-query.ts',
]
const MODULE_SOURCE = MODULE_FILES.map((file) => readFileSync(join(__dirname, '..', file), 'utf-8')).join('\n')
const SEMANTIC_RETRIEVER_SOURCE = readFileSync(join(__dirname, '..', 'semantic-retriever.ts'), 'utf-8')
const INTERPRET_WORK_QUERY_SOURCE = readFileSync(join(__dirname, '..', 'interpret-work-query.ts'), 'utf-8')
const INDEX_SOURCE = readFileSync(join(__dirname, '..', 'index.ts'), 'utf-8')

function readComponentSource(componentDir: string): string {
  const base = join(__dirname, '..', '..', componentDir)
  const files = readdirSync(base).filter((f) => f.endsWith('.ts'))
  return files.map((f) => readFileSync(join(base, f), 'utf-8')).join('\n')
}

describe('Knowledge Assets — invariantes de integración (SC-005.2)', () => {
  it('nunca accede a Supabase directamente: toda persistencia pasa por Repository Layer', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
    expect(MODULE_SOURCE).toMatch(/from '@\/lib\/repository-layer'/)
  })

  it('es exclusivamente de lectura: no contiene ninguna operación de escritura', () => {
    expect(MODULE_SOURCE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/)
  })

  it('no importa ningún componente del Núcleo', () => {
    expect(MODULE_SOURCE).not.toMatch(
      /decision-engine|credit-manager|ai-gateway|response-composer|request-interpreter/i
    )
  })
})

describe('Knowledge Assets — semantic-retriever.ts (invariante de componente, IA-003, Plan Técnico aprobado 2026-07-22)', () => {
  it('no depende de ninguna tecnología de recuperación semántica concreta (independencia tecnológica)', () => {
    expect(SEMANTIC_RETRIEVER_SOURCE).not.toMatch(
      /pinecone|weaviate|qdrant|milvus|pgvector|openai|anthropic|embedding[s]?-api|neo4j/i
    )
  })

  it('la interfaz SemanticRetriever nunca se exporta fuera del módulo: solo retrieveRelevantKnowledge es pública', () => {
    expect(INDEX_SOURCE).not.toMatch(/SemanticRetriever/)
    expect(INDEX_SOURCE).toMatch(/retrieveRelevantKnowledge/)
  })

  it('ningún componente del Núcleo ni Servicio de Plataforma importa semantic-retriever.ts directamente', () => {
    for (const componentDir of [
      'request-interpreter',
      'professional-context-engine',
      'scenaia-knowledge-model',
      'decision-engine',
      'credit-manager',
      'ai-gateway',
      'response-composer',
    ]) {
      expect(readComponentSource(componentDir)).not.toMatch(/semantic-retriever/)
    }
  })
})

describe('Knowledge Assets — interpret-work-query.ts (invariante de componente, SCENAIA-002C, ADR SCENAIA-002C.1)', () => {
  it('es puro y síncrono: sin async/await, sin I/O', () => {
    expect(INTERPRET_WORK_QUERY_SOURCE).not.toMatch(/\basync\b|\bawait\b/)
  })

  it('nunca accede a Supabase; su única referencia a Repository Layer es el tipo WorkSearchCriteria, en una importación de solo tipo', () => {
    expect(INTERPRET_WORK_QUERY_SOURCE).not.toMatch(/supabase|createClient/i)
    expect(INTERPRET_WORK_QUERY_SOURCE).toMatch(/import type \{ WorkSearchCriteria \} from '@\/lib\/repository-layer'/)
  })

  it('no depende de ninguna tecnología de IA/embeddings (interpretación por reglas, no semántica real)', () => {
    expect(INTERPRET_WORK_QUERY_SOURCE).not.toMatch(
      /pinecone|weaviate|qdrant|milvus|pgvector|openai|anthropic|embedding[s]?-api|neo4j/i
    )
  })

  it('no importa ningún componente del Núcleo', () => {
    expect(INTERPRET_WORK_QUERY_SOURCE).not.toMatch(
      /decision-engine|credit-manager|ai-gateway|response-composer|request-interpreter/i
    )
  })
})
