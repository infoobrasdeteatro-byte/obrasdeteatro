import Image from 'next/image'
import Link from 'next/link'
import { etiquetaTipo, imagenSegura, lugarCorto, rutaFicha, textoAforo, type EspacioTarjeta } from '@/lib/espacios/espacios'

/** Tarjeta del buscador: foto (si hay), tipo, municipio, aforo y sello si la ficha está verificada. */
export default function TarjetaEspacio({ espacio }: { espacio: EspacioTarjeta }) {
  const foto = imagenSegura(espacio.imagen_url)
  const aforo = textoAforo(espacio.aforo)
  return (
    <li>
      <Link href={rutaFicha(espacio.slug)} className="account-card esp-tarjeta">
        {foto && (
          <div className="esp-tarjeta-foto">
            <Image src={foto} alt="" fill sizes="(max-width: 640px) 100vw, 320px" />
          </div>
        )}
        <div className="esp-tarjeta-cuerpo">
          <span className="esp-tarjeta-tipo">{etiquetaTipo(espacio.tipo)}</span>
          <h3 className="esp-tarjeta-nombre">{espacio.nombre}</h3>
          <p className="esp-tarjeta-lugar">{lugarCorto(espacio)}</p>
          {(aforo || espacio.accesibilidad === 'si') && (
            <p className="esp-tarjeta-meta">
              {[aforo, espacio.accesibilidad === 'si' ? 'Accesible' : null].filter(Boolean).join(' · ')}
            </p>
          )}
          {espacio.verificado && <span className="esp-sello">Ficha verificada</span>}
        </div>
      </Link>
    </li>
  )
}
