import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/service'
import type { Database, Json } from '@/types/supabase'
import {
  MAX_BYTES_CUERPO,
  normalizarDominio,
  urlDeEntrada,
  validarNoticia,
  validarSobre,
  variantesDeUrl,
} from '@/lib/noticias/importacion'

/**
 * POST /api/news/import — entrada de noticias candidatas desde Make.
 *
 * Make no tiene acceso a Supabase: envía aquí, una vez al día, las noticias
 * que OpenAI eligió de los RSS. Esta ruta las guarda como candidatas con la
 * clave de servicio y deja constancia de cada una en noticias_registro.
 *
 * AUTENTICACIÓN. Cabecera x-noticias-secret frente a NOTICIAS_IMPORT_SECRET,
 * comparadas con timingSafeEqual sobre su SHA-256 (así las dos tienen la misma
 * longitud y la comparación no revela cuántos caracteres coinciden). Sin la
 * variable, o con un secreto distinto: 401 sin más detalle. El secreto nunca
 * viaja en la URL, nunca se devuelve y nunca se registra.
 *
 * QUÉ NO DECIDE ESTA RUTA. El estado: toda inserción de la clave de servicio
 * entra como 'candidata' porque lo fuerza el trigger noticias_guarda(), aunque
 * el cuerpo pidiera otra cosa (y aquí ni siquiera se envía). La publicación es
 * siempre de una persona, desde /admin/noticias.
 *
 * RESPUESTA. 200 con un resultado por noticia si el lote se pudo procesar,
 * aunque alguna se rechace; 400 si el cuerpo no es JSON o el sobre no es
 * válido (sin lote, sin noticias o más de 5); 413 si el cuerpo pasa del límite.
 */

type Resultado = {
  url: string | null
  resultado: 'creada' | 'duplicada' | 'rechazada'
  id?: string
  motivo?: string
}

type EntradaRegistro = Database['public']['Tables']['noticias_registro']['Insert']

function secretoValido(recibido: string | null): boolean {
  const esperado = process.env.NOTICIAS_IMPORT_SECRET
  if (!esperado || !recibido) return false
  const a = createHash('sha256').update(recibido, 'utf8').digest()
  const b = createHash('sha256').update(esperado, 'utf8').digest()
  return timingSafeEqual(a, b)
}

const json = (cuerpo: unknown, status: number) => NextResponse.json(cuerpo, { status })

export async function POST(req: NextRequest) {
  if (!secretoValido(req.headers.get('x-noticias-secret'))) {
    return json({ error: 'No autorizado' }, 401)
  }

  const declarado = Number(req.headers.get('content-length') ?? '0')
  if (Number.isFinite(declarado) && declarado > MAX_BYTES_CUERPO) {
    return json({ error: 'El cuerpo supera el tamaño máximo.' }, 413)
  }
  const texto = await req.text()
  if (Buffer.byteLength(texto, 'utf8') > MAX_BYTES_CUERPO) {
    return json({ error: 'El cuerpo supera el tamaño máximo.' }, 413)
  }

  let cuerpo: unknown
  try {
    cuerpo = JSON.parse(texto)
  } catch {
    return json({ error: 'El cuerpo no es JSON válido.' }, 400)
  }

  const sobre = validarSobre(cuerpo)
  if (!sobre.ok) return json({ error: sobre.error }, 400)
  const { lote } = sobre

  const supabase = createServiceClient()

  // Vocabularios pequeños: se leen una vez por lote. Solo categorías activas;
  // las fuentes, todas (una fuente sin permiso todavía puede proponer
  // candidatas; lo que no puede es publicarse, y eso lo impide el trigger).
  const [categorias, fuentes] = await Promise.all([
    supabase.from('noticias_categorias').select('id').eq('activo', true),
    supabase.from('noticias_fuentes').select('id, dominio'),
  ])
  if (categorias.error || fuentes.error) {
    console.error('news/import: no se pudieron leer categorías o fuentes:', (categorias.error ?? fuentes.error)?.message)
    return json({ error: 'Error interno' }, 500)
  }

  const categoriasActivas = new Set((categorias.data ?? []).map(c => c.id))
  const fuentePorDominio = new Map(
    (fuentes.data ?? []).map(f => [normalizarDominio(f.dominio), f.id] as const),
  )

  const resultados: Resultado[] = []
  const registro: EntradaRegistro[] = []

  const rechazar = (url: string | null, motivo: string, detalle: Record<string, Json>) => {
    resultados.push({ url, resultado: 'rechazada', motivo })
    registro.push({ evento: 'error', url, lote, detalle: { motivo, ...detalle } })
  }

  for (const item of sobre.noticias) {
    const url = urlDeEntrada(item)
    const validada = validarNoticia(item)

    if (!validada.ok) {
      rechazar(url, validada.motivo, { fase: 'validacion' })
      continue
    }
    const n = validada.noticia

    if (!categoriasActivas.has(n.categoria_id)) {
      rechazar(url, 'categoria_id: no existe o no está activa.', { fase: 'validacion' })
      continue
    }

    const fuenteId = fuentePorDominio.get(n.fuente_dominio)
    if (!fuenteId) {
      rechazar(url, 'fuente_dominio: no es una fuente registrada.', { fase: 'fuente', dominio: n.fuente_dominio })
      continue
    }

    const { data: creada, error } = await supabase
      .from('noticias')
      .insert({
        titular: n.titular,
        resumen: n.resumen,
        categoria_id: n.categoria_id,
        pais_code: n.pais_code,
        fuente_id: fuenteId,
        url_original: n.url_original,
        fecha_original: n.fecha_original,
        origen: 'make',
        lote_importacion: lote,
      })
      .select('id')
      .single()

    if (creada) {
      // La entrada 'importada' la deja el trigger noticias_registrar_cambio().
      resultados.push({ url, resultado: 'creada', id: creada.id })
      continue
    }

    if (error?.code === '23505') {
      const existente = await buscarExistente(supabase, n.url_original)
      resultados.push({ url, resultado: 'duplicada', ...(existente ? { id: existente } : {}) })
      registro.push({ evento: 'duplicada', url, lote, noticia_id: existente, detalle: { motivo: 'url_duplicada' } })
      continue
    }

    console.error('news/import: no se pudo insertar una noticia:', error?.code, error?.message)
    rechazar(url, 'No se pudo guardar la noticia.', { fase: 'insercion', codigo: error?.code ?? null })
  }

  if (registro.length > 0) {
    const { error } = await supabase.from('noticias_registro').insert(registro)
    if (error) console.error('news/import: no se pudo escribir el registro:', error.message)
  }

  return json({ lote, resultados }, 200)
}

/**
 * Id de la noticia que ya ocupa esa URL. La base guarda la forma normalizada
 * (noticias_normalizar_url) y la unicidad no distingue http/https ni www, así
 * que se normaliza con la misma función y se buscan sus variantes.
 */
async function buscarExistente(
  supabase: ReturnType<typeof createServiceClient>,
  url: string,
): Promise<string | null> {
  const { data: normalizada } = await supabase.rpc('noticias_normalizar_url', { p_url: url })
  if (typeof normalizada !== 'string') return null

  const { data } = await supabase
    .from('noticias')
    .select('id')
    .in('url_original', variantesDeUrl(normalizada))
    .limit(1)
    .maybeSingle()

  return data?.id ?? null
}
