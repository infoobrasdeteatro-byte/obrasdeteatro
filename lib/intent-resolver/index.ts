export {
  RESOLVABLE_TERMS,
  DOMAIN_TERMS,
  CONCEPT_TERMS,
  EPOCA_CONCEPT_TERMS,
  RESOLVER_INSTRUCTIONS,
  buildResolverPrompt,
  parseResolvedTerms,
  composeAugmentedRequest,
  mayNeedResolution,
  conceptTermsFor,
  resolvableTermsFor,
} from './vocabulary'
export type { OpcionesVocabulario } from './vocabulary'
export { resolveVocabulary } from './resolve-vocabulary'
export type { VocabularyExecutor } from './resolve-vocabulary'
