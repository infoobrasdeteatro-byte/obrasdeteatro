export interface MetricInput {
  readonly name: string
  readonly value: number
  readonly unit?: string
  readonly tags?: Record<string, string>
}

export interface MetricEntry extends MetricInput {
  readonly id: string
  readonly profileId: string
  readonly recordedAt: string
}

export interface MetricFilter {
  readonly name?: string
  readonly limit?: number
}
