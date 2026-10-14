import { createHmac, timingSafeEqual } from 'node:crypto'
import { COUNTRIES, getCountryByCode } from '@/lib/geo/countries'
import { etiquetaCategoria } from '@/components/convocatorias/vocabulario'
import { REMUNERACION_CORTA } from '@/components/castings/vocabulario'

export { FRECUENCIAS, GENEROS_ALERTA, validarAlerta, type CamposAlerta, type Frecuencia } from './formulario'

/**
 * Alertas de convocatorias y de castings personalizadas (planes de pago),
 * en un único correo.
 *
 * Funciones puras: qué convocatorias coinciden con una alerta, cuándo toca
 * enviarla, el HTML del correo y el token de baja. La consulta y el envío
 * viven en app/api/cron/alertas-convocatorias; la tabla y la RLS, en la
 * migración 20261008090000.
 */

export const SITIO = 'https://www.obrasdeteatro.com'
export const REMITENTE = 'ObrasDeTeatro® <no-reply@obrasdeteatro.com>'
export const MAX_POR_CORREO = 20
export const VENTANA_INICIAL_MS = 7 * 24 * 60 * 60 * 1000
/** Planes que reciben alertas: todos menos el gratuito (como public.plan_de_pago()). */
export const PLANES_CON_ALERTAS: ReadonlySet<string> = new Set(['premium', 'destacado', 'empresas'])

export type FiltrosCastings = {
  castings_activa: boolean
  castings_paises: string[]
  castings_disciplinas: string[]
  castings_edad: number | null
  castings_genero: string | null
  castings_solo_remunerados: boolean
}

export type Alerta = {
  profile_id: string
  /** Convocatorias activadas. */
  activa: boolean
  paises: string[]
  categorias: string[]
  frecuencia: string
  ultimo_envio_at: string | null
} & FiltrosCastings

export type CastingAlerta = {
  id: string
  titulo: string
  entidad_organizadora: string | null
  pais: string | null
  ciudad: string | null
  fecha_cierre: string | null
  modalidad: string | null
  tipo_remuneracion: string | null
  categorias: string[] | null
  edad_min: number | null
  edad_max: number | null
  genero_escenico: string | null
  publicado_at: string | null
}

export type ConvocatoriaAlerta = {
  id: string
  title: string
  entidad_convocante: string | null
  pais_code: string | null
  location: string | null
  category: string | null
  deadline: string | null
  fecha_publicacion: string | null
}

// ── Cuándo toca ───────────────────────────────────────────────────────────

/** ¿Es lunes en Madrid? (el cron diario corre a las 07:30 UTC). */
export function esLunesEnMadrid(ahora: Date): boolean {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Madrid', weekday: 'short' }).format(ahora) === 'Mon'
}

/**
 * ¿Toca enviar esta alerta ahora? Diaria: sí. Semanal: solo los lunes.
 * Además, si ya hubo un envío reciente (20 h la diaria, 6 días la semanal),
 * no: así un cron que se ejecute dos veces no manda el correo dos veces.
 */
export function tocaEnvio(
  alerta: Pick<Alerta, 'activa' | 'frecuencia' | 'ultimo_envio_at'> & { castings_activa?: boolean },
  ahora: Date,
): boolean {
  if (!alerta.activa && !alerta.castings_activa) return false
  const ultimo = alerta.ultimo_envio_at ? new Date(alerta.ultimo_envio_at).getTime() : null
  const hace = (h: number) => ahora.getTime() - h * 60 * 60 * 1000
  if (alerta.frecuencia === 'diaria') return ultimo === null || ultimo <= hace(20)
  if (alerta.frecuencia === 'semanal') return esLunesEnMadrid(ahora) && (ultimo === null || ultimo <= hace(6 * 24))
  return false
}

/** Desde cuándo buscar: el último envío o, la primera vez, hace 7 días. */
export function desdeDe(alerta: Pick<Alerta, 'ultimo_envio_at'>, ahora: Date): Date {
  return alerta.ultimo_envio_at ? new Date(alerta.ultimo_envio_at) : new Date(ahora.getTime() - VENTANA_INICIAL_MS)
}

// ── Qué coincide ──────────────────────────────────────────────────────────

/**
 * Convocatorias de una alerta: publicadas después de `desde`, con plazo no
 * vencido (o sin plazo), del país y la categoría elegidos (listas vacías =
 * todos). Una convocatoria sin país o sin categoría solo entra si la alerta
 * no filtra por eso. Ordenadas por fecha límite más próxima (sin plazo, al
 * final).
 */
