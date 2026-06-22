const ERROR_MAP: Array<[string, string]> = [
  ['User already registered', 'Ya existe una cuenta con este correo electrónico.'],
  ['Invalid login credentials', 'Correo o contraseña incorrectos.'],
  ['Email not confirmed', 'Confirma tu dirección de email antes de entrar.'],
  ['Password should be at least 6 characters', 'La contraseña debe tener al menos 6 caracteres.'],
  ['New password should be different', 'La nueva contraseña debe ser diferente a la actual.'],
  ['Token has expired or is invalid', 'El enlace ha expirado. Solicita uno nuevo.'],
  ['token has expired', 'El enlace ha expirado. Solicita uno nuevo.'],
  ['Token hash does not match', 'El enlace no es válido. Solicita uno nuevo.'],
  ['For security purposes, you can only request this after', 'Espera unos segundos antes de volver a intentarlo.'],
  ['Unable to validate email address: invalid format', 'Formato de email no válido.'],
  ['Email rate limit exceeded', 'Has enviado demasiados intentos. Espera unos minutos.'],
  ['User not found', 'No existe una cuenta con este correo electrónico.'],
  ['Password recovery requires an email', 'Introduce tu dirección de email.'],
  ['same password', 'La nueva contraseña debe ser diferente a la actual.'],
  ['Auth session missing', 'Sesión expirada. Vuelve a iniciar sesión.'],
  ['refresh_token_not_found', 'Sesión expirada. Vuelve a iniciar sesión.'],
  ['invalid_credentials', 'Correo o contraseña incorrectos.'],
]

export function translateAuthError(message: string): string {
  const lower = message.toLowerCase()
  for (const [key, value] of ERROR_MAP) {
    if (lower.includes(key.toLowerCase())) return value
  }
  return 'Ha ocurrido un error. Inténtalo de nuevo.'
}
