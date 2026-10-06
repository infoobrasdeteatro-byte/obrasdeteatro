import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/service'
import {
  MAX_BYTES_CUERPO,
  claveDeUrl,
  estaVencida,
  finDelDiaEnMadrid,
  urlDeEntrada,
  validarConvocatoria,
  validarSobre,
} from '@/lib/convocatorias/importacion'

/**
 * POST /api/convocatorias/import — convocatorias candidatas desde Make.
 *
 * Mismo patrón que /api/news/import: Make no tiene acceso a Supabase y envía
 * aquí, una vez al día, las convocatorias que OpenAI extrajo de fuentes
 * públicas. Esta ruta las guarda con la clave de servicio a nombre del perfil
 * de la Redacción, con origen 'redaccion', para que un moderador las revise
 * en /admin/convocatorias.
 *
 * AUTENTICACIÓN. Cabecera x-convocatorias-secret frente a
 * CONVOCATORIAS_IMPORT_SECRET, comparadas con timingSafeEqual sobre su
 * SHA-256. Sin la variable, o con un secreto distinto: 401 sin más detalle.
 * El secreto nunca viaja en la URL, nunca se devuelve y nunca se registra.
 *
 * QUÉ NO DECIDE ESTA RUTA. El estado: se pide 'pendiente_revision', pero
 * aunque se pidiera otro, el trigger calls_sync_estado() mete en revisión
 * toda inserción de la Redacción y vuelve a exigir bases, entidad, país y
 * fecha futura. La publicación es siempre de una persona.
 *
 * RESPUESTA. 200 con un resultado por convocatoria (creada | duplicada |
 * vencida | invalida) si el lote se pudo procesar; 400 si el cuerpo no es
 * JSON o el sobre no es válido (sin lote, sin convocatorias o más de 10); 413
 * si pasa de 64 KB; 500 si falta el perfil de la Redacción.
 */

type Resultado = {
  url_bases: string | null
  resultado: 'creada' | 'duplicada' | 'vencida' | 'invalida'
  id?: string
  motivo?: string
}

const INDICE_DUPLICADOS = 'calls_url_bases_redaccion_unica'

function secretoValido(recibido: string | null): boolean {
  const esperado = process.env.CONVOCATORIAS_IMPORT_SECRET
  if (!esperado || !recibido) return false
  const a = createHash('sha256').update(recibido, 'utf8').digest()
  const b = createHash('sha256').update(esperado, 'utf8').digest()
  return timingSafeEqual(a, b)
}

const json = (cuerpo: unknown, status: number) => NextResponse.json(cuerpo, { status })

export async function POST(req: NextRequest) {
  if (!secretoValido(req.headers.get('x-convocatorias-secret'))) {
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

  // El autor de todas: el perfil de la Redacción, por su slug.
  const { data: redaccion, error: errorPerfil } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug', 'redaccion')
    .is('deleted_at', null)
    .maybeSingle()

  if (errorPerfil || !redaccion) {
    console.error('convocatorias/import: no se encontró el perfil de la Redacción:', errorPerfil?.message ?? 'sin fila')
    return json({ error: 'Error interno' }, 500)
  }

  const resultados: Resultado[] = []

  for (const item of sobre.convocatorias) {
    const url = urlDeEntrada(item)
    const validada = validarConvocatoria(item)

    if (!validada.ok) {
      resultados.push({ url_bases: url, resultado: 'invalida', motivo: validada.motivo })
      continue
    }
    const c = validada.convocatoria

    if (estaVencida(c.fecha_limite)) {
      resultados.push({ url_bases: url, resultado: 'vencida', motivo: 'fecha_limite: es hoy o ya ha pasado (hora de Madrid).' })
      continue
    }

    const { data: creada, error } = await supabase
      .from('calls')
      .insert({
        profile_id: redaccion.id,
        origen: 'redaccion',
        estado: 'pendiente_revision',
        title: c.titulo,
        description: c.resumen,
        category: c.categoria,
        pais_code: c.pais_code,
        ciudad: c.ciudad,
        entidad_convocante: c.entidad_convocante,
        deadline: finDelDiaEnMadrid(c.fecha_limite),
        prize: c.dotacion,
        url_bases: c.url_bases,
        fuente_dominio: c.fuente_dominio,
        lote,
      })
      .select('id')
      .single()

    if (creada) {
      resultados.push({ url_bases: url, resultado: 'creada', id: creada.id })
      continue
    }

    if (error?.code === '23505' && `${error.message} ${error.details ?? ''}`.includes(INDICE_DUPLICADOS)) {
      const existente = await buscarExistente(supabase, c.url_bases)
      resultados.push({ url_bases: url, resultado: 'duplicada', ...(existente ? { id: existente } : {}) })
      continue
    }

    console.error('convocatorias/import: no se pudo insertar una convocatoria:', error?.code, error?.message)
    resultados.push({ url_bases: url, resultado: 'invalida', motivo: 'No se pudo guardar la convocatoria.' })
  }

  return json({ lote, resultados }, 200)
}

/**
 * Id de la convocatoria de la Redacción que ya ocupa esas bases. Se normaliza
 * con la misma función que usa el trigger para url_bases_normalizada.
 */
async function buscarExistente(
  supabase: ReturnType<typeof createServiceClient>,
  url: string,
): Promise<string | null> {
  const { data: normalizada } = await supabase.rpc('noticias_normalizar_url', { p_url: url })
  if (typeof normalizada !== 'string') return null

  const { data } = await supabase
    .from('calls')
    .select('id')
    .eq('origen', 'redaccion')
    .eq('url_bases_normalizada', claveDeUrl(normalizada))
    .limit(1)
    .maybeSingle()

  return data?.id ?? null
}
