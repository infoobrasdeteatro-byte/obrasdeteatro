import { describe, it, expect, beforeEach } from 'vitest'
import { firmar } from '../firma'
import { construirFila, procesarAviso, RESEND_API } from '../recepcion'

const SECRETO = `whsec_${Buffer.from('clave-de-prueba-del-webhook-0123').toString('base64')}`
const AHORA = 1_793_000_000

/** Cliente de servicio en memoria: solo lo que usa procesarAviso. */
function servicioFalso() {
  const filas: Record<string, unknown>[] = []
  let chocarAlInsertar = false
  const cliente = {
    from: (tabla: string) => {
      if (tabla !== 'correos_entrantes') throw new Error(`tabla inesperada ${tabla}`)
      return {
        select: () => ({
          eq: (_c: string, v: string) => ({
            maybeSingle: async () => ({ data: filas.find(f => f.resend_email_id === v) ? { id: 'x' } : null, error: null }),
          }),
        }),
        insert: async (fila: Record<string, unknown>) => {
          if (chocarAlInsertar || filas.some(f => f.resend_email_id === fila.resend_email_id)) {
            return { error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
          }
          filas.push(fila)
          return { error: null }
        },
      }
    },
  }
  return { cliente: cliente as never, filas, chocar: () => { chocarAlInsertar = true } }
}

const aviso = (id = 'e1') => JSON.stringify({
  type: 'email.received',
  created_at: '2026-10-29T10:00:00.000Z',
  data: {
    email_id: id, created_at: '2026-10-29T10:00:00.000Z', from: 'Ana Ruiz <ana@teatro.es>',
    to: ['panel@buzon.obrasdeteatro.com'], subject: 'Propuesta', attachments: [{ id: 'a1', filename: 'dossier.pdf', content_type: 'application/pdf' }],
  },
})
const firmado = (cuerpo: string) => ({ id: 'msg_1', timestamp: String(AHORA), firma: `v1,${firmar(SECRETO, 'msg_1', String(AHORA), cuerpo)}` })

const COMPLETO = {
  object: 'email', id: 'e1', created_at: '2026-10-29T10:00:00.000Z', from: 'Ana Ruiz <ana@teatro.es>',
  to: ['panel@buzon.obrasdeteatro.com'], subject: 'Propuesta', text: 'Hola, os escribo…', html: '<p>Hola, os escribo…</p>',
  headers: { to: 'Comercial <comercial@obrasdeteatro.com>', 'x-original-to': 'hola@obrasdeteatro.com' },
  attachments: [{ id: 'a1', filename: 'dossier.pdf', content_type: 'application/pdf', size: 204800 }],
}

function fetchFalso(status = 200, cuerpo: unknown = COMPLETO) {
  const pedidas: { url: string; auth: string | null }[] = []
  const fetcher = (async (url: string, init: RequestInit) => {
    pedidas.push({ url, auth: new Headers(init.headers).get('authorization') })
    return new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } })
  }) as unknown as typeof fetch
  return { fetcher, pedidas }
}

