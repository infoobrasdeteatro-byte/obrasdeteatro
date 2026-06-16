import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  const supabase = await createClient()

  // PKCE flow: Supabase sends a code to exchange for a session
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/auth/update-password`)
    }
  }

  // Email OTP flow: Supabase sends token_hash + type directly
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      return NextResponse.redirect(`${origin}/auth/update-password`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_error`)
}
