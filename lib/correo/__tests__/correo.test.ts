import { describe, it, expect } from 'vitest'
import { firmar, verificarFirma } from '../firma'
import { detectarOrigen, etiquetaDestino, leerDirecciones } from '../direcciones'
import { clasificar } from '../clasificacion'
import { documentoAislado, sanearHtml, CSP_CORREO, SANDBOX_CORREO } from '../html'
import { asuntoRespuesta, enlaceResponder, leerFiltros, queryFiltros, tamano } from '../presentacion'
import { limiteConservacion } from '../conservacion'

// Clave de ejemplo con el formato de Svix/Resend (whsec_ + base64).
const SECRETO = `whsec_${Buffer.from('clave-de-prueba-del-webhook-0123').toString('base64')}`
const AHORA = 1_793_000_000

describe('firma del webhook (Svix)', () => {
  const cuerpo = '{"type":"email.received","data":{"email_id":"e1"}}'
  const cab = (firma: string, ts = String(AHORA), id = 'msg_1') => ({ id, timestamp: ts, firma })
  const valida = `v1,${firmar(SECRETO, 'msg_1', String(AHORA), cuerpo)}`

  it('acepta una firma válida', () => expect(verificarFirma(cuerpo, cab(valida), SECRETO, AHORA)).toBe(true))
  it('acepta si una de varias firmas es válida (rotación de claves)', () => {
    expect(verificarFirma(cuerpo, cab(`v1,AAAA ${valida}`), SECRETO, AHORA)).toBe(true)
  })
  it('rechaza otra clave, un cuerpo alterado o un id distinto', () => {
    const otra = `whsec_${Buffer.from('otra-clave-distinta-000000000000').toString('base64')}`
    expect(verificarFirma(cuerpo, cab(valida), otra, AHORA)).toBe(false)
    expect(verificarFirma(cuerpo.replace('e1', 'e2'), cab(valida), SECRETO, AHORA)).toBe(false)
    expect(verificarFirma(cuerpo, cab(valida, String(AHORA), 'msg_2'), SECRETO, AHORA)).toBe(false)
  })
  it('rechaza un aviso de hace más de 5 minutos o del futuro', () => {
    const vieja = `v1,${firmar(SECRETO, 'msg_1', String(AHORA - 301), cuerpo)}`
    expect(verificarFirma(cuerpo, cab(vieja, String(AHORA - 301)), SECRETO, AHORA)).toBe(false)
    const futura = `v1,${firmar(SECRETO, 'msg_1', String(AHORA + 301), cuerpo)}`
    expect(verificarFirma(cuerpo, cab(futura, String(AHORA + 301)), SECRETO, AHORA)).toBe(false)
  })
  it('sin clave configurada o sin cabeceras, nunca es válida', () => {
    expect(verificarFirma(cuerpo, cab(valida), undefined, AHORA)).toBe(false)
    expect(verificarFirma(cuerpo, cab(valida), '', AHORA)).toBe(false)
    expect(verificarFirma(cuerpo, { id: null, timestamp: String(AHORA), firma: valida }, SECRETO, AHORA)).toBe(false)
    expect(verificarFirma(cuerpo, cab(valida.replace('v1,', 'v2,')), SECRETO, AHORA)).toBe(false)
  })
})

describe('direcciones', () => {
  it('lee nombre y dirección en los formatos habituales', () => {
    expect(leerDirecciones('"Ruiz, Ana" <Ana@Ejemplo.ES>, Luis <luis@x.com>, c@z.org')).toEqual([
      { nombre: 'Ruiz, Ana', email: 'ana@ejemplo.es' },
      { nombre: 'Luis', email: 'luis@x.com' },
      { nombre: null, email: 'c@z.org' },
    ])
    expect(leerDirecciones(['a@b.com', 'B <b@c.com>']).map(d => d.email)).toEqual(['a@b.com', 'b@c.com'])
    expect(leerDirecciones(null)).toEqual([])
  })

  it('etiquetas de las direcciones propias', () => {
    expect(etiquetaDestino('legal@obrasdeteatro.com')).toBe('Legal')
    expect(etiquetaDestino('comercial@obrasdeteatro.com')).toBe('Comercial')
    expect(etiquetaDestino('facturacion@obrasdeteatro.com')).toBe('Facturación')
    expect(etiquetaDestino('protecciondatos@obrasdeteatro.com')).toBe('Protección de datos')
    expect(etiquetaDestino('info@obrasdeteatro.com')).toBe('Info')
    expect(etiquetaDestino('info.obrasdeteatro@gmail.com')).toBe('Gmail')
    expect(etiquetaDestino('panel@buzon.obrasdeteatro.com')).toBeNull()
    expect(etiquetaDestino('ana@x.com')).toBeNull()
  })
})

