import { createClient } from '@/lib/supabase/server'
import type { OrganizationalProfileData } from './types'

type OrganizationalProfileType = 'compania' | 'productora' | 'teatro' | 'festival' | 'escuela'
// Los valores coinciden literalmente con ORGANIZATIONAL_PROFILE_TYPES de
// profile-classification.ts, fuente de verdad unica de la clasificacion.

const TABLE_BY_TYPE = {
  compania: 'perfil_compania',
  productora: 'perfil_productora',
  teatro: 'perfil_teatro',
  festival: 'perfil_festival',
  escuela: 'perfil_escuela',
} as const

const COLUMNS_BY_TYPE: Record<OrganizationalProfileType, string> = {
  compania:
    'nombre_compania, nombre_comercial, anio_fundacion, descripcion, historia, mision, vision, valores, ' +
    'num_producciones, num_integrantes, tipo_clasico, tipo_contemporaneo, tipo_musical, tipo_infantil, ' +
    'tipo_experimental, tipo_comunitario, tipo_profesional, tipo_amateur, serv_contratacion, serv_coproducciones, ' +
    'serv_giras, serv_formacion, serv_internacional, responsable_nombre, responsable_cargo, responsable_email, ' +
    'responsable_telefono, logo, web, email_corporativo, telefono, whatsapp, instagram, facebook, tiktok, ' +
    'linkedin, youtube, mostrar_contacto, mostrar_responsable',
  productora:
    'nombre_productora, nombre_comercial, anio_fundacion, descripcion, historia, num_producciones, ' +
    'num_proyectos_activos, tipo_teatral, tipo_audiovisual, tipo_musical, tipo_eventos, tipo_festivales, ' +
    'tipo_independiente, tipo_distribucion, tipo_gestion_cultural, tipo_coproducciones_int, responsable_nombre, ' +
    'responsable_cargo, responsable_email, responsable_telefono, logo, web, email_corporativo, telefono, ' +
    'whatsapp, instagram, facebook, tiktok, linkedin, youtube, mostrar_contacto',
  teatro:
    'nombre_teatro, nombre_comercial, anio_fundacion, descripcion, historia, capacidad_total, num_salas, ' +
    'accesibilidad_pmr, accesibilidad_ascensor, accesibilidad_bucle, disponible_alquiler, disponible_ensayos, ' +
    'responsable_nombre, responsable_cargo, responsable_email, responsable_telefono, logo, web, email_oficial, ' +
    'telefono, whatsapp, instagram, facebook, tiktok, linkedin, youtube, mostrar_contacto',
  festival:
    'nombre_festival, nombre_comercial, anio_fundacion, descripcion, historia, tipo_clasico, tipo_contemporaneo, ' +
    'tipo_musical, tipo_infantil, tipo_experimental, tipo_multidisciplinar, num_asistentes, num_companias, ' +
    'publica_convocatorias, acepta_postulaciones, ofrece_residencias, concede_premios, responsable_nombre, ' +
    'responsable_cargo, responsable_email, responsable_telefono, logo, web, email_oficial, telefono, whatsapp, ' +
    'instagram, facebook, tiktok, linkedin, youtube, mostrar_contacto',
  escuela:
    'nombre_escuela, nombre_comercial, anio_fundacion, descripcion, historia, form_interpretacion, ' +
    'form_direccion, form_dramaturgia, form_musical, form_danza, form_voz, form_improvisacion, form_produccion, ' +
    'form_gestion_cultural, num_estudiantes, ofrece_becas, ofrece_ayudas, ofrece_residencias, ofrece_practicas, ' +
    'responsable_nombre, responsable_cargo, responsable_email, responsable_telefono, logo, web, email_oficial, ' +
    'telefono, whatsapp, instagram, facebook, tiktok, linkedin, youtube, mostrar_contacto',
}

/** Etiquetas activas (columnas booleanas en `true`). */
function activeLabels(row: Record<string, unknown>, flagLabels: [string, string][]): string[] {
  return flagLabels.filter(([column]) => row[column] === true).map(([, label]) => label)
}

