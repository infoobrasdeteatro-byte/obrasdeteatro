/**
 * Orden editorial del directorio. Primero, los Embajadores de Escena activos
 * (con su distintivo); después, el orden de siempre: plan prioritario
 * (Destacado o Empresas), sello «✓ Verificado» y nombre.
 */
export type PerfilOrdenable = { id: string; nombre: string | null; plan: string | null; verificado_profesional: boolean | null }

export function ordenarDirectorio<T extends PerfilOrdenable>(perfiles: T[], embajadores: ReadonlySet<string>): T[] {
  return [...perfiles].sort((a, b) => {
    const eA = embajadores.has(a.id) ? 0 : 1
    const eB = embajadores.has(b.id) ? 0 : 1
    if (eA !== eB) return eA - eB
    const tA = (a.plan === 'destacado' || a.plan === 'empresas') ? 0 : 1
    const tB = (b.plan === 'destacado' || b.plan === 'empresas') ? 0 : 1
    if (tA !== tB) return tA - tB
    const vA = a.verificado_profesional ? 0 : 1
    const vB = b.verificado_profesional ? 0 : 1
    if (vA !== vB) return vA - vB
    return (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' })
  })
}
