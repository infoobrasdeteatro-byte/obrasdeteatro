// components/LegalPage.jsx
// Componente base reutilizable para todas las páginas legales

export default function LegalPage({ title, lastUpdate, sections }) {
  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* Cabecera */}
      <div className="bg-gray-950 text-white">
        <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-red-400 text-xs font-semibold uppercase tracking-widest mb-3">
            ObrasDeTeatro®
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-3">
            {title}
          </h1>
          <p className="text-gray-400 text-sm">
            Última actualización: <span className="text-gray-300">{lastUpdate}</span>
          </p>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-10">
          {sections.map((section, i) => (
            <section key={i} id={`seccion-${i + 1}`}>
              <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">
                {section.title}
              </h2>
              <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                {section.content.map((block, j) => {
                  if (block.type === "text") {
                    return <p key={j}>{block.text}</p>;
                  }
                  if (block.type === "list") {
                    return (
                      <ul key={j} className="space-y-1 pl-4">
                        {block.items.map((item, k) => (
                          <li key={k} className="flex items-start gap-2">
                            <span className="text-red-600 mt-1 flex-shrink-0">—</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  if (block.type === "highlight") {
                    return (
                      <div key={j} className="bg-red-50 border-l-4 border-red-600 pl-4 py-3 rounded-r-lg">
                        <p className="text-gray-800 font-medium">{block.text}</p>
                      </div>
                    );
                  }
                  if (block.type === "contact") {
                    return (
                      <div key={j} className="bg-gray-50 rounded-xl p-4 space-y-1">
                        {block.items.map((item, k) => (
                          <p key={k} className="text-sm">
                            <span className="text-gray-500">{item.label}:</span>{" "}
                            {item.href ? (
                              <a href={item.href} className="text-red-700 hover:underline font-medium">
                                {item.value}
                              </a>
                            ) : (
                              <span className="font-medium text-gray-800">{item.value}</span>
                            )}
                          </p>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Navegación a otras políticas */}
        <div className="mt-16 pt-8 border-t border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-4">
            También puede interesarte
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/legal/aviso-legal", label: "Aviso Legal" },
              { href: "/legal/privacidad", label: "Política de Privacidad" },
              { href: "/legal/cookies", label: "Política de Cookies" },
              { href: "/legal/terminos", label: "Términos y Condiciones" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