describe('detección de buzón y destino', () => {
  it('Arsys: copia de un correo a legal@ (redirigido a hola@)', () => {
    expect(detectarOrigen({
      to: 'Legal ObrasDeTeatro <legal@obrasdeteatro.com>',
      'delivered-to': 'panel@buzon.obrasdeteatro.com',
      'x-original-to': 'hola@obrasdeteatro.com',
    }, { to: ['panel@buzon.obrasdeteatro.com'] })).toEqual({ buzon: 'hola', destino: 'legal@obrasdeteatro.com' })
  })

  it('Arsys: en copia oculta, el destino sale de X-Original-To', () => {
    expect(detectarOrigen({ to: 'alguien@otra.com', 'x-original-to': 'comercial@obrasdeteatro.com' }))
      .toEqual({ buzon: 'hola', destino: 'comercial@obrasdeteatro.com' })
  })

  it('Gmail: el reenvío pone X-Forwarded-For con la cuenta', () => {
    expect(detectarOrigen({
      to: 'info.obrasdeteatro@gmail.com',
      'x-forwarded-for': 'info.obrasdeteatro@gmail.com panel@buzon.obrasdeteatro.com',
      'x-forwarded-to': 'panel@buzon.obrasdeteatro.com',
      'delivered-to': 'panel@buzon.obrasdeteatro.com',
    })).toEqual({ buzon: 'gmail', destino: 'info.obrasdeteatro@gmail.com' })
  })

  it('Gmail: si alguien escribió a hola@ y al Gmail, la copia de Gmail es de Gmail', () => {
    expect(detectarOrigen({
      to: 'hola@obrasdeteatro.com, info.obrasdeteatro@gmail.com',
      'x-forwarded-for': 'info.obrasdeteatro@gmail.com panel@buzon.obrasdeteatro.com',
    })).toEqual({ buzon: 'gmail', destino: 'info.obrasdeteatro@gmail.com' })
  })

  it('verificación del reenvío de Gmail: buzón Gmail', () => {
    expect(detectarOrigen({ from: 'Gmail Team <forwarding-noreply@google.com>', to: 'panel@buzon.obrasdeteatro.com' }).buzon).toBe('gmail')
  })

  it('el subdominio del panel no cuenta como hola@; sin pistas, «otro»', () => {
    expect(detectarOrigen({ to: 'panel@buzon.obrasdeteatro.com' })).toEqual({ buzon: 'otro', destino: 'panel@buzon.obrasdeteatro.com' })
    expect(detectarOrigen(null, {})).toEqual({ buzon: 'otro', destino: null })
  })

  it('cabeceras con mayúsculas o en lista', () => {
    expect(detectarOrigen({ To: ['facturacion@obrasdeteatro.com'] } as never)).toEqual({ buzon: 'hola', destino: 'facturacion@obrasdeteatro.com' })
  })
})

describe('clasificación persona / servicio', () => {
  it.each([
    'notifications@vercel.com', 'noreply@github.com', 'hello@make.com', 'receipts+acct@stripe.com',
    'alerts@supabase.io', 'team@supabase.com', 'no-reply@resend.com', 'no-reply@accounts.google.com',
    'info@metricool.com', 'messages-noreply@linkedin.com', 'noreply@banco.es', 'no-reply@x.com',
    'do-not-reply@x.com', 'notification@algo.org', 'MAILER-DAEMON@mx.arsys.es', 'postmaster@x.com',
  ])('%s → servicio', email => expect(clasificar(email)).toBe('servicio'))

  it.each([
    'forwarding-noreply@google.com', 'ana.ruiz@gmail.com', 'compania@teatrodelaluz.es',
    'reply@festival.org', 'notificar.ana@x.com', 'info@vercel.community',
  ])('%s → persona', email => expect(clasificar(email)).toBe('persona'))

  it('sin remitente válido, persona (que se vea)', () => {
    expect(clasificar(null)).toBe('persona')
    expect(clasificar('sin-arroba')).toBe('persona')
  })
})