export function coincidencias(alerta: Pick<Alerta, 'paises' | 'categorias'>, convocatorias: ConvocatoriaAlerta[], desde: Date, ahora: Date): ConvocatoriaAlerta[] {
  const fin = (c: ConvocatoriaAlerta) => (c.deadline ? new Date(c.deadline).getTime() : Number.POSITIVE_INFINITY)
  return convocatorias
    .filter(c => c.fecha_publicacion !== null && new Date(c.fecha_publicacion).getTime() > desde.getTime())
    .filter(c => c.deadline === null || new Date(c.deadline).getTime() > ahora.getTime())
    .filter(c => alerta.paises.length === 0 || (c.pais_code !== null && alerta.paises.includes(c.pais_code)))
    .filter(c => alerta.categorias.length === 0 || (c.category !== null && alerta.categorias.includes(c.category)))
    .sort((a, b) => fin(a) - fin(b))
}

const CODIGO_DE_PAIS = new Map(COUNTRIES.map(c => [c.name, c.code]))

/** Fecha de hoy en Madrid, «AAAA-MM-DD» (fecha_cierre de los castings es una fecha sin hora). */
export function hoyEnMadrid(ahora: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora)
}

/**
 * Castings de una alerta: publicados después de `desde`, con el plazo
 * abierto (cierran hoy o después) y que pasan todos los filtros elegidos
 * (cualquier filtro vacío = sin filtrar):
 * - país: uno de los marcados (un casting sin país solo entra sin filtro);
 * - disciplina: comparte al menos una con las marcadas;
 * - edad: el rango del casting la incluye (sin mínimo o sin máximo, abierto);
 * - género escénico: el mismo, o el casting es «Indistinto» o no lo dice;
 * - solo remunerados: tipo_remuneracion = remunerado.
 * Ordenados por fecha de cierre más próxima.
 */
export function coincidenciasCastings(alerta: FiltrosCastings, castings: CastingAlerta[], desde: Date, ahora: Date): CastingAlerta[] {
  if (!alerta.castings_activa) return []
  const hoy = hoyEnMadrid(ahora)
  const edad = alerta.castings_edad
  return castings
    .filter(c => c.publicado_at !== null && new Date(c.publicado_at).getTime() > desde.getTime())
    .filter(c => c.fecha_cierre === null || c.fecha_cierre >= hoy)
    .filter(c => alerta.castings_paises.length === 0 || (c.pais !== null && alerta.castings_paises.includes(CODIGO_DE_PAIS.get(c.pais) ?? '')))
    .filter(c => alerta.castings_disciplinas.length === 0 || (c.categorias ?? []).some(x => alerta.castings_disciplinas.includes(x)))
    .filter(c => edad === null || ((c.edad_min === null || c.edad_min <= edad) && (c.edad_max === null || c.edad_max >= edad)))
    .filter(c => alerta.castings_genero === null || c.genero_escenico === null || c.genero_escenico === 'Indistinto' || c.genero_escenico === alerta.castings_genero)
    .filter(c => !alerta.castings_solo_remunerados || c.tipo_remuneracion === 'remunerado')
    .sort((a, b) => (a.fecha_cierre ?? '9999').localeCompare(b.fecha_cierre ?? '9999'))
}

// ── Token de baja ─────────────────────────────────────────────────────────
//
// Identifica a un usuario y solo sirve para desactivar su alerta. No caduca:
// un enlace de baja tiene que seguir funcionando en correos antiguos. Firmado
// con HMAC-SHA256 y ALERTAS_CONVOCATORIAS_SECRET.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PROPOSITO = 'baja-alertas-convocatorias'

function claveBaja(): string | null {
  const s = process.env.ALERTAS_CONVOCATORIAS_SECRET
  return s && s.length > 0 ? s : null
}

function firmar(datos: string, clave: string): string {
  return createHmac('sha256', clave).update(`${PROPOSITO}:${datos}`, 'utf8').digest('base64url')
}

export function crearTokenBaja(profileId: string): string | null {
  const clave = claveBaja()
  if (!clave) return null
  const datos = Buffer.from(profileId, 'utf8').toString('base64url')
  return `${datos}.${firmar(datos, clave)}`
}

