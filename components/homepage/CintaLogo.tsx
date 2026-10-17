/**
 * Cinta negra, como una marquesina de teatro, con el logo de obrasdeteatro.com
 * (versión con letras blancas) antes de «En cartel»: un solo logo grande que
 * cruza de derecha a izquierda y vuelve a entrar.
 * Solo marca: sin enlaces ni publicidad. CSS puro; se detiene al pasar el
 * ratón y, con «reducir movimiento», queda quieto en el centro.
 */
export default function CintaLogo() {
  return (
    <div className="cinta-logo">
      <div className="cinta-pista">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-obrasdeteatro-horizontal-blanco.svg" alt="obrasdeteatro.com" width={590} height={92} />
      </div>
    </div>
  )
}
