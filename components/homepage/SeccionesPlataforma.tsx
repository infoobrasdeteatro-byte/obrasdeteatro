import Link from 'next/link'
import { IconArrowRight } from './EcoIcons'

/**
 * Las ocho secciones de la plataforma, bajo los medios colaboradores: dos
 * filas de cuatro casillas, cada una enlazada a su sección. Orden decidido
 * por Dirección (17/10/2026).
 */
const SECCIONES = [
  { titulo: 'Convocatorias', texto: 'Festivales, premios, residencias y becas', enlace: 'Ver convocatorias', href: '/convocatoria' },
  { titulo: 'Castings', texto: 'Audiciones y castings abiertos', enlace: 'Ver castings', href: '/castings' },
  { titulo: 'Directorio profesional', texto: 'Compañías, salas y profesionales', enlace: 'Explorar el directorio', href: '/directorio' },
  { titulo: 'ScenaIA', texto: 'Asistente inteligente para el teatro hispano', enlace: 'Conocer ScenaIA', href: '/scenaia' },
  { titulo: 'Biblioteca', texto: 'Clásicos del teatro hispano y autores actuales', enlace: 'Ver obras', href: '/obras' },
  { titulo: 'Proscenio', texto: 'La crónica semanal de la escena en español', enlace: 'Suscribirme', href: '/boletin' },
  { titulo: 'Espacios escénicos', texto: 'Teatros y salas de los 20 países', enlace: 'Ver espacios', href: '/espacios' },
  { titulo: 'Cartelera', texto: 'Funciones, horarios y entradas', enlace: 'Ver la cartelera', href: '/cartelera' },
] as const

/** Miles con punto siempre («3.941»): Intl en español no agrupa los de cuatro cifras. */
export function formatearMiles(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Texto de cada casilla. En «Espacios escénicos» y «Biblioteca» se antepone
 * el total publicado (espacios de los 20 países, obras de la biblioteca), dentro de la misma frase y con el
 * mismo estilo; si no hay cifra se queda el texto de siempre.
 */
export function textoSeccion(href: string, texto: string, totalEspacios: number | null, totalObras: number | null = null): string {
  if (href === '/espacios' && totalEspacios && totalEspacios > 0) {
    return `${formatearMiles(totalEspacios)} teatros y salas de los 20 países`
  }
  if (href === '/obras' && totalObras && totalObras > 0) {
    return `${formatearMiles(totalObras)} obras · clásicos del teatro hispano y autores actuales`
  }
  return texto
}

export default function SeccionesPlataforma({ totalEspacios = null, totalObras = null }: { totalEspacios?: number | null; totalObras?: number | null }) {
  return (
    <section className="secciones" aria-label="Secciones de la plataforma">
      <div className="secciones-grid">
        {SECCIONES.map(s => (
          <Link key={s.href} href={s.href} className="eco-stat-card">
            <div className="eco-stat-value eco-stat-value--texto">{s.titulo}</div>
            <div className="eco-stat-label">{textoSeccion(s.href, s.texto, totalEspacios, totalObras)}</div>
            <div className="eco-stat-link">{s.enlace} <IconArrowRight /></div>
          </Link>
        ))}
      </div>
    </section>
  )
}
