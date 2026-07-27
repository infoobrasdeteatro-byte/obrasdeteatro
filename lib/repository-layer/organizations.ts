import { createClient } from '@/lib/supabase/server'
import { withCache } from '@/lib/verified/sistemas-cache'
import type { Organization } from './types'

const ORGANIZATION_COLUMNS = 'id, name, type, country_code, website, slug'
const CACHE_TTL_MS = 60_000

function toOrganization(row: {
  id: string
  name: string
  type: string
  country_code: string | null
  website: string | null
  slug: string
}): Organization {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    countryCode: row.country_code,
    website: row.website,
    slug: row.slug,
  }
}

export async function getPublicOrganizationById(organizationId: string): Promise<Organization | null> {
  return withCache(`org:${organizationId}`, CACHE_TTL_MS, async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('institutions')
      .select(ORGANIZATION_COLUMNS)
      .eq('id', organizationId)
      .eq('is_public', true)
      .eq('is_active', true)
      .single()

    if (error || !data) return null

    return toOrganization(data)
  })
}

export async function listPublicOrganizations(limit = 20): Promise<Organization[]> {
  return withCache(`orgs:public:${limit}`, CACHE_TTL_MS, async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('institutions')
      .select(ORGANIZATION_COLUMNS)
      .eq('is_public', true)
      .eq('is_active', true)
      .limit(limit)

    if (error || !data) return []

    return data.map(toOrganization)
  })
}
