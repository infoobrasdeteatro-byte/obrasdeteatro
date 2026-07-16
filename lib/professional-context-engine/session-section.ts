import type { SessionSection } from './types'

export interface SessionInput {
  route: string | null
  module: string | null
  locale: string
}

/** Sin persistencia: refleja exclusivamente el estado de la peticion en curso, sin historico. */
export function buildSessionSection(input: SessionInput): SessionSection {
  return {
    route: input.route,
    module: input.module,
    locale: input.locale,
    timestamp: new Date().toISOString(),
  }
}
