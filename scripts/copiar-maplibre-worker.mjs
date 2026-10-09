// Copia el worker de MapLibre GL a public/vendor/maplibre-gl/<versión>/.
//
// MapLibre 6 se publica solo como ESM y su worker es un módulo aparte que
// importa ./maplibre-gl-shared.mjs. Dentro del bundle de webpack la librería
// no sabe de dónde cargarlo (calcula la URL con import.meta.url), así que el
// mapa le da una URL fija con setWorkerUrl (components/espacios/MapaEspacios).
//
// Se ejecuta en predev y prebuild; la carpeta está en .gitignore. La versión
// en la ruta hace que cada actualización de la librería estrene URL y no se
// mezcle con lo que tengan en caché los navegadores.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const origen = path.join(raiz, 'node_modules', 'maplibre-gl', 'dist')
const { version } = JSON.parse(readFileSync(path.join(raiz, 'node_modules', 'maplibre-gl', 'package.json'), 'utf8'))
const destino = path.join(raiz, 'public', 'vendor', 'maplibre-gl', version)

mkdirSync(destino, { recursive: true })
for (const archivo of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(path.join(origen, archivo), path.join(destino, archivo))
}
console.log(`maplibre-gl ${version}: worker copiado a public/vendor/maplibre-gl/${version}/`)
