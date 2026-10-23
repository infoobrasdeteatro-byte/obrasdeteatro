import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { BUCKET_GALERIA, analizarVideo, esPlanDePago, portadaValida, urlPublica } from '@/lib/perfil-multimedia/multimedia'
import {
  ALCANCE_LABEL, DISPONIBILIDAD_LABEL, TIPO_EXPERIENCIA_LABEL, TIPO_PERFIL_LABEL, enlaceSeguro, periodo, redesDe,
} from './formato'
import { nombreProfesion } from '@/lib/perfiles/profesiones'

/**
 * Bloque 8: todo lo que va al CV y al dossier, leído con la SESIÓN del propio
 * usuario (la RLS le deja leer lo suyo). Nada de otros perfiles: la ruta solo
 * genera el documento de quien lo pide.
 */

type Cliente = SupabaseClient<Database>

export type Entrada = { titulo: string; detalle: string | null; periodo: string; descripcion: string | null; etiqueta?: string | null }

export type DatosDocumento = {
  profileId: string
  plan: string
  nombre: string
  nombreCompleto: string
  tipo: string
  bio: string
  ubicacion: string
  email: string | null
  telefono: string | null
  web: string | null
  perfilUrl: string | null
  redes: { red: string; url: string }[]
  especialidades: string[]
  especialidadPrincipal: string | null
  experiencia: Entrada[]
  formacion: Entrada[]
  premios: Entrada[]
  disponibilidad: string | null
  avatarUrl: string | null
  portadaUrl: string | null
  fotos: { url: string; pie: string | null; credito: string | null }[]
  videos: { titulo: string | null; url: string }[]
  proyectos: { titulo: string; anio: number | null; rol: string | null; compania: string | null; descripcion: string | null; imagenUrl: string | null; enlace: string | null }[]
}

const SITIO = 'https://www.obrasdeteatro.com'

/**
 * `emailCuenta`: el correo de la cuenta (auth). profiles.email ya no se puede
 * leer con la sesión; el CV usa el correo de contacto del bloque 6 y, si no
 * hay, el de la cuenta. El teléfono sale del bloque 6 (perfil_contacto).
 */
export async function cargarDatosDocumento(supabase: Cliente, profileId: string, emailCuenta: string | null = null): Promise<DatosDocumento | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const [{ data: p }, { data: contacto }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nombre, apellidos, nombre_artistico, tipo_perfil, bio, avatar_url, cover_url, ciudad, pais, website_url, social_links, slug, plan, perfil_publico, verificado')
      .eq('id', profileId)
      .single(),
    supabase.from('perfil_contacto').select('email, telefono').eq('profile_id', profileId).maybeSingle(),
  ])
  if (!p) return null

  const [esp, exp, form, prem, disp, fotos, videos, proyectos] = await Promise.all([
    supabase.from('profile_specialties').select('specialty, is_primary').eq('profile_id', profileId)
      .order('is_primary', { ascending: false }).order('specialty', { ascending: true }),
    supabase.from('professional_experience').select('tipo, titulo, organizacion, fecha_inicio, fecha_fin, en_curso, descripcion').eq('profile_id', profileId)
      .order('en_curso', { ascending: false }).order('fecha_inicio', { ascending: false, nullsFirst: false }),
    supabase.from('profile_training').select('titulo, institucion, fecha_inicio, fecha_fin, en_curso, descripcion').eq('profile_id', profileId)
      .order('en_curso', { ascending: false }).order('fecha_inicio', { ascending: false, nullsFirst: false }),
    supabase.from('profile_awards').select('nombre, entidad, anio, descripcion').eq('profile_id', profileId)
      .order('anio', { ascending: false, nullsFirst: false }),
    supabase.from('profile_availability').select('estado, alcance').eq('profile_id', profileId).maybeSingle(),
    supabase.from('perfil_galeria_fotos').select('ruta, pie, credito').eq('profile_id', profileId).order('orden', { ascending: true }).limit(12),
    supabase.from('perfil_galeria_videos').select('url, titulo').eq('profile_id', profileId).order('orden', { ascending: true }).limit(10),
    supabase.from('perfil_portfolio').select('titulo, anio, rol, compania, descripcion, imagen_ruta, enlace').eq('profile_id', profileId).order('orden', { ascending: true }).limit(12),
  ])

  const conPlan = esPlanDePago(p.plan)
  const nombreCompleto = [p.nombre, p.apellidos].filter(Boolean).join(' ').trim()
  const especialidades = (esp.data ?? []).map(e => nombreProfesion(e.specialty) ?? e.specialty)
  const d = disp.data
  const disponibilidad = d
    ? [DISPONIBILIDAD_LABEL[d.estado] ?? null, ALCANCE_LABEL[d.alcance] ?? null].filter(Boolean).join(' · ') || null
    : null

  return {
    profileId: p.id,
    plan: p.plan,
    nombre: p.nombre_artistico?.trim() || nombreCompleto || p.nombre,
    nombreCompleto,
    tipo: TIPO_PERFIL_LABEL[p.tipo_perfil] ?? p.tipo_perfil,
    bio: p.bio?.trim() ?? '',
    ubicacion: [p.ciudad, p.pais].filter(Boolean).join(', '),
    email: contacto?.email?.trim() || emailCuenta || null,
    telefono: contacto?.telefono?.trim() || null,
    web: enlaceSeguro(p.website_url),
    // Solo si el perfil es visible para el público: un enlace que da 404 no sirve en un CV.
    perfilUrl: p.slug && p.perfil_publico && p.verificado ? `${SITIO}/perfil/${p.slug}` : null,
    redes: redesDe(p.social_links),
    especialidades,
    especialidadPrincipal: (() => {
      const principal = (esp.data ?? []).find(e => e.is_primary)?.specialty
      return principal ? (nombreProfesion(principal) ?? principal) : null
    })(),
    experiencia: (exp.data ?? []).map(e => ({
      titulo: e.titulo, detalle: e.organizacion, periodo: periodo(e.fecha_inicio, e.fecha_fin, e.en_curso),
      descripcion: e.descripcion, etiqueta: TIPO_EXPERIENCIA_LABEL[e.tipo] ?? null,
    })),
    formacion: (form.data ?? []).map(f => ({
      titulo: f.titulo, detalle: f.institucion, periodo: periodo(f.fecha_inicio, f.fecha_fin, f.en_curso), descripcion: f.descripcion,
    })),
    premios: (prem.data ?? []).map(a => ({
      titulo: a.nombre, detalle: a.entidad, periodo: a.anio ? String(a.anio) : '', descripcion: a.descripcion,
    })),
    disponibilidad,
    avatarUrl: p.avatar_url,
    // Material audiovisual: solo con plan de pago, como en el perfil público.
    portadaUrl: conPlan ? portadaValida(p.cover_url, supabaseUrl, p.id) : null,
    fotos: conPlan ? (fotos.data ?? []).map(f => ({ url: urlPublica(supabaseUrl, BUCKET_GALERIA, f.ruta), pie: f.pie, credito: f.credito })) : [],
    videos: conPlan ? (videos.data ?? []).flatMap(v => (analizarVideo(v.url) ? [{ titulo: v.titulo, url: v.url.trim() }] : [])) : [],
    proyectos: conPlan ? (proyectos.data ?? []).map(x => ({
      titulo: x.titulo, anio: x.anio, rol: x.rol, compania: x.compania, descripcion: x.descripcion,
      imagenUrl: x.imagen_ruta ? urlPublica(supabaseUrl, BUCKET_GALERIA, x.imagen_ruta) : null, enlace: enlaceSeguro(x.enlace),
    })) : [],
  }
}
