import Link from 'next/link'
import { IconArrowRight } from './EcoIcons'
import { UMBRALES, superaUmbral, type DatosPortada } from '@/lib/portada/datos'

interface Tarjeta {
  /** Cifra real, o texto cualitativo cuando la cifra no supera su umbral. */
  value: string
  esTexto: boolean
  label: string
  detalle?: string
  link: string
  href: string
}

const miles = (n: number) => n.toLocaleString('es-ES')

/**
 * Cada cifra se enseña solo si el dato real supera su umbral (UMBRALES). Por
 * debajo, la tarjeta dice algo cualitativo y verdadero en vez de un número.
 * No hay «+X esta semana»: ese dato no existe.
 */
function tarjetas(datos: DatosPortada): Tarjeta[] {
  return [
    superaUmbral(datos.obras, UMBRALES.obras)
      ? { value: miles(datos.obras), esTexto: false, label: 'Obras publicadas', link: 'Ver obras', href: '/obras' }
      : { value: 'Biblioteca abierta', esTexto: true, label: 'Clásicos del teatro hispano y autores actuales', link: 'Ver obras', href: '/obras' },
    superaUmbral(datos.companias, UMBRALES.companias)
      ? { value: miles(datos.companias), esTexto: false, label: 'Compañías en el directorio', link: 'Explorar compañías', href: '/directorio?tipo=compania' }
      : { value: 'Directorio profesional', esTexto: true, label: 'Compañías, salas y profesionales', link: 'Explorar el directorio', href: '/directorio' },
    superaUmbral(datos.convocatoriasAbiertas, UMBRALES.convocatorias)
      ? { value: miles(datos.convocatoriasAbiertas), esTexto: false, label: 'Convocatorias abiertas', link: 'Ver convocatorias', href: '/convocatoria' }
      : { value: 'Convocatorias', esTexto: true, label: 'Festivales, premios, residencias y becas', link: 'Ver convocatorias', href: '/convocatoria' },
    { value: '20', esTexto: false, label: 'Países conectados', detalle: 'España · México · Argentina…', link: 'Ver directorio', href: '/directorio' },
  ]
}

export default function EcosistemaStatsGrid({ datos }: { datos: DatosPortada }) {
  return (
    <div className="eco-stats-grid">
      {tarjetas(datos).map((s, i) => (
        <Link key={i} href={s.href} className="eco-stat-card eco-reveal">
          <div className={`eco-stat-value${s.esTexto ? ' eco-stat-value--texto' : ''}`}>{s.value}</div>
          <div className="eco-stat-label">{s.label}</div>
          {s.detalle && <div className="eco-stat-delta eco-stat-delta--neutral">{s.detalle}</div>}
          <div className="eco-stat-link">{s.link} <IconArrowRight /></div>
        </Link>
      ))}
    </div>
  )
}
