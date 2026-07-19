import type { ResponseType } from '@/lib/procesos-asincronos'

export interface TrajectoryEntry {
  readonly occurredAt: string
  readonly category: ResponseType
}

export interface TrajectorySummary {
  readonly totalEntries: number
  readonly firstActivityAt: string | null
  readonly lastActivityAt: string | null
  readonly countByCategory: Partial<Record<ResponseType, number>>
}

export interface ProfessionalTrajectory {
  readonly profileId: string
  readonly entries: TrajectoryEntry[]
  readonly summary: TrajectorySummary
  readonly generatedAt: string
}
