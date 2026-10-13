/** Constantes del boletín sin dependencias de servidor (se usan también en el navegador). */
export const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const
export type ConfigBoletin = { nombre: string; activo: boolean; acceso: 'todos' | 'pago' | string; dia_envio: number }
