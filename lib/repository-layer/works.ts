import { createClient } from '@/lib/supabase/server'
import { withCache } from '@/lib/verified/sistemas-cache'
import type { Work } from './types'

const WORK_COLUMNS = 'id, title, subtitle, author, genre, synopsis, language, year, slug'
const CACHE_TTL_MS = 60_000

function toWork(row: {
  id: string
  title: string
  subtitle: string | null
  author: string | null
  genre: string | null
  synopsis: string | null
  language: string | null
  year: number | null
  slug: string | null
}): Work {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    author: row.author,
    genre: row.genre,
    synopsis: row.synopsis,
    language: row.language,
    year: row.year,
    slug: row.slug,
  }
}

export async function getPublishedWorkById(workId: string): Promise<Work | null> {
  return withCache(`work:${workId}`, CACHE_TTL_MS, async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('works')
      .select(WORK_COLUMNS)
      .eq('id', workId)
      .eq('is_published', true)
      .is('deleted_at', null)
      .single()

    if (error || !data) return null

    return toWork(data)
  })
}

export async function listPublishedWorks(limit = 20): Promise<Work[]> {
  return withCache(`works:published:${limit}`, CACHE_TTL_MS, async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('works')
      .select(WORK_COLUMNS)
      .eq('is_published', true)
      .is('deleted_at', null)
      .limit(limit)

    if (error || !data) return []

    return data.map(toWork)
  })
}
