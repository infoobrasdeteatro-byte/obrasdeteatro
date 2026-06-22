import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ ok: false })

  const { email, nombre } = await req.json()
  if (!email) return NextResponse.json({ ok: false })

  const nombreMostrado = nombre || email.split('@')[0]

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <body style="font-family: Georgia, serif; color: #111; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #fff;">
      <p style="font-size: 22px; font-weight: bold; letter-spacing: 2px; color: #c9a84c; margin-bottom: 32px;">
        OBRASDETEATRO.COM
      </p>
      <p style="font-size: 18px; margin-bottom: 12px;">Bienvenido/a, ${nombreMostrado}.</p>
      <p style="font-size: 15px; color: #444; line-height: 1.7; margin-bottom: 28px;">
        Ya formas parte del ecosistema digital del teatro en español —
        la plataforma de referencia para profesionales de los 20 países de habla hispana.
      </p>

      <p style="font-size: 13px; font-weight: bold; letter-spacing: 1px; color: #888; text-transform: uppercase; margin-bottom: 16px;">
        Empieza ahora
      </p>
      <table cellpadding="0" cellspacing="0" style="margin-bottom: 32px; width: 100%;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            <a href="https://www.obrasdeteatro.com/perfil"
               style="color: #111; text-decoration: none; font-size: 15px; font-weight: bold;">
              → Completar tu perfil profesional
            </a>
            <p style="margin: 4px 0 0; font-size: 13px; color: #888;">
              Añade tu especialidad, bio y ciudad para aparecer en el directorio.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            <a href="https://www.obrasdeteatro.com/dashboard"
               style="color: #111; text-decoration: none; font-size: 15px;">
              → Acceder a tu panel de control
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            <a href="https://www.obrasdeteatro.com/directorio"
               style="color: #111; text-decoration: none; font-size: 15px;">
              → Explorar el directorio de profesionales
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0;">
            <a href="https://www.obrasdeteatro.com/precios"
               style="color: #111; text-decoration: none; font-size: 15px;">
              → Ver planes y precios
            </a>
          </td>
        </tr>
      </table>

      <p style="font-size: 13px; color: #888; border-top: 1px solid #eee; padding-top: 24px;">
        ObrasDeTeatro® — Ecosistema del teatro en español · 20 países
      </p>
    </body>
    </html>
  `

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ObrasDeTeatro® <no-reply@obrasdeteatro.com>',
        to: email,
        subject: 'Bienvenido a ObrasDeTeatro®',
        html,
      }),
    })
  } catch {
    // Fail silently — welcome email is non-critical
  }

  return NextResponse.json({ ok: true })
}
