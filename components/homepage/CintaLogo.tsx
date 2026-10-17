/**
 * Cinta con el logo de obrasdeteatro.com en movimiento, de derecha a
 * izquierda, antes de «En cartel». Solo marca: sin enlaces ni publicidad.
 *
 * CSS puro, como el carrusel de colaboradores: la fila va dos veces seguidas
 * y la pista se desplaza media longitud, así que el bucle no tiene salto. La
 * segunda copia es decorativa (aria-hidden). Se detiene al pasar el ratón y,
 * con «reducir movimiento», queda quieta.
 */
const REPETICIONES = 8

export default function CintaLogo() {
  const fila = (copia: boolean) => (
    <ul className="cinta-fila" aria-hidden={copia || undefined}>
      {Array.from({ length: REPETICIONES }, (_, i) => (
        <li key={i}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-obrasdeteatro-horizontal.svg" alt={!copia && i === 0 ? 'obrasdeteatro.com' : ''} width={193} height={30} />
        </li>
      ))}
    </ul>
  )
  return (
    <div className="cinta-logo">
      <div className="cinta-pista">
        {fila(false)}
        {fila(true)}
      </div>
    </div>
  )
}
