import { createClient } from '@/lib/supabase/server'
import type { IndividualProfileData } from './types'

type IndividualProfileType = 'actor' | 'director' | 'dramaturgo'
// Los valores coinciden literalmente con INDIVIDUAL_PROFILE_TYPES de
// profile-classification.ts, fuente de verdad unica de la clasificacion.

const TABLE_BY_TYPE = {
  actor: 'perfil_actor',
  director: 'perfil_director',
  dramaturgo: 'perfil_dramaturgo',
} as const

const COLUMNS_BY_TYPE: Record<IndividualProfileType, string> = {
  actor:
    'biografia, experiencia, formacion, premios, habilidad_canto, habilidad_danza, habilidad_improvisacion, ' +
    'habilidad_esgrima, habilidad_musical, habilidad_doblaje, habilidad_presentacion, habilidad_magia, ' +
    'habilidad_circo, otras_habilidades, disp_castings, disp_teatro, disp_cine, disp_television, disp_publicidad, ' +
    'disp_giras, disp_internacional, foto_principal, web, email_profesional, telefono, whatsapp, instagram, ' +
    'facebook, tiktok, linkedin, youtube, mostrar_email, mostrar_telefono, mostrar_whatsapp, mostrar_redes',
  director:
    'biografia, trayectoria, formacion, premios, esp_clasico, esp_contemporaneo, esp_musical, esp_infantil, ' +
    'esp_experimental, esp_opera, esp_zarzuela, esp_performance, esp_comunitario, otras_especialidades, ' +
    'disp_proyectos, disp_coproducciones, disp_festivales, disp_giras, disp_internacional, disp_formacion, ' +
    'foto_principal, web, email_profesional, telefono, whatsapp, instagram, facebook, tiktok, linkedin, youtube, ' +
    'mostrar_email, mostrar_telefono, mostrar_redes',
  dramaturgo:
    'biografia, trayectoria, formacion, premios, esp_comedia, esp_drama, esp_tragedia, esp_musical, esp_infantil, ' +
    'esp_experimental, esp_historico, esp_monologo, esp_microteatro, otras_especialidades, ' +
    'total_obras_escritas, total_obras_estrenadas, total_obras_publicadas, acepta_solicitudes_representacion, ' +
    'acepta_licenciamiento, acepta_publicacion_editorial, acepta_traduccion, acepta_adaptacion_audiovisual, ' +
    'foto_principal, web, email_profesional, telefono, whatsapp, instagram, facebook, tiktok, linkedin, youtube, ' +
    'mostrar_email, mostrar_telefono, mostrar_redes',
}

/** Etiquetas activas (columnas booleanas en `true`) mas, si existe, el texto libre "otras_*" como entrada adicional. */
function activeLabels(row: Record<string, unknown>, flagLabels: [string, string][], freeTextColumn?: string): string[] {
  const labels = flagLabels.filter(([column]) => row[column] === true).map(([, label]) => label)
  const freeText = freeTextColumn ? row[freeTextColumn] : null
  if (typeof freeText === 'string' && freeText.trim().length > 0) labels.push(freeText.trim())
  return labels
}

function socialLinks(row: Record<string, unknown>, visible: boolean): Record<string, string> | null {
  if (!visible) return null
  const entries = (['instagram', 'facebook', 'tiktok', 'linkedin', 'youtube'] as const)
    .filter((key) => typeof row[key] === 'string' && (row[key] as string).length > 0)
    .map((key) => [key, row[key] as string] as const)
  return entries.length > 0 ? Object.fromEntries(entries) : null
}

function toActorProfile(row: Record<string, unknown>): IndividualProfileData {
  return {
    biography: (row.biografia as string) ?? null,
    trajectory: (row.experiencia as string) ?? null,
    training: (row.formacion as string) ?? null,
    awards: (row.premios as string) ?? null,
    specializations: activeLabels(
      row,
      [
        ['habilidad_canto', 'canto'],
        ['habilidad_danza', 'danza'],
        ['habilidad_improvisacion', 'improvisacion'],
        ['habilidad_esgrima', 'esgrima'],
        ['habilidad_musical', 'musical'],
        ['habilidad_doblaje', 'doblaje'],
        ['habilidad_presentacion', 'presentacion'],
        ['habilidad_magia', 'magia'],
        ['habilidad_circo', 'circo'],
      ],
      'otras_habilidades'
    ),
    availability: activeLabels(row, [
      ['disp_castings', 'castings'],
      ['disp_teatro', 'teatro'],
      ['disp_cine', 'cine'],
      ['disp_television', 'television'],
      ['disp_publicidad', 'publicidad'],
      ['disp_giras', 'giras'],
      ['disp_internacional', 'internacional'],
    ]),
    activityCounters: null,
    photoUrl: (row.foto_principal as string) ?? null,
    website: (row.web as string) ?? null,
    contactEmail: row.mostrar_email === true ? ((row.email_profesional as string) ?? null) : null,
    contactPhone: row.mostrar_telefono === true ? ((row.telefono as string) ?? null) : null,
    whatsapp: row.mostrar_whatsapp === true ? ((row.whatsapp as string) ?? null) : null,
    socialLinks: socialLinks(row, row.mostrar_redes === true),
  }
}

