import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * AEC-003B Fase 2: cancela la solicitud, restaurando "Cuenta Activa con
 * Extinción Programada" a "Cuenta Activa". Restricción de DA-004: no debe
 * quedar ningún efecto residual -- esta fase nunca ha tocado ningún otro
 * campo, así que limpiar esta única marca restaura el estado exacto previo.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, code: 'unauthenticated' }, { status: 401 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ extincion_solicitada_at: null })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ ok: false, code: 'update_failed' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
