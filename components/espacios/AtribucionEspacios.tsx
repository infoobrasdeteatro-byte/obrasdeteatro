import { URL_OSM_COPYRIGHT, URL_WIKIDATA } from '@/lib/espacios/espacios'

/**
 * Atribución que exige la licencia ODbL de OpenStreetMap (y cortesía con
 * Wikidata, CC0) en el pie de /espacios, de cada ficha y de cada página por
 * municipio.
 */
export default function AtribucionEspacios() {
  return (
    <p className="esp-atribucion">
      Datos de espacios: ©{' '}
      <a href={URL_OSM_COPYRIGHT} target="_blank" rel="noopener">colaboradores de OpenStreetMap (licencia ODbL)</a>
      {' '}y{' '}
      <a href={URL_WIKIDATA} target="_blank" rel="noopener">Wikidata</a>.
      {' '}¿Gestionas un espacio y quieres corregir o retirar su ficha? Escríbenos a{' '}
      <a href="mailto:hola@obrasdeteatro.com">hola@obrasdeteatro.com</a>.
    </p>
  )
}
