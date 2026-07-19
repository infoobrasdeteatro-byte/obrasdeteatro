import type { ExecutionAudit } from '@/lib/ai-gateway'

export type { ExecutionAudit }

export interface TechnicalMetricSummary {
  readonly name: string
  readonly count: number
  readonly min: number
  readonly max: number
  readonly average: number
}

export interface TechnicalTrace {
  readonly profileId: string
  readonly metrics: TechnicalMetricSummary[]
  readonly generatedAt: string
}
