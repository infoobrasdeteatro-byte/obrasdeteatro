import { NextRequest, NextResponse } from 'next/server'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ ok: false })

  const { email, nombre } = await req.json()
  if (!email) return NextResponse.json({ ok: false })

  const safeNombre = escapeHtml(nombre || email.split('@')[0])

  const html = `<!DOCTYPE html>
<html lang="es" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f6">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!--[if mso]><table width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

          <!-- CABECERA -->
          <tr>
            <td bgcolor="#0a0a0a" style="padding:28px 40px;background-color:#0a0a0a;">
              <p style="font-family:Georgia,serif;font-size:11px;color:#c9a84c;letter-spacing:3px;text-transform:uppercase;margin:0;padding:0;">
                OBRASDETEATRO.COM
              </p>
            </td>
          </tr>

          <!-- CUERPO -->
          <tr>
            <td bgcolor="#ffffff" style="padding:40px 40px 36px;background-color:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">

              <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#111827;margin:0 0 16px;padding:0;line-height:1.3;">
                Bienvenido/a, ${safeNombre}.
              </h1>

              <p style="font-family:Georgia,serif;font-size:15px;color:#374151;line-height:1.75;margin:0 0 32px;padding:0;">
                Ya formas parte del ecosistema digital del teatro en espa&ntilde;ol &mdash;
                la plataforma de referencia para profesionales de los 20 pa&iacute;ses de habla hispana.
              </p>

              <!-- BOTON PRINCIPAL -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
                <tr>
                  <td bgcolor="#0a0a0a" style="background-color:#0a0a0a;padding:14px 32px;">
                    <a href="https://www.obrasdeteatro.com/perfil"
                       style="font-family:Georgia,serif;font-size:13px;color:#ffffff;text-decoration:none;font-weight:bold;letter-spacing:1px;display:inline-block;">
                      COMPLETAR PERFIL PROFESIONAL
                    </a>
                  </td>
                </tr>
              </table>

              <!-- ACCESOS RAPIDOS -->
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1px;color:#9ca3af;text-transform:uppercase;margin:0 0 12px;padding:0;">
                Tambi&eacute;n puedes
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                    <a href="https://www.obrasdeteatro.com/dashboard"
                       style="font-family:Georgia,serif;font-size:14px;color:#111827;text-decoration:none;">
                      &rarr; Acceder a tu panel de control
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                    <a href="https://www.obrasdeteatro.com/directorio"
                       style="font-family:Georgia,serif;font-size:14px;color:#111827;text-decoration:none;">
                      &rarr; Explorar el directorio de profesionales
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">
                    <a href="https://www.obrasdeteatro.com/precios"
                       style="font-family:Georgia,serif;font-size:14px;color:#111827;text-decoration:none;">
                      &rarr; Ver planes y precios
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- PIE LEGAL -->
          <tr>
            <td bgcolor="#f9fafb" style="padding:20px 40px;background-color:#f9fafb;border:1px solid #e5e7eb;border-top:none;">
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b7280;margin:0;padding:0;line-height:1.6;">
                &copy; ObrasDeTeatro&reg; &middot;
                <a href="https://www.obrasdeteatro.com" style="color:#6b7280;text-decoration:none;">www.obrasdeteatro.com</a>
              </p>
            </td>
          </tr>

        </table>
        <!--[if mso]></td></tr></table><![endif]-->

      </td>
    </tr>
  </table>

</body>
</html>`

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ObrasDeTeatro® <hola@obrasdeteatro.com>',
        to: email,
        subject: 'Bienvenido/a a ObrasDeTeatro®',
        html,
      }),
    })
  } catch {
    // Fail silently - welcome email is non-critical
  }

  return NextResponse.json({ ok: true })
}
