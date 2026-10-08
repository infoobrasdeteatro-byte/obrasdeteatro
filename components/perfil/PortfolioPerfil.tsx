import Image from 'next/image'

export type ProyectoPublico = {
  id: string
  titulo: string
  anio: number | null
  rol: string | null
  compania: string | null
  descripcion: string | null
  imagenUrl: string | null
  enlace: string | null
}

/** Portfolio de proyectos y espectáculos del perfil público. */
export default function PortfolioPerfil({ proyectos, nombre }: { proyectos: ProyectoPublico[]; nombre: string }) {
  if (proyectos.length === 0) return null

  return (
    <ul className="prof-portfolio">
      {proyectos.map(p => {
        const enlace = p.enlace && /^https:\/\/[^\s"'<>]+$/i.test(p.enlace) ? p.enlace : null
        return (
          <li key={p.id} className="prof-proyecto">
            {p.imagenUrl && (
              <div className="prof-proyecto-imagen">
                <Image src={p.imagenUrl} alt={`${p.titulo} — ${nombre}`} fill sizes="(max-width: 640px) 100vw, 260px" style={{ objectFit: 'cover' }} loading="lazy" />
              </div>
            )}
            <div className="prof-proyecto-texto">
              <h3 className="prof-proyecto-titulo">{p.titulo}</h3>
              <p className="prof-proyecto-meta">
                {[p.anio, p.rol, p.compania].filter(Boolean).join(' · ')}
              </p>
              {p.descripcion && <p className="prof-proyecto-desc">{p.descripcion}</p>}
              {enlace && (
                <a href={enlace} target="_blank" rel="noopener nofollow" className="table-link" style={{ fontSize: '13px' }}>
                  Más información ↗
                </a>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
