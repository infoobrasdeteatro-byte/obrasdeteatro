/**
 * Piezas compartidas por el listado público y la ficha de un casting.
 *
 * OJO CON EL VOCABULARIO. «Convocatoria» ya NO es sinónimo de «casting»:
 * desde que existe el módulo de Convocatorias (app/convocatoria/, sobre la
 * tabla public.calls) son dos cosas distintas, con su propio ciclo de vida y
 * sus propias reglas de plan. Este fichero es solo de Castings.
 */

/**
 * Insignia fija, sin comprobación adicional. No es un adorno: solo las cuentas
 * de pago pueden llegar a publicar (política "Casting propio - creación" más
 * el cupo por plan), de modo que cualquier casting que se vea aquí
 * cumple la condición por construcción. Si algún día se abriera la publicación
 * a cuentas gratuitas, esta insignia dejaría de ser cierta y habría que
 * volverla condicional.
 */
export function InsigniaVerificado() {
  return (
    <span className="status-pill status-pill--published"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Organizador verificado
    </span>
  )
}

/** Rango de edad legible. Ausencia real de dato, no "0" ni "sin límite". */
export function rangoEdad(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null) return `${min} – ${max} años`
  if (min !== null) return `desde ${min} años`
  if (max !== null) return `hasta ${max} años`
  return null
}
