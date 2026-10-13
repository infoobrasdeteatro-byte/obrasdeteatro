import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { importarPrograma } from '@/lib/mediateca/importar'

/**
 * GET /api/cron/mediateca: importación diaria de episodios.
 *
 * Lo llama el cron de Vercel una vez al día (vercel.json) con
 * `Authorization: Bearer <CRON_SECRET>`. Recorre los programas activos y,
 * para cada uno, lee su RSS de YouTube y su RSS de podcast. Un programa que
 * falla no detiene a los demás: su error queda en ultimo_error, visible en
 * /admin/mediateca.
 */

export const maxDuration = 60

function autorizado(cabecera: string | null): boolean {
  const secreto = process.env.CRON_SECRET
  if (!secreto || !cabecera) return false
  const a = createHash('sha256').update(cabecera, 'utf8').digest()
  const b = createHash('sha256').update(`Bearer ${secreto}`, 'utf8').digest()
  return timingSafeEqual(a, b)
}

export async function GET(req: NextRequest) {
  if (!autorizado(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data: programas, error } = await supabase
    .from('mediateca_programas')
    .select('id, nombre, youtube_channel_id, rss_url, imagen_url')
    .eq('activo', true)
    .order('orden', { ascending: true })

  if (error) {
    console.error('cron/mediateca: no se pudieron leer los programas:', error.message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }

  const resultados = []
  for (const p of programas ?? []) resultados.push(await importarPrograma(supabase, p))
  return NextResponse.json({ programas: resultados.length, resultados })
}
