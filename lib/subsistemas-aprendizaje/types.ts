/**
 * Contrato minimo abstracto (R-02, Decision de Direccion y Plan Tecnico
 * aprobados 2026-07-23). `executed` sera siempre `false` en esta version --
 * ningun documento autoriza todavia una fuente de datos, un mecanismo de
 * aprendizaje ni una forma de entrega concretos.
 */
export interface LearningCycleResult {
  readonly executed: boolean
  readonly reason: string
}