function socialLinks(row: Record<string, unknown>, visible: boolean): Record<string, string> | null {
  if (!visible) return null
  const entries = (['instagram', 'facebook', 'tiktok', 'linkedin', 'youtube'] as const)
    .filter((key) => typeof row[key] === 'string' && (row[key] as string).length > 0)
    .map((key) => [key, row[key] as string] as const)
  return entries.length > 0 ? Object.fromEntries(entries) : null
}

/** Contacto directo (email/telefono/whatsapp/redes) de las 5 tablas organizacionales, gobernado por `mostrar_contacto` -- unico flag de consentimiento de contacto disponible en su esquema. */
function contactFields(row: Record<string, unknown>, emailColumn: string) {
  const visible = row.mostrar_contacto === true
  return {
    contactEmail: visible ? ((row[emailColumn] as string) ?? null) : null,
    contactPhone: visible ? ((row.telefono as string) ?? null) : null,
    whatsapp: visible ? ((row.whatsapp as string) ?? null) : null,
    socialLinks: socialLinks(row, visible),
  }
}

function toCompaniaProfile(row: Record<string, unknown>): OrganizationalProfileData {
  return {
    name: row.nombre_compania as string,
    commercialName: (row.nombre_comercial as string) ?? null,
    foundingYear: (row.anio_fundacion as number) ?? null,
    description: (row.descripcion as string) ?? null,
    history: (row.historia as string) ?? null,
    activityCategories: activeLabels(row, [
      ['tipo_clasico', 'clasico'],
      ['tipo_contemporaneo', 'contemporaneo'],
      ['tipo_musical', 'musical'],
      ['tipo_infantil', 'infantil'],
      ['tipo_experimental', 'experimental'],
      ['tipo_comunitario', 'comunitario'],
      ['tipo_profesional', 'profesional'],
      ['tipo_amateur', 'amateur'],
    ]),
    services: activeLabels(row, [
      ['serv_contratacion', 'contratacion'],
      ['serv_coproducciones', 'coproducciones'],
      ['serv_giras', 'giras'],
      ['serv_formacion', 'formacion'],
      ['serv_internacional', 'internacional'],
    ]),
    activityCounters: {
      producciones: (row.num_producciones as number) ?? 0,
      integrantes: (row.num_integrantes as number) ?? 0,
    },
    logoUrl: (row.logo as string) ?? null,
    website: (row.web as string) ?? null,
    ...contactFields(row, 'email_corporativo'),
    responsibleContact:
      row.mostrar_responsable === true
        ? {
            name: row.responsable_nombre as string,
            role: row.responsable_cargo as string,
            email: row.responsable_email as string,
            phone: (row.responsable_telefono as string) ?? null,
          }
        : null,
  }
}

function toProductoraProfile(row: Record<string, unknown>): OrganizationalProfileData {
  return {
    name: row.nombre_productora as string,
    commercialName: (row.nombre_comercial as string) ?? null,
    foundingYear: (row.anio_fundacion as number) ?? null,
    description: (row.descripcion as string) ?? null,
    history: (row.historia as string) ?? null,
    activityCategories: activeLabels(row, [
      ['tipo_teatral', 'teatral'],
      ['tipo_audiovisual', 'audiovisual'],
      ['tipo_musical', 'musical'],
      ['tipo_eventos', 'eventos'],
      ['tipo_festivales', 'festivales'],
      ['tipo_independiente', 'independiente'],
      ['tipo_distribucion', 'distribucion'],
      ['tipo_gestion_cultural', 'gestion_cultural'],
      ['tipo_coproducciones_int', 'coproducciones_internacionales'],
    ]),
    services: [],
    activityCounters: {
      producciones: (row.num_producciones as number) ?? 0,
      proyectosActivos: (row.num_proyectos_activos as number) ?? 0,
    },
    logoUrl: (row.logo as string) ?? null,
    website: (row.web as string) ?? null,
    ...contactFields(row, 'email_corporativo'),
    // Sin mostrar_responsable en esta tabla -- fuera del alcance del contrato vigente (Plan Tecnico, S3.2).
    responsibleContact: null,
  }
}

