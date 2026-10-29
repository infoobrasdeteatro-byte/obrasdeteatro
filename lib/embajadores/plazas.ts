/**
 * Plazas de Embajadores ocupadas: invitaciones aceptadas y pendientes que no
 * han caducado. Una pendiente caducada libera su plaza.
 */
export function plazasOcupadas(invitaciones: { estado: string; caduca_at: string }[], ahora: number): number {
  return invitaciones.filter(i => i.estado === 'aceptada' || (i.estado === 'pendiente' && Date.parse(i.caduca_at) >= ahora)).length
}