/** Devuelve el profile_id si el token es auténtico; null en cualquier otro caso. Nunca lanza. */
export function verificarTokenBaja(token: string | null | undefined): string | null {
  const clave = claveBaja()
  if (!clave || typeof token !== 'string' || token.length > 300) return null
  const [datos, firma, ...resto] = token.split('.')
  if (!datos || !firma || resto.length > 0) return null
  const esperada = Buffer.from(firmar(datos, clave), 'utf8')
  const recibida = Buffer.from(firma, 'utf8')
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null
  const id = Buffer.from(datos, 'base64url').toString('utf8')
  return UUID.test(id) ? id : null
}

export const enlaceBaja = (token: string) => `${SITIO}/alertas/baja?t=${encodeURIComponent(token)}`
/** Baja de un clic desde el propio cliente de correo (RFC 8058: POST sin cuerpo útil). */
export const enlaceBajaUnClic = (token: string) => `${SITIO}/api/alertas/baja?t=${encodeURIComponent(token)}`

// ── Correo ────────────────────────────────────────────────────────────────

function escaparHtml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function fechaLimite(deadline: string | null): string {
  if (!deadline) return 'Sin fecha límite'
  return new Date(deadline).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'long', year: 'numeric' })
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/** Asunto del correo. Con las dos cosas: «Tus alertas: 2 castings y 3 convocatorias». */
export function asunto(convocatorias: number, castings = 0): string {
  if (castings === 0) return convocatorias === 1 ? '1 convocatoria nueva para ti' : `${convocatorias} convocatorias nuevas para ti`
  if (convocatorias === 0) return castings === 1 ? '1 casting nuevo para ti' : `${castings} castings nuevos para ti`
  return `Tus alertas: ${plural(castings, 'casting', 'castings')} y ${plural(convocatorias, 'convocatoria', 'convocatorias')}`
}

/** «Ver todas»: al listado, con el país si la alerta filtra por uno solo. */
export function enlaceVerTodas(alerta: Pick<Alerta, 'paises'>): string {
  return alerta.paises.length === 1 ? `${SITIO}/convocatoria?pais=${alerta.paises[0]}` : `${SITIO}/convocatoria`
}

function fechaCierre(fecha: string | null): string {
  if (!fecha) return 'Sin fecha de cierre'
  // Mediodía UTC: la fecha no cambia de día en ninguna zona horaria.
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'long', year: 'numeric' })
}

function encabezadoSeccion(texto: string): string {
  return `
      <tr><td style="padding:22px 28px 0;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;color:#111827;text-transform:uppercase;letter-spacing:2px;border-bottom:2px solid #c9a84c;padding-bottom:6px;">${escaparHtml(texto)}</p>
      </td></tr>`
}

function filasConvocatorias(lista: ConvocatoriaAlerta[]): string {
  return lista.map(c => {
    const pais = c.pais_code ? getCountryByCode(c.pais_code)?.name ?? c.pais_code : c.location
    return `
        <tr><td style="padding:16px 0;border-bottom:1px solid #e5e7eb;">
          <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;color:#b91c1c;text-transform:uppercase;letter-spacing:1px;">${escaparHtml(etiquetaCategoria(c.category))}</p>
          <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:17px;line-height:1.3;"><a href="${SITIO}/convocatoria/${encodeURIComponent(c.id)}" style="color:#111827;text-decoration:none;">${escaparHtml(c.title)}</a></p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#4b5563;line-height:1.6;">
            ${c.entidad_convocante ? `${escaparHtml(c.entidad_convocante)}<br>` : ''}
            ${pais ? `${escaparHtml(pais)} · ` : ''}Fecha límite: ${escaparHtml(fechaLimite(c.deadline))}
          </p>
          <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:13px;"><a href="${SITIO}/convocatoria/${encodeURIComponent(c.id)}" style="color:#b91c1c;">Ver la convocatoria →</a></p>
        </td></tr>`
  }).join('')
}