function toDirectorProfile(row: Record<string, unknown>): IndividualProfileData {
  return {
    biography: (row.biografia as string) ?? null,
    trajectory: (row.trayectoria as string) ?? null,
    training: (row.formacion as string) ?? null,
    awards: (row.premios as string) ?? null,
    specializations: activeLabels(
      row,
      [
        ['esp_clasico', 'clasico'],
        ['esp_contemporaneo', 'contemporaneo'],
        ['esp_musical', 'musical'],
        ['esp_infantil', 'infantil'],
        ['esp_experimental', 'experimental'],
        ['esp_opera', 'opera'],
        ['esp_zarzuela', 'zarzuela'],
        ['esp_performance', 'performance'],
        ['esp_comunitario', 'comunitario'],
      ],
      'otras_especialidades'
    ),
    availability: activeLabels(row, [
      ['disp_proyectos', 'proyectos'],
      ['disp_coproducciones', 'coproducciones'],
      ['disp_festivales', 'festivales'],
      ['disp_giras', 'giras'],
      ['disp_internacional', 'internacional'],
      ['disp_formacion', 'formacion'],
    ]),
    activityCounters: null,
    photoUrl: (row.foto_principal as string) ?? null,
    website: (row.web as string) ?? null,
    contactEmail: row.mostrar_email === true ? ((row.email_profesional as string) ?? null) : null,
    contactPhone: row.mostrar_telefono === true ? ((row.telefono as string) ?? null) : null,
    // Sin mostrar_whatsapp propio en esta tabla -- fail-closed: nunca se expone.
    whatsapp: null,
    socialLinks: socialLinks(row, row.mostrar_redes === true),
  }
}

function toDramaturgoProfile(row: Record<string, unknown>): IndividualProfileData {
  return {
    biography: (row.biografia as string) ?? null,
    trajectory: (row.trayectoria as string) ?? null,
    training: (row.formacion as string) ?? null,
    awards: (row.premios as string) ?? null,
    specializations: activeLabels(
      row,
      [
        ['esp_comedia', 'comedia'],
        ['esp_drama', 'drama'],
        ['esp_tragedia', 'tragedia'],
        ['esp_musical', 'musical'],
        ['esp_infantil', 'infantil'],
        ['esp_experimental', 'experimental'],
        ['esp_historico', 'historico'],
        ['esp_monologo', 'monologo'],
        ['esp_microteatro', 'microteatro'],
      ],
      'otras_especialidades'
    ),
    availability: activeLabels(row, [
      ['acepta_solicitudes_representacion', 'solicitudes_representacion'],
      ['acepta_licenciamiento', 'licenciamiento'],
      ['acepta_publicacion_editorial', 'publicacion_editorial'],
      ['acepta_traduccion', 'traduccion'],
      ['acepta_adaptacion_audiovisual', 'adaptacion_audiovisual'],
    ]),
    activityCounters: {
      obrasEscritas: (row.total_obras_escritas as number) ?? 0,
      obrasEstrenadas: (row.total_obras_estrenadas as number) ?? 0,
      obrasPublicadas: (row.total_obras_publicadas as number) ?? 0,
    },
    photoUrl: (row.foto_principal as string) ?? null,
    website: (row.web as string) ?? null,
    contactEmail: row.mostrar_email === true ? ((row.email_profesional as string) ?? null) : null,
    contactPhone: row.mostrar_telefono === true ? ((row.telefono as string) ?? null) : null,
    // Sin mostrar_whatsapp propio en esta tabla -- fail-closed: nunca se expone.
    whatsapp: null,
    socialLinks: socialLinks(row, row.mostrar_redes === true),
  }
}

const MAPPER_BY_TYPE: Record<IndividualProfileType, (row: Record<string, unknown>) => IndividualProfileData> = {
  actor: toActorProfile,
  director: toDirectorProfile,
  dramaturgo: toDramaturgoProfile,
}

export async function getIndividualProfileData(
  userId: string,
  profileType: string
): Promise<IndividualProfileData | null> {
  if (profileType !== 'actor' && profileType !== 'director' && profileType !== 'dramaturgo') return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from(TABLE_BY_TYPE[profileType])
    .select(COLUMNS_BY_TYPE[profileType])
    .eq('user_id', userId)
    .single()

  if (error || !data) return null

  return MAPPER_BY_TYPE[profileType](data as unknown as Record<string, unknown>)
}
