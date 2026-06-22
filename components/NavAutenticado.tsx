import Link from 'next/link'

export default function NavAutenticado() {
  return (
    <nav className="top-nav nav--solid">
      <Link href="/" className="nav-logo">
        obras<span>de</span>teatro.com
      </Link>
      <div className="nav-divider" />
      <div className="nav-links">
        <Link href="/dashboard"  className="nav-link">Dashboard</Link>
        <Link href="/directorio" className="nav-link">Directorio</Link>
        <Link href="/perfil"     className="nav-link">Mi perfil</Link>
        <Link href="/mis-obras"  className="nav-link">Mis obras</Link>
        <Link href="/precios"    className="nav-link">Planes</Link>
      </div>
      <div className="nav-right">
        <form action="/auth/logout" method="POST">
          <button type="submit" className="nav-btn-logout">
            Cerrar sesión
          </button>
        </form>
      </div>
    </nav>
  )
}
