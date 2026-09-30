/**
 * ID-001: isotipo oficial de ObrasDeTeatro (dos cortinas; el rombo central es
 * el hueco entre ambas, no una forma propia). Vector extraído del archivo
 * fuente de marca -- el mismo que `public/icono-obrasdeteatro.svg` --, sin
 * texto del logotipo.
 *
 * Dentro de ScenaIA el color es `currentColor`, para heredar `var(--red)` del
 * contenedor igual que el resto de la interfaz (el asset de `public/` lleva el
 * rojo de marca fijo). El viewBox incluye margen para que el isotipo ocupe en
 * su caja la misma proporción que el anterior. Decorativo: siempre va junto
 * al nombre de ScenaIA.
 */
export default function ObrasIsotype({ className }: { className?: string }) {
  return (
    <svg viewBox="-55.71 -50.63 300 300" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M 16.707031 9.96875 L 84.511719 9.96875 C 88.113281 9.96875 91.058594 12.914062 91.058594 16.511719 C 91.058594 59.644531 88.777344 88.890625 43.410156 109.714844 C 71.328125 124.636719 80.332031 145.417969 80.199219 179.042969 C 80.175781 184.414062 75.796875 188.777344 70.425781 188.777344 L 16.707031 188.777344 C 13.105469 188.777344 10.160156 185.832031 10.160156 182.230469 L 10.160156 16.511719 C 10.160156 12.914062 13.105469 9.96875 16.707031 9.96875 "
      />
      <path
        fillRule="evenodd"
        d="M 171.878906 9.96875 L 104.074219 9.96875 C 100.472656 9.96875 97.527344 12.914062 97.527344 16.511719 C 97.527344 59.644531 99.808594 88.890625 145.175781 109.714844 C 117.257812 124.636719 108.253906 145.417969 108.386719 179.042969 C 108.410156 184.414062 112.789062 188.777344 118.160156 188.777344 L 171.878906 188.777344 C 175.480469 188.777344 178.425781 185.832031 178.425781 182.230469 L 178.425781 16.511719 C 178.425781 12.914062 175.480469 9.96875 171.878906 9.96875 "
      />
    </svg>
  )
}
