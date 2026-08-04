import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { verificarCondicionesPrevias } from '@/lib/cuenta/verificar-condiciones-previas'
import { verificarReautenticacion } from '@/lib/cuenta/verificar-reautenticacion'
import { cancelarSuscripcionStripe } from '@/lib/cuenta/cancelar-suscripcion-stripe'

/**
 * AEC-003B Fase 6 -- Evento Arquitectónico Atómico (DA-006).
 *
 * Orquestador puro: no reimplementa ninguna lógica ya propiedad de una fase
 * anterior. Cada suboperación delega en la función que ya la implementó:
 *   - Fase 3 (verificarCondicionesPrevias) -- condiciones técnicas de DA-005
 *   - Fase 4 (verificarReautenticacion)    -- identidad
 *   - Fase 5 (cancelarSuscripcionStripe)   -- Principio de Integridad Externa
 *   - Fase 1 (extinguish_personal_identity)-- extinción del Plano 2
 *
 * El único código nuevo de esta fase es la coordinación y la extinción del
 * Plano 1 (banned_until), que no tenía dueño previo.
 */

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ~100 años -- extinción permanente del Plano 1 en términos prácticos,
// sin depender de un valor "infinito" no soportado por el tipo de dato.
const BAN_DURATION_PERMANENTE = '876000h'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.json({ ok: false, code: 'unauthenticated' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('extincion_solicitada_at, identidad_extinguida_at')
    .eq('id', user.id)
    .single()

  // Idempotencia a nivel de orquestador: si el evento ya se completó antes
  // (doble envío, reintento tras una respuesta perdida), no se repite nada.
  if (profile?.identidad_extinguida_at) {
    return NextResponse.json({ ok: true, estado: 'ya_extinguida' })
  }

  if (!profile?.extincion_solicitada_at) {
    return NextResponse.json({ ok: false, code: 'no_hay_solicitud' }, { status: 400 })
  }

  const { password, consentimiento } = await req.json()

  if (consentimiento !== true) {
    return NextResponse.json({ ok: false, code: 'consentimiento_no_otorgado' }, { status: 400 })
  }

  const reautenticado = await verificarReautenticacion(user.email, password)
  if (!reautenticado) {
    return NextResponse.json({ ok: false, code: 'reautenticacion_fallida' }, { status: 400 })
  }

  console.log('[AEC-003B Fase 6] Identidad y consentimiento verificados, resolviendo condiciones externas', { profileId: user.id })

  // Resolución activa del Principio de Integridad Externa (DA-005) --
  // cancela realmente la suscripción de Stripe si existe. Reutiliza la
  // Fase 5 sin modificarla; es en sí misma idempotente.
  const resultadoStripe = await cancelarSuscripcionStripe(user.id)
  if (!resultadoStripe.ok) {
    console.error('[AEC-003B Fase 6] Evento no iniciado -- no se pudo resolver Stripe', { profileId: user.id, resultadoStripe })
    return NextResponse.json({ ok: false, code: 'error_stripe', detalle: resultadoStripe.detalle }, { status: 502 })
  }

  // Verificación final de condiciones previas, repetida en el instante del
  // disparo (DA-006, Fase A) -- ya con Stripe resuelto, cubre lo que no se
  // resuelve automáticamente (credit_reservations, condición candidata).
  const diagnostico = await verificarCondicionesPrevias(user.id)
  if (!diagnostico.cumpleTodas) {
    console.error('[AEC-003B Fase 6] Evento no iniciado -- condiciones previas no satisfechas', { profileId: user.id, diagnostico })
    return NextResponse.json({ ok: false, code: 'condiciones_no_cumplidas', diagnostico }, { status: 400 })
  }

  // ── Punto de no retorno declarado (DA-006, Fase B) ──────────────────────
  console.log('[AEC-003B Fase 6] INICIO del Evento Arquitectónico Atómico', { profileId: user.id })

  // A partir de aquí se usa exclusivamente el cliente de servicio: ninguna
  // suboperación posterior debe depender de que la sesión del usuario (Plano
  // 1) siga viva, precisamente porque esta fase va a extinguirla.
  const admin = serviceClient()

  // Suboperación: extinción del Plano 2 (Fase 1, reutilizada sin cambios).
  const { error: errorPlano2 } = await admin.rpc('extinguish_personal_identity', { p_profile_id: user.id })
  if (errorPlano2) {
    console.error('[AEC-003B Fase 6] FALLO tras resolver Stripe -- Plano 2 no extinguido. Reintentable: un nuevo intento retomará desde aquí sin volver a cancelar en Stripe (idempotente).', { profileId: user.id, errorPlano2 })
    return NextResponse.json({ ok: false, code: 'error_plano2' }, { status: 500 })
  }
  console.log('[AEC-003B Fase 6] Plano 2 (Identidad Personal) extinguido', { profileId: user.id })

  // Suboperación: extinción del Plano 1 (autenticación) -- banned_until
  // nativo de Supabase Auth. No se borra ninguna fila; el Ancla permanece.
  const { error: errorPlano1 } = await admin.auth.admin.updateUserById(user.id, {
    ban_duration: BAN_DURATION_PERMANENTE,
  })
  if (errorPlano1) {
    console.error('[AEC-003B Fase 6] FALLO tras extinguir Plano 2 -- Plano 1 no extinguido. Reintentable: un nuevo intento retomará desde aquí (Plano 2 ya extinguido es idempotente).', { profileId: user.id, errorPlano1 })
    return NextResponse.json({ ok: false, code: 'error_plano1' }, { status: 500 })
  }
  console.log('[AEC-003B Fase 6] Plano 1 (Autenticación) extinguido', { profileId: user.id })

  // Nota de diseño, no una suboperación adicional: no existe en la API de
  // administración de Supabase un método para revocar por id de usuario
  // todas las sesiones ya emitidas (auth.admin.signOut exige el JWT de una
  // sesión concreta, no un id de usuario -- verificado contra los tipos de
  // la versión instalada). No se invoca ningún método de firma incorrecta.
  // La extinción es igualmente efectiva en esta aplicación porque
  // middleware.ts y todos los componentes de servidor usan
  // supabase.auth.getUser(), que revalida contra el servidor de Supabase
  // Auth en cada petición -- una cuenta con banned_until activo deja de
  // superar esa validación de inmediato, en la siguiente petición.

  // Suboperación: confirmación del Ancla y transición formal a Identidad
  // Extinguida. Guardado idempotente -- solo si aún no tenía valor.
  const { error: errorFinal } = await admin
    .from('profiles')
    .update({ identidad_extinguida_at: new Date().toISOString() })
    .eq('id', user.id)
    .is('identidad_extinguida_at', null)

  if (errorFinal) {
    console.error('[AEC-003B Fase 6] FALLO al confirmar el estado final -- Planos 1 y 2 ya extinguidos, reintentable de forma segura (ambos pasos son idempotentes).', { profileId: user.id, errorFinal })
    return NextResponse.json({ ok: false, code: 'error_confirmacion_final' }, { status: 500 })
  }

  // ── Fin del Evento Arquitectónico Atómico ───────────────────────────────
  console.log('[AEC-003B Fase 6] FIN del Evento Arquitectónico Atómico -- Identidad Extinguida', { profileId: user.id })

  return NextResponse.json({ ok: true, estado: 'identidad_extinguida' })
}