function filasCastings(lista: CastingAlerta[], disciplinas: ReadonlyMap<string, string>): string {
  return lista.map(c => {
    const etiquetas = (c.categorias ?? []).map(x => disciplinas.get(x) ?? x).join(' · ')
    const lugar = [c.ciudad, c.pais].filter(Boolean).join(', ') || c.modalidad
    const remuneracion = c.tipo_remuneracion ? REMUNERACION_CORTA[c.tipo_remuneracion] ?? null : null
    const url = `${SITIO}/castings/${encodeURIComponent(c.id)}`
    return `
        <tr><td style="padding:16px 0;border-bottom:1px solid #e5e7eb;">
          ${etiquetas ? `<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;color:#b91c1c;text-transform:uppercase;letter-spacing:1px;">${escaparHtml(etiquetas)}</p>` : ''}
          <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:17px;line-height:1.3;"><a href="${url}" style="color:#111827;text-decoration:none;">${escaparHtml(c.titulo)}</a></p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#4b5563;line-height:1.6;">
            ${c.entidad_organizadora ? `${escaparHtml(c.entidad_organizadora)}<br>` : ''}
            ${lugar ? `${escaparHtml(lugar)} · ` : ''}${remuneracion ? `${escaparHtml(remuneracion)} · ` : ''}Cierra: ${escaparHtml(fechaCierre(c.fecha_cierre))}
          </p>
          <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:13px;"><a href="${url}" style="color:#b91c1c;">Ver el casting →</a></p>
        </td></tr>`
  }).join('')
}

/**
 * HTML del correo: castings y convocatorias, cada sección solo si tiene algo
 * y con como mucho MAX_POR_CORREO de cada una (las de cierre más próximo).
 */
export function construirHtml(
  alerta: Pick<Alerta, 'paises'>, lista: ConvocatoriaAlerta[], tokenBaja: string,
  castings: CastingAlerta[] = [], disciplinas: ReadonlyMap<string, string> = new Map(),
): string {
  const ambas = lista.length > 0 && castings.length > 0
  const tope = (n: number, art: string, que: string) => (n > MAX_POR_CORREO ? ` Te mostramos ${art} ${MAX_POR_CORREO} de cierre más próximo de ${n} ${que}.` : '')

  const seccionCastings = castings.length === 0 ? '' : `${ambas ? encabezadoSeccion(`Castings (${castings.length})`) : ''}
      <tr><td style="padding:0 28px;"><table width="100%" cellpadding="0" cellspacing="0" border="0">${filasCastings(castings.slice(0, MAX_POR_CORREO), disciplinas)}
      </table></td></tr>
      <tr><td style="padding:14px 28px 6px;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;"><a href="${SITIO}/castings" style="color:#b91c1c;">Ver todos los castings →</a></p>
      </td></tr>`

  const seccionConvocatorias = lista.length === 0 ? '' : `${ambas ? encabezadoSeccion(`Convocatorias (${lista.length})`) : ''}
      <tr><td style="padding:0 28px;"><table width="100%" cellpadding="0" cellspacing="0" border="0">${filasConvocatorias(lista.slice(0, MAX_POR_CORREO))}
      </table></td></tr>
      <tr><td style="padding:14px 28px 6px;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;"><a href="${escaparHtml(enlaceVerTodas(alerta))}" style="color:#b91c1c;">Ver todas las convocatorias →</a></p>
      </td></tr>`

  const que = ambas ? 'Castings y convocatorias publicados' : castings.length > 0 ? 'Castings publicados' : 'Convocatorias publicadas'
  const intro = `${que} desde tu último aviso que coinciden con tus alertas, de cierre más próximo a más lejano.${tope(castings.length, 'los', 'castings')}${tope(lista.length, 'las', 'convocatorias')}`

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f6"><tr><td align="center" style="padding:24px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;">
      <tr><td style="padding:20px 28px;background:#0a0a0a;">
        <!-- Enlace explícito con su color: si no, Gmail convierte el dominio en un enlace azul subrayado. -->
        <p style="margin:0;font-family:Georgia,serif;font-size:11px;color:#e8202f;letter-spacing:3px;text-transform:uppercase;"><a href="${SITIO}" style="color:#e8202f;text-decoration:none;">OBRASDETEATRO.COM</a> · TUS ALERTAS</p>
      </td></tr>
      <tr><td style="padding:24px 28px 4px;">
        <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:20px;color:#111827;">${escaparHtml(asunto(lista.length, castings.length))}</p>
        <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#6b7280;line-height:1.6;">${escaparHtml(intro)}</p>
      </td></tr>${seccionCastings}${seccionConvocatorias}
      <tr><td style="padding:16px 28px 24px;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#6b7280;line-height:1.6;">
          Recibes este correo porque activaste tus alertas en obrasdeteatro.com.<br>
          <a href="${SITIO}/perfil/centro#alertas" style="color:#374151;">Gestionar mis alertas</a> ·
          <a href="${escaparHtml(enlaceBaja(tokenBaja))}" style="color:#374151;">Darme de baja</a>
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