function toTeatroProfile(row: Record<string, unknown>): OrganizationalProfileData {
  return {
    name: row.nombre_teatro as string,
    commercialName: (row.nombre_comercial as string) ?? null,
    foundingYear: (row.anio_fundacion as number) ?? null,
    description: (row.descripcion as string) ?? null,
    history: (row.historia as string) ?? null,
    activityCategories: [],
    services: [],
    activityCounters: {
      capacidadTotal: (row.capacidad_total as number) ?? 0,
      salas: (row.num_salas as number) ?? 0,
    },
    logoUrl: (row.logo as string) ?? null,
    website: (row.web as string) ?? null,
    ...contactFields(row, 'email_oficial'),
    responsibleContact: null,
  }
}

function toFestivalProfile(row: Record<string, unknown>): OrganizationalProfileData {
  return {
    name: row.nombre_festival as string,
    commercialName: (row.nombre_comercial as string) ?? null,
    foundingYear: (row.anio_fundacion as number) ?? null,
    description: (row.descripcion as string) ?? null,
    history: (row.historia as string) ?? null,
    activityCategories: activeLabels(row, [
      ['tipo_clasico', 'clasico'],
      ['tipo_contemporaneo', 'contemporaneo'],
      ['tipo_musical', 'musical'],
      ['tipo_infantil', 'infantil'],
      ['tipo_experimental', 'experimental'],
      ['tipo_multidisciplinar', 'multidisciplinar'],
    ]),
    services: activeLabels(row, [
      ['publica_convocatorias', 'convocatorias'],
      ['acepta_postulaciones', 'postulaciones'],
      ['ofrece_residencias', 'residencias'],
      ['concede_premios', 'premios'],
    ]),
    activityCounters: {
      asistentes: (row.num_asistentes as number) ?? 0,
      companias: (row.num_companias as number) ?? 0,
    },
    logoUrl: (row.logo as string) ?? null,
    website: (row.web as string) ?? null,
    ...contactFields(row, 'email_oficial'),
    responsibleContact: null,
  }
}

function toEscuelaProfile(row: Record<string, unknown>): OrganizationalProfileData {
  return {
    name: row.nombre_escuela as string,
    commercialName: (row.nombre_comercial as string) ?? null,
    foundingYear: (row.anio_fundacion as number) ?? null,
    description: (row.descripcion as string) ?? null,
    history: (row.historia as string) ?? null,
    activityCategories: activeLabels(row, [
      ['form_interpretacion', 'interpretacion'],
      ['form_direccion', 'direccion'],
      ['form_dramaturgia', 'dramaturgia'],
      ['form_musical', 'musical'],
      ['form_danza', 'danza'],
      ['form_voz', 'voz'],
      ['form_improvisacion', 'improvisacion'],
      ['form_produccion', 'produccion'],
      ['form_gestion_cultural', 'gestion_cultural'],
    ]),
    services: activeLabels(row, [
      ['ofrece_becas', 'becas'],
      ['ofrece_ayudas', 'ayudas'],
      ['ofrece_residencias', 'residencias'],
      ['ofrece_practicas', 'practicas'],
    ]),
    activityCounters: {
      estudiantes: (row.num_estudiantes as number) ?? 0,
    },
    logoUrl: (row.logo as string) ?? null,
    website: (row.web as string) ?? null,
    ...contactFields(row, 'email_oficial'),
    responsibleContact: null,
  }
}

const MAPPER_BY_TYPE: Record<OrganizationalProfileType, (row: Record<string, unknown>) => OrganizationalProfileData> = {
  compania: toCompaniaProfile,
  productora: toProductoraProfile,
  teatro: toTeatroProfile,
  festival: toFestivalProfile,
  escuela: toEscuelaProfile,
}

export async function getOrganizationalProfileData(
  userId: string,
  profileType: string
): Promise<OrganizationalProfileData | null> {
  if (
    profileType !== 'compania' &&
    profileType !== 'productora' &&
    profileType !== 'teatro' &&
    profileType !== 'festival' &&
    profileType !== 'escuela'
  ) {
    return null
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from(TABLE_BY_TYPE[profileType])
    .select(COLUMNS_BY_TYPE[profileType])
    .eq('user_id', userId)
    .single()

  if (error || !data) return null

  return MAPPER_BY_TYPE[profileType](data as unknown as Record<string, unknown>)
}
