/**
 * v1 deliberadamente minimo: la Direccion pidio no congelar el algoritmo de
 * interpretacion agregada (totales, promedios, desglose por proveedor...)
 * dentro del Plan Tecnico -- ese diseno queda para una iteracion posterior.
 * `totalExecutions` es el unico hecho descriptivo que no presupone ninguna
 * decision de algoritmo todavia por tomar.
 */
export interface BusinessAnalyticsReport {
  readonly totalExecutions: number
  readonly generatedAt: string
}
