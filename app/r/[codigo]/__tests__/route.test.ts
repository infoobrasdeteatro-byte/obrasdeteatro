import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

const pedir = (ua: string, codigo = 'AB12CD34') =>
  GET(new NextRequest(`https://www.obrasdeteatro.com/r/${codigo}`, { headers: { 'user-agent': ua } }), { params: Promise.resolve({ codigo }) })

describe('GET /r/[codigo]', () => {
  it('una persona: guarda el código y va al registro', async () => {
    const res = await pedir('Mozilla/5.0 (iPhone)')
    expect(res.headers.get('location')).toBe('https://www.obrasdeteatro.com/auth/registro?invitado=1')
    expect(res.cookies.get('odt_ref')?.value).toBe('AB12CD34')
  })

  it('WhatsApp: recibe la vista previa con título e imagen, sin cookie', async () => {
    const res = await pedir('WhatsApp/2.23.20.0 A')
    const html = await res.text()
    expect(res.status).toBe(200)
    expect(html).toContain('<meta property="og:title" content="Te invitan a ObrasDeTeatro® · Un mes de Premium gratis">')
    expect(html).toContain('og:image" content="https://www.obrasdeteatro.com/opengraph-image.png"')
    expect(res.cookies.get('odt_ref')).toBeUndefined()
  })

  it('código no válido: registro normal', async () => {
    const res = await pedir('WhatsApp/2', 'x')
    expect(res.headers.get('location')).toBe('https://www.obrasdeteatro.com/auth/registro')
  })
})
