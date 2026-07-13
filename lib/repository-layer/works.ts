import { createClient } from '@/lib/supabase/server'
import type { Work } from './types'

const WORK_COLUMNS = 'id, title, subtitle, author, genre, synopsis, language, year, slug'

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
}

export async function listPublishedWorks(limit = 20): Promise<Work[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('works')
    .select(WORK_COLUMNS)
    .eq('is_published', true)
    .is('deleted_at', null)
    .limit(limit)

  if (error || !data) return []

  return data.map(toWork)
}