describe('saneado del HTML', () => {
  it('quita scripts, marcos, objetos y formularios', () => {
    const s = sanearHtml('<p>Hola</p><script>alert(1)</script><iframe src="https://x"></iframe><object data="x"></object><form action="https://x"><input name="a"><button>Ok</button></form><svg><script>1</script></svg>')
    expect(s).toBe('<p>Hola</p>')
  })
  it('quita manejadores de eventos y enlaces javascript:/data:', () => {
    const s = sanearHtml('<a href="javascript:alert(1)" onclick="x()">a</a><a href=\'https://ok.es\' onmouseover=x>b</a><a href="data:text/html,x">c</a><div ONLOAD="x">d</div>')
    expect(s).not.toMatch(/javascript:|onclick|onmouseover|onload|data:text/i)
    expect(s).toContain('href=\'https://ok.es\'')
  })
  it('no carga imágenes externas, pero deja las incrustadas', () => {
    const s = sanearHtml('<img src="https://rastreo.com/p.gif" srcset="https://x 2x"><img src="data:image/png;base64,AAAA">')
    expect(s).not.toContain('rastreo.com')
    expect(s).not.toContain('srcset')
    expect(s).toContain('data-imagen-externa="bloqueada"')
    expect(s).toContain('src="data:image/png;base64,AAAA"')
  })
  it('quita url() de los estilos, @import y metadatos', () => {
    const s = sanearHtml('<style>@import url(https://x.css); body{background:url(https://x/y.png)}</style><div style="background-image:url(\'https://x\')">t</div><meta http-equiv="refresh" content="0;url=https://x"><link rel="stylesheet" href="https://x"><base href="https://x">')
    expect(s).not.toMatch(/https:\/\/x/)
    expect(s).not.toMatch(/<meta|<link|<base|@import/i)
  })
  it('el documento del iframe no deja cargar ni ejecutar nada', () => {
    const doc = documentoAislado('<p>x</p><script>1</script>')
    expect(doc).toContain(`content="${CSP_CORREO}"`)
    expect(CSP_CORREO).toContain("default-src 'none'")
    expect(CSP_CORREO).toContain('img-src data:')
    expect(doc).not.toContain('<script')
    expect(SANDBOX_CORREO).not.toMatch(/allow-scripts|allow-same-origin|allow-forms|allow-top-navigation/)
  })
})

describe('presentación', () => {
  it('Responder: mailto para hola@ y Gmail en la cuenta propia', () => {
    expect(enlaceResponder({ buzon: 'hola', remitente_email: 'ana@x.com', asunto: 'Consulta' }))
      .toBe('mailto:ana@x.com?subject=Re%3A%20Consulta')
    const g = new URL(enlaceResponder({ buzon: 'gmail', remitente_email: 'ana@x.com', asunto: 'Re: Consulta' })!)
    expect(g.origin + g.pathname).toBe('https://mail.google.com/mail/')
    expect(Object.fromEntries(g.searchParams)).toEqual({ authuser: 'info.obrasdeteatro@gmail.com', view: 'cm', fs: '1', to: 'ana@x.com', su: 'Re: Consulta' })
    expect(enlaceResponder({ buzon: 'hola', remitente_email: null, asunto: 'x' })).toBeNull()
  })
  it('no repite «Re:»', () => {
    expect(asuntoRespuesta('RE: hola')).toBe('RE: hola')
    expect(asuntoRespuesta(null)).toBe('Re:')
  })
  it('filtros: personas por defecto; valores desconocidos, por defecto', () => {
    expect(leerFiltros({})).toEqual({ buzon: 'todos', categoria: 'persona', estado: 'todos' })
    expect(leerFiltros({ buzon: 'gmail', categoria: 'x', estado: 'pendientes' })).toEqual({ buzon: 'gmail', categoria: 'persona', estado: 'pendientes' })
    expect(queryFiltros({ buzon: 'todos', categoria: 'persona', estado: 'todos' })).toBe('')
    expect(queryFiltros({ buzon: 'hola', categoria: 'todos', estado: 'nuevo' }, { id: '1' })).toBe('?buzon=hola&categoria=todos&estado=nuevo&id=1')
  })
  it('tamaños', () => {
    expect(tamano(512)).toBe('512 B')
    expect(tamano(1536)).toBe('1,5 KB')
    expect(tamano(3 * 1024 * 1024)).toBe('3 MB')
    expect(tamano(null)).toBe('tamaño desconocido')
  })
  it('conservación: 12 meses', () => {
    expect(limiteConservacion(new Date('2026-10-29T04:20:00Z')).toISOString()).toBe('2025-10-29T04:20:00.000Z')
  })
})
