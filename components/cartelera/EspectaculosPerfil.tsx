import Link from 'next/link'
import { etiquetaGenero } from '@/lib/cartelera/cartelera'
import type { FichaListado } from '@/lib/cartelera/listado'
import type { ResumenEntradas } from '@/lib/cartelera/datos'
import type { EspectaculoAnterior } from '@/lib/cartelera/perfil'
import { Poster, TarjetaEspectaculo, rutaEspectaculo } from './publico'

/**
 * Bloque del perfil público: «En cartel» y «Anteriores». Cada parte sale solo
 * si tiene espectáculos; sin ninguno, el bloque no se pinta.
 */
export default function EspectaculosPerfil({ enCartel, anteriores, entradas, ahora }: {
  enCartel: FichaListado[]; anteriores: EspectaculoAnterior[]; entradas: Map<string, ResumenEntradas>; ahora: number
}) {
  if (enCartel.length === 0 && anteriores.length === 0) return null
  return (
    <>
      {enCartel.length > 0 && (
        <section style={{ marginBottom: '48px' }} aria-labelledby="perfil-en-cartel">
          <h2 id="perfil-en-cartel" className="prof-eyebrow">Cartelera</h2>
          <div className="cart-grid">
            {enCartel.map(e => <TarjetaEspectaculo key={e.id} e={e} entradas={entradas.get(e.id)} ahora={ahora} />)}
          </div>
        </section>
      )}
      {anteriores.length > 0 && (
        <section style={{ marginBottom: '48px' }} aria-labelledby="perfil-anteriores">
          <h2 id="perfil-anteriores" className="prof-eyebrow">{enCartel.length > 0 ? 'Espectáculos anteriores' : 'Espectáculos'}</h2>
          <div className="cart-grid cart-grid--mini">
            {anteriores.map(e => (
              <Link key={e.id} href={rutaEspectaculo(e.slug)} className="cart-card-enlace">
                <Poster url={e.cartel_url} titulo={e.titulo} />
                <div>
                  <h3 className="cart-card-t" style={{ fontSize: '15px' }}>{e.titulo}</h3>
                  <p className="cart-card-m">
                    {[etiquetaGenero(e.genero_id), e.ultima ? new Date(e.ultima).getUTCFullYear() : null, e.ciudades[0]].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
