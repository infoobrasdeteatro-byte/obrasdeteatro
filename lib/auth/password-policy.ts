/**
 * AEC-003 DA-003: única fuente de verdad de la política de contraseñas.
 * No podrán coexistir dos políticas distintas en el dominio de autenticación
 * -- registro, cambio autenticado y recuperación importan de aquí.
 */
export const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
export const PASSWORD_HINT = 'Mínimo 8 caracteres, con una mayúscula, una minúscula y un número.'
