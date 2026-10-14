/* eslint-disable jsx-a11y/alt-text -- <Image> de @react-pdf dibuja en el PDF; no es una <img> HTML y no admite alt. */
import { Document, Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { DatosDocumento, Entrada } from './datos'
import type { ImagenPdf } from './imagenes'
import { enlaceLegible, textoPdf as t } from './formato'

/**
 * Bloque 8: el CV y el dossier artístico en PDF (@react-pdf/renderer).
 *
 * Ojo: nada de lineHeight en el estilo de la página: con él, el pie fijo con
 * el número de página no se pinta (fallo de @react-pdf 4.3). Va en cada texto.
 *
 * Fuentes estándar del PDF (Times para títulos, Helvetica para el texto): no
 * hay que empaquetar archivos de fuentes y cubren el español. Todo texto del
 * usuario pasa por textoPdf, que quita lo que esas fuentes no pueden pintar.
 */

const ROJO = '#c8001a'
const NEGRO = '#111111'
const GRIS = '#5f5f5f'
const GRIS_CLARO = '#9a9a9a'
const LINEA = '#e2e2e2'

export type Opciones = { email: boolean; telefono: boolean }
export type ImagenesCv = { avatar: ImagenPdf | null }
export type ImagenesDossier = {
  avatar: ImagenPdf | null
  portada: ImagenPdf | null
  fotos: (ImagenPdf | null)[]
  proyectos: (ImagenPdf | null)[]
}

const s = StyleSheet.create({
  pagina: { paddingTop: 44, paddingBottom: 56, paddingHorizontal: 48, fontFamily: 'Helvetica', fontSize: 9.5, color: NEGRO },
  pie: { position: 'absolute', bottom: 24, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: GRIS_CLARO, borderTopWidth: 0.5, borderTopColor: LINEA, paddingTop: 6 },
  cabecera: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: { width: 78, height: 78, borderRadius: 39, marginRight: 18, objectFit: 'cover' },
  nombre: { fontFamily: 'Times-Bold', fontSize: 26, lineHeight: 1.1, color: NEGRO },
  tipo: { fontSize: 8.5, color: ROJO, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 5 },
  dato: { fontSize: 8.5, color: GRIS, marginTop: 3 },
  regla: { height: 1.2, backgroundColor: ROJO, marginBottom: 16, width: 60 },
  seccion: { marginBottom: 14 },
  tituloSeccion: { fontFamily: 'Times-Bold', fontSize: 12.5, color: NEGRO, marginBottom: 7, paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: LINEA },
  entrada: { flexDirection: 'row', marginBottom: 7 },
  entradaPeriodo: { width: 82, fontSize: 8.5, color: GRIS, paddingTop: 1 },
  entradaCuerpo: { flex: 1 },
  entradaTitulo: { fontFamily: 'Helvetica-Bold', fontSize: 9.5 },
  entradaDetalle: { fontFamily: 'Helvetica-Oblique', fontSize: 9, color: GRIS },
  entradaTexto: { fontSize: 8.8, color: '#333333', marginTop: 2, lineHeight: 1.4 },
  etiqueta: { fontSize: 7, color: ROJO, letterSpacing: 0.8, textTransform: 'uppercase' },
  parrafo: { fontSize: 9.5, color: '#2a2a2a', textAlign: 'justify', lineHeight: 1.5 },
  enlace: { color: NEGRO, textDecoration: 'none' },
})

function Pie({ etiqueta }: { etiqueta: string }) {
  const fecha = new Date().toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <View style={s.pie} fixed>
      <Text>{etiqueta} · obrasdeteatro.com · {fecha}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={s.seccion}>
      <Text style={s.tituloSeccion} minPresenceAhead={60}>{titulo}</Text>
      {children}
    </View>
  )
}

/**
 * Sección cuyo título nunca se queda solo al final de una página: va en un
 * mismo bloque irrompible con el primer elemento.
 */
function SeccionLista({ titulo, items }: { titulo: string; items: React.ReactNode[] }) {
  if (!items.length) return null
  return (
    <View style={s.seccion}>
      <View wrap={false}>
        <Text style={s.tituloSeccion}>{titulo}</Text>
        {items[0]}
      </View>
      {items.slice(1)}
    </View>
  )
}

function entradas(lista: Entrada[], conTexto = true): React.ReactNode[] {
  return lista.map((e, i) => (
        <View key={i} style={s.entrada} wrap={false}>
          <Text style={s.entradaPeriodo}>{t(e.periodo)}</Text>
          <View style={s.entradaCuerpo}>
            {e.etiqueta ? <Text style={s.etiqueta}>{t(e.etiqueta)}</Text> : null}
            <Text style={s.entradaTitulo}>{t(e.titulo)}</Text>
            {e.detalle ? <Text style={s.entradaDetalle}>{t(e.detalle)}</Text> : null}
            {conTexto && e.descripcion ? <Text style={s.entradaTexto}>{t(e.descripcion)}</Text> : null}
          </View>
        </View>
  ))
}