describe('webhook de correo entrante', () => {
  let s: ReturnType<typeof servicioFalso>
  beforeEach(() => { s = servicioFalso() })

  it('sin firma válida: 401 y no guarda nada ni llama a Resend', async () => {
    const { fetcher, pedidas } = fetchFalso()
    const cuerpo = aviso()
    const r = await procesarAviso(cuerpo, { ...firmado(cuerpo), firma: 'v1,falsa' }, { secreto: SECRETO, clave: 're_x', servicio: s.cliente, fetcher, ahoraS: AHORA })
    expect(r.status).toBe(401)
    expect(s.filas).toHaveLength(0)
    expect(pedidas).toHaveLength(0)
  })

  it('sin la variable del secreto: 401', async () => {
    const cuerpo = aviso()
    const r = await procesarAviso(cuerpo, firmado(cuerpo), { secreto: undefined, clave: 're_x', servicio: s.cliente, ahoraS: AHORA })
    expect(r.status).toBe(401)
  })

  it('recupera el correo completo y lo guarda con buzón, destino y categoría', async () => {
    const { fetcher, pedidas } = fetchFalso()
    const cuerpo = aviso()
    const r = await procesarAviso(cuerpo, firmado(cuerpo), { secreto: SECRETO, clave: 're_full', servicio: s.cliente, fetcher, ahoraS: AHORA })
    expect(r).toEqual({ status: 200, cuerpo: { guardado: true } })
    expect(pedidas).toEqual([{ url: `${RESEND_API}/emails/receiving/e1`, auth: 'Bearer re_full' }])
    expect(s.filas[0]).toMatchObject({
      resend_email_id: 'e1', buzon: 'hola', direccion_destino: 'comercial@obrasdeteatro.com',
      remitente_nombre: 'Ana Ruiz', remitente_email: 'ana@teatro.es', asunto: 'Propuesta',
      texto: 'Hola, os escribo…', html: '<p>Hola, os escribo…</p>', categoria: 'persona', nota_interna: null,
      adjuntos: [{ nombre: 'dossier.pdf', tipo: 'application/pdf', tamano: 204800 }],
    })
  })

  it('idempotente: el mismo correo dos veces se guarda una sola', async () => {
    const { fetcher, pedidas } = fetchFalso()
    const cuerpo = aviso()
    const e = { secreto: SECRETO, clave: 're_full', servicio: s.cliente, fetcher, ahoraS: AHORA }
    await procesarAviso(cuerpo, firmado(cuerpo), e)
    const r = await procesarAviso(cuerpo, firmado(cuerpo), e)
    expect(r).toEqual({ status: 200, cuerpo: { duplicado: true } })
    expect(s.filas).toHaveLength(1)
    expect(pedidas).toHaveLength(1) // el segundo ni siquiera pide el contenido
  })

  it('idempotente también si dos avisos llegan a la vez (choque con el UNIQUE)', async () => {
    s.chocar()
    const { fetcher } = fetchFalso()
    const cuerpo = aviso()
    const r = await procesarAviso(cuerpo, firmado(cuerpo), { secreto: SECRETO, clave: 're_full', servicio: s.cliente, fetcher, ahoraS: AHORA })
    expect(r).toEqual({ status: 200, cuerpo: { duplicado: true } })
  })

  it('clave sin permiso de lectura: guarda los datos del aviso y lo explica', async () => {
    const { fetcher } = fetchFalso(401, { message: 'restricted' })
    const cuerpo = aviso()
    const r = await procesarAviso(cuerpo, firmado(cuerpo), { secreto: SECRETO, clave: 're_envio', servicio: s.cliente, fetcher, ahoraS: AHORA })
    expect(r.status).toBe(200)
    expect(s.filas[0]).toMatchObject({ asunto: 'Propuesta', texto: null, remitente_email: 'ana@teatro.es' })
    expect(String(s.filas[0].nota_interna)).toContain('RESEND_RECEIVING_API_KEY')
  })

  it('Resend caído: 502 para que reintente, sin guardar', async () => {
    const { fetcher } = fetchFalso(500, {})
    const cuerpo = aviso()
    const r = await procesarAviso(cuerpo, firmado(cuerpo), { secreto: SECRETO, clave: 're_full', servicio: s.cliente, fetcher, ahoraS: AHORA })
    expect(r.status).toBe(502)
    expect(s.filas).toHaveLength(0)
  })

  it('otros eventos se ignoran con 200', async () => {
    const cuerpo = JSON.stringify({ type: 'email.delivered', data: {} })
    const r = await procesarAviso(cuerpo, firmado(cuerpo), { secreto: SECRETO, clave: 're_full', servicio: s.cliente, ahoraS: AHORA })
    expect(r).toEqual({ status: 200, cuerpo: { ignorado: 'email.delivered' } })
  })
})

describe('construirFila', () => {
  it('el correo de verificación del reenvío de Gmail es «persona» y de Gmail', () => {
    const f = construirFila('v1', {
      from: 'Gmail Team <forwarding-noreply@google.com>', subject: '(#123456789) Confirmación de reenvío de Gmail',
      text: 'Código de confirmación: 123456789', headers: { to: 'panel@buzon.obrasdeteatro.com' },
    })
    expect(f).toMatchObject({ categoria: 'persona', buzon: 'gmail', remitente_email: 'forwarding-noreply@google.com' })
    expect(f.texto).toContain('123456789')
  })
  it('un aviso de servicio se clasifica como servicio', () => {
    expect(construirFila('s1', { from: 'Vercel <notifications@vercel.com>', subject: 'Deploy' }).categoria).toBe('servicio')
  })
  it('un nombre que es una dirección no se guarda como nombre', () => {
    expect(construirFila('n1', { from: '"ana@x.com" <ana@x.com>' })).toMatchObject({ remitente_nombre: null, remitente_email: 'ana@x.com' })
  })
  it('un HTML enorme no se guarda y se deja nota', () => {
    const f = construirFila('h1', { from: 'a@b.com', html: 'x'.repeat(1_500_001), text: 't' })
    expect(f.html).toBeNull()
    expect(f.nota_interna).toContain('demasiado grande')
  })
})
