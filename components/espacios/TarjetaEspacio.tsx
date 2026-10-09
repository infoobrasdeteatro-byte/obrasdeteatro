import Link from 'next/link'
import { etiquetaTipo, lugarCorto, rutaFicha, type EspacioTarjeta } from '@/lib/espacios/espacios'

/** Tarjeta del buscador: nombre, tipo, municipio e isla (o región). */
export default function TarjetaEspacio({ espacio }: { espacio: EspacioTarjeta }) {
  return (
    <li>
      <Link href={rutaFicha(espacio.slug)} className="account-card esp-tarjeta">
        <span className="esp-tarjeta-tipo">{etiquetaTipo(espacio.tipo)}</span>
        <h2 className="esp-tarjeta-nombre">{espacio.nombre}</h2>
        <p className="esp-tarjeta-lugar">{lugarCorto(espacio)}</p>
      </Link>
    </li>
  )
}