function Contacto({ d, o, claro = false }: { d: DatosDocumento; o: Opciones; claro?: boolean }) {
  const lineas: { texto: string; url?: string }[] = []
  if (o.email && d.email) lineas.push({ texto: d.email, url: `mailto:${d.email}` })
  if (o.telefono && d.telefono) lineas.push({ texto: d.telefono })
  if (d.web) lineas.push({ texto: enlaceLegible(d.web), url: d.web })
  if (d.perfilUrl) lineas.push({ texto: enlaceLegible(d.perfilUrl), url: d.perfilUrl })
  if (!lineas.length) return null
  return (
    <Text style={[s.dato, claro ? { color: '#d6d6d6' } : {}]}>
      {lineas.map((l, i) => (
        <Text key={i}>
          {i > 0 ? '   ·   ' : ''}
          {l.url ? <Link src={l.url} style={[s.enlace, claro ? { color: '#ffffff' } : {}]}>{t(l.texto)}</Link> : t(l.texto)}
        </Text>
      ))}
    </Text>
  )
}

function Redes({ d }: { d: DatosDocumento }) {
  if (!d.redes.length) return null
  return (
    <Text style={s.dato}>
      {d.redes.map((r, i) => (
        <Text key={r.red}>
          {i > 0 ? '   ·   ' : ''}
          <Text style={{ color: GRIS_CLARO }}>{r.red} </Text>
          <Link src={r.url} style={s.enlace}>{t(enlaceLegible(r.url))}</Link>
        </Text>
      ))}
    </Text>
  )
}

function subtitulo(d: DatosDocumento): string {
  return [d.tipo, d.especialidadPrincipal].filter(Boolean).join(' · ')
}

/** Bio del CV: como mucho ~1100 caracteres, cortada en una frase. */
function bioCorta(bio: string): string {
  const b = t(bio)
  if (b.length <= 1100) return b
  const corte = b.slice(0, 1100)
  const punto = corte.lastIndexOf('. ')
  return (punto > 500 ? corte.slice(0, punto + 1) : corte.replace(/\s+\S*$/, '') + '…')
}

// ── CV ─────────────────────────────────────────────────────────────────────

