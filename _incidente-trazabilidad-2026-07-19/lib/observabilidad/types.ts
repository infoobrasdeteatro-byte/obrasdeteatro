/**
 * Precondicion del contrato, no validada ni normalizada aqui: todas las
 * entradas agrupadas bajo el mismo `name` deben representar la misma
 * magnitud fisica (misma unidad). Esa responsabilidad corresponde al
 * productor de la metrica (Telemetria no valida `unit` al escribir) -- si
 * un mismo `name` mezclara unidades distintas, `minValue`/`maxValue`/
 * `averageValue` mezclarian magnitudes sin ningun aviso.
 */
export interface MetricGroup {
  readonly name: string
  readonly count: number
  readonly minValue: number
  readonly maxValue: number
  readonly averageValue: number
  readonly unit?: string
}

export interface TechnicalTrace {
  readonly profileId: string
  readonly groups: MetricGroup[]
  readonly totalEntries: number
  readonly generatedAt: string
}
