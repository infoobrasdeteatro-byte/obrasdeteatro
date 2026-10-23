import { describe, expect, it } from 'vitest'
import { enlaceWhatsappPerfil, nombreArchivoQr, urlPerfil } from '../[slug]/CompartirPerfil'

describe('compartir perfil', () => {
  it('URL pública de la ficha', () => {
    expect(urlPerfil('reneebausson')).toBe('https://www.obrasdeteatro.com/perfil/reneebausson')
  })
  it('WhatsApp con nombre y enlace', () => {
    const href = enlaceWhatsappPerfil('Renee Bausson', urlPerfil('reneebausson'))
    expect(href.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(href.split('text=')[1])).toBe('Renee Bausson en ObrasDeTeatro®\nhttps://www.obrasdeteatro.com/perfil/reneebausson')
  })
  it('nombre del PNG limpio', () => {
    expect(nombreArchivoQr('daniel-uribe')).toBe('qr-daniel-uribe.png')
    expect(nombreArchivoQr('../x')).toBe('qr-x.png')
  })
})