export function CvPdf({ d, img, o }: { d: DatosDocumento; img: ImagenesCv; o: Opciones }) {
  return (
    <Document title={`CV · ${t(d.nombre)}`} author={t(d.nombre)} creator="obrasdeteatro.com" producer="obrasdeteatro.com" language="es">
      <Page size="A4" style={s.pagina}>
        <Pie etiqueta={`CV de ${t(d.nombre)}`} />
        <View style={s.cabecera}>
          {img.avatar ? <Image src={img.avatar} style={s.avatar} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={s.nombre}>{t(d.nombre)}</Text>
            {d.nombreCompleto && d.nombreCompleto !== d.nombre ? <Text style={s.dato}>{t(d.nombreCompleto)}</Text> : null}
            <Text style={s.tipo}>{t(subtitulo(d))}</Text>
            {d.ubicacion ? <Text style={s.dato}>{t(d.ubicacion)}</Text> : null}
            <Contacto d={d} o={o} />
          </View>
        </View>
        <View style={s.regla} />

        {d.bio ? <Seccion titulo="Perfil"><Text style={s.parrafo}>{bioCorta(d.bio)}</Text></Seccion> : null}
        <SeccionLista titulo="Experiencia profesional" items={entradas(d.experiencia)} />
        <SeccionLista titulo="Formación" items={entradas(d.formacion, false)} />
        <SeccionLista titulo="Premios y reconocimientos" items={entradas(d.premios)} />
        {d.especialidades.length ? (
          <Seccion titulo="Especialidades"><Text>{t(d.especialidades.join('  ·  '))}</Text></Seccion>
        ) : null}
        {d.disponibilidad || d.redes.length ? (
          <Seccion titulo="Disponibilidad y redes">
            {d.disponibilidad ? <Text>{t(d.disponibilidad)}</Text> : null}
            <Redes d={d} />
          </Seccion>
        ) : null}
      </Page>
    </Document>
  )
}

// ── Dossier ────────────────────────────────────────────────────────────────

const sd = StyleSheet.create({
  portada: { padding: 0, fontFamily: 'Helvetica', color: '#ffffff', backgroundColor: '#0f0f12' },
  portadaImagen: { width: '100%', height: 430, objectFit: 'cover' },
  portadaTexto: { paddingHorizontal: 48, paddingTop: 34 },
  marca: { fontSize: 8, letterSpacing: 3, color: '#c9a84c', textTransform: 'uppercase', marginBottom: 14 },
  portadaNombre: { fontFamily: 'Times-Bold', fontSize: 40, lineHeight: 1.05, color: '#ffffff' },
  portadaTipo: { fontSize: 10, letterSpacing: 2, color: '#ff4d61', textTransform: 'uppercase', marginTop: 10 },
  portadaEsp: { fontSize: 10, color: '#cfcfcf', marginTop: 10, lineHeight: 1.5 },
  portadaPie: { position: 'absolute', bottom: 34, left: 48, right: 48, fontSize: 8.5, color: '#bdbdbd', borderTopWidth: 0.5, borderTopColor: '#3a3a40', paddingTop: 10 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  foto: { width: '48.5%', marginBottom: 12 },
  fotoImg: { width: '100%', height: 170, objectFit: 'cover' },
  pieFoto: { fontSize: 7.8, color: GRIS, marginTop: 3 },
  proyecto: { flexDirection: 'row', marginBottom: 12 },
  proyectoImg: { width: 150, height: 100, objectFit: 'cover', marginRight: 14 },
})

export function DossierPdf({ d, img, o }: { d: DatosDocumento; img: ImagenesDossier; o: Opciones }) {
  const fondo = img.portada ?? img.avatar
  const fotos = d.fotos.map((f, i) => ({ ...f, img: img.fotos[i] })).filter(f => f.img)
  return (
    <Document title={`Dossier artístico · ${t(d.nombre)}`} author={t(d.nombre)} creator="obrasdeteatro.com" producer="obrasdeteatro.com" language="es">
      {/* Portada */}
      <Page size="A4" style={sd.portada}>
        {fondo ? <Image src={fondo} style={sd.portadaImagen} /> : <View style={{ height: 160 }} />}
        <View style={sd.portadaTexto}>
          <Text style={sd.marca}>Dossier artístico</Text>
          <Text style={sd.portadaNombre}>{t(d.nombre)}</Text>
          <Text style={sd.portadaTipo}>{t(subtitulo(d))}</Text>
          {d.especialidades.length ? <Text style={sd.portadaEsp}>{t(d.especialidades.join('  ·  '))}</Text> : null}
          {d.ubicacion ? <Text style={[sd.portadaEsp, { marginTop: 4 }]}>{t(d.ubicacion)}</Text> : null}
        </View>
        <View style={sd.portadaPie}>
          <Contacto d={d} o={o} claro />
        </View>
      </Page>

      {/* Contenido */}
      <Page size="A4" style={s.pagina}>
        <Pie etiqueta={`Dossier de ${t(d.nombre)}`} />
        {d.bio ? (
          <Seccion titulo="Biografía">
            <Text style={s.parrafo}>{t(d.bio)}</Text>
          </Seccion>
        ) : null}
        <SeccionLista titulo="Trayectoria" items={entradas(d.experiencia)} />
        <SeccionLista titulo="Proyectos y espectáculos" items={d.proyectos.map((p, i) => (
          <View key={i} style={sd.proyecto} wrap={false}>
            {img.proyectos[i] ? <Image src={img.proyectos[i]!} style={sd.proyectoImg} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={s.entradaTitulo}>{t(p.titulo)}{p.anio ? `  (${p.anio})` : ''}</Text>
              {p.rol || p.compania ? <Text style={s.entradaDetalle}>{t([p.rol, p.compania].filter(Boolean).join(' · '))}</Text> : null}
              {p.descripcion ? <Text style={s.entradaTexto}>{t(p.descripcion)}</Text> : null}
              {p.enlace ? <Link src={p.enlace} style={[s.entradaTexto, { color: ROJO }]}>{t(enlaceLegible(p.enlace))}</Link> : null}
            </View>
          </View>
        ))} />
        <SeccionLista titulo="Formación" items={entradas(d.formacion, false)} />
        <SeccionLista titulo="Premios y reconocimientos" items={entradas(d.premios)} />
        {fotos.length ? (
          <Seccion titulo="Galería">
            <View style={sd.rejilla}>
              {fotos.map((f, i) => (
                <View key={i} style={sd.foto} wrap={false}>
                  <Image src={f.img!} style={sd.fotoImg} />
                  {f.pie || f.credito ? (
                    <Text style={sd.pieFoto}>{t(f.pie ?? '')}{f.pie && f.credito ? ' · ' : ''}{f.credito ? `Foto: ${t(f.credito)}` : ''}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </Seccion>
        ) : null}
        {d.videos.length ? (
          <Seccion titulo="Vídeos">
            {d.videos.map((v, i) => (
              <Text key={i} style={{ marginBottom: 3 }}>
                {v.titulo ? `${t(v.titulo)}  ` : ''}
                <Link src={v.url} style={{ color: ROJO, textDecoration: 'none' }}>{t(enlaceLegible(v.url))}</Link>
              </Text>
            ))}
          </Seccion>
        ) : null}
        <Seccion titulo="Contacto">
          {d.disponibilidad ? <Text>{t(d.disponibilidad)}</Text> : null}
          <Contacto d={d} o={o} />
          <Redes d={d} />
        </Seccion>
      </Page>
    </Document>
  )
}
