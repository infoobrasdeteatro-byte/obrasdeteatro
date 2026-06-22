import Link from 'next/link'

export default function NavAutenticado() {
  return (
    <nav className="bg-white border-b px-6 py-3 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">
          ObrasDeTeatro®
        </Link>
        <div className="flex items-center gap-1 flex-wrap">
          <Link href="/dashboard" className="text-sm px-3 py-1.5 text-gray-600 hover:text-black hover:bg-gray-50 rounded transition-colors">
            Dashboard
          </Link>
          <Link href="/directorio" className="text-sm px-3 py-1.5 text-gray-600 hover:text-black hover:bg-gray-50 rounded transition-colors">
            Directorio
          </Link>
          <Link href="/perfil" className="text-sm px-3 py-1.5 text-gray-600 hover:text-black hover:bg-gray-50 rounded transition-colors">
            Mi perfil
          </Link>
          <Link href="/mis-obras" className="text-sm px-3 py-1.5 text-gray-600 hover:text-black hover:bg-gray-50 rounded transition-colors">
            Mis obras
          </Link>
          <Link href="/precios" className="text-sm px-3 py-1.5 text-gray-600 hover:text-black hover:bg-gray-50 rounded transition-colors">
            Precios
          </Link>
          <form action="/auth/logout" method="POST" className="ml-2">
            <button
              type="submit"
              className="text-sm px-4 py-1.5 bg-black text-white rounded hover:bg-gray-800 transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </nav>
  )
}
