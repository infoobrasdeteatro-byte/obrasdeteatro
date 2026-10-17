/**
 * Cinta con el logo de obrasdeteatro.com en movimiento antes de «En cartel»:
 * un solo logo que cruza la franja de derecha a izquierda y vuelve a entrar.
 * Solo marca: sin enlaces ni publicidad. CSS puro; se detiene al pasar el
 * ratón y, con «reducir movimiento», queda quieto en el centro.
 */
export default function CintaLogo() {
  return (
    <div className="cinta-logo">
      <div className="cinta-pista">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-obrasdeteatro-horizontal.svg" alt="obrasdeteatro.com" width={218} height={34} />
      </div>
    </div>
  )
}
