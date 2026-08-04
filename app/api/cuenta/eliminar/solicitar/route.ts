import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * AEC-003B Fase 2: registra el inicio del estado "Cuenta Activa con
 * Extinción Programada" (DA-004). No toca ningún plano -- solo la marca de
 * tiempo de solicitud. Idempotente: si ya estaba solicitada, no la repite.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, code: 'unauthenticated' }, { status: 401 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ extincion_solicitada_at: new Date().toISOString() })
    .eq('id', user.id)
    .is('extincion_solicitada_at', null)

  if (error) {
    return NextResponse.json({ ok: false, code: 'update_failed' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
