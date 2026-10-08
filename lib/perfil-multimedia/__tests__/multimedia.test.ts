import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  MAX_FOTOS,
  MAX_PORTFOLIO,
  MAX_VIDEOS,
  analizarVideo,
  dimensionesReducidas,
  esPlanDePago,
  limiteAlcanzado,
  miniaturaVideo,
  portadaValida,
  rutaDesdeUrl,
  rutaNueva,
  urlPublica,
  urlReproductor,
  validarFoto,
  validarImagen,
  validarProyecto,
  validarVideo,
} from '../multimedia'

const SUPA = 'https://pnsirwtiiurczjwrayza.supabase.co'
const ID = '0b5c6d7e-1234-4abc-9def-0123456789ab'

const URLS: [string, 'youtube' | 'vimeo' | null][] = [
  ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube'],
  ['https://youtu.be/dQw4w9WgXcQ?t=10', 'youtube'],
  ['https://youtube.com/shorts/dQw4w9WgXcQ', 'youtube'],
  ['https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=x', 'youtube'],
  ['https://vimeo.com/76979871', 'vimeo'],
  ['https://player.vimeo.com/video/76979871', 'vimeo'],
  ['http://www.youtube.com/watch?v=dQw4w9WgXcQ', null],
  ['https://www.youtube.com/watch?v=corto', null],
  ['https://evil.com/youtube.com/watch?v=dQw4w9WgXcQ', null],
  ['https://www.youtube.com.evil.com/watch?v=dQw4w9WgXcQ', null],
  ['https://vimeo.com/channels/staff', null],
  ['javascript:alert(1)//youtube.com/watch?v=dQw4w9WgXcQ', null],
]

describe('enlaces de vídeo', () => {
  it.each(URLS)('%s → %s', (url, esperado) => {
    expect(analizarVideo(url)?.plataforma ?? null).toBe(esperado)
  })

  it('extrae el id y arma un reproductor sin cookies', () => {
    const yt = analizarVideo('https://youtu.be/dQw4w9WgXcQ')!
    expect(yt.id).toBe('dQw4w9WgXcQ')
    expect(urlReproductor(yt)).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0')
    expect(miniaturaVideo(yt)).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
    const vm = analizarVideo('https://vimeo.com/76979871')!
    expect(urlReproductor(vm)).toBe('https://player.vimeo.com/video/76979871?autoplay=1&dnt=1')
    expect(miniaturaVideo(vm)).toBeNull()
  })

  it('validación del formulario', () => {
    expect(validarVideo({ url: 'https://vimeo.com/76979871', titulo: '' })).toBeNull()
    expect(validarVideo({ url: 'https://dailymotion.com/x', titulo: '' })).toMatch(/YouTube o de Vimeo/)
    expect(validarVideo({ url: 'https://vimeo.com/76979871', titulo: 'x'.repeat(101) })).toMatch(/100/)
  })
})

describe('límites y validaciones', () => {
  it('12 fotos, 6 vídeos y 10 proyectos', () => {
    expect([MAX_FOTOS, MAX_VIDEOS, MAX_PORTFOLIO]).toEqual([12, 6, 10])
    expect(limiteAlcanzado(11, MAX_FOTOS)).toBeNull()
    expect(limiteAlcanzado(12, MAX_FOTOS)).toMatch(/máximo de 12/)
    expect(limiteAlcanzado(6, MAX_VIDEOS)).toMatch(/máximo de 6/)
  })

  it('foto: pie ≤ 140 y crédito ≤ 80', () => {
    expect(validarFoto({ pie: 'x'.repeat(140), credito: 'x'.repeat(80) })).toBeNull()
    expect(validarFoto({ pie: 'x'.repeat(141), credito: '' })).toMatch(/140/)
    expect(validarFoto({ pie: '', credito: 'x'.repeat(81) })).toMatch(/80/)
  })

  it('proyecto: título obligatorio, año, longitudes y enlace https', () => {
    const base = { titulo: 'Bodas de sangre', anio: '2024', rol: 'Dirección', compania: 'Cía', descripcion: '', enlace: '' }
    expect(validarProyecto(base)).toBeNull()
    expect(validarProyecto({ ...base, titulo: ' ' })).toMatch(/obligatorio/)
    expect(validarProyecto({ ...base, anio: '1850' })).toMatch(/año/)
    expect(validarProyecto({ ...base, descripcion: 'x'.repeat(501) })).toMatch(/500/)
    expect(validarProyecto({ ...base, enlace: 'http://a.org' })).toMatch(/https/)
  })

  it('imagen: JPEG/PNG/WebP hasta 5 MB', () => {
    expect(validarImagen({ type: 'image/webp', size: 5 * 1024 * 1024 })).toBeNull()
    expect(validarImagen({ type: 'image/gif', size: 10 })).toMatch(/JPEG, PNG o WebP/)
    expect(validarImagen({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB/)
  })

  it('redimensionado: lado largo ≤ 2000, sin agrandar', () => {
    expect(dimensionesReducidas(4000, 3000)).toEqual({ ancho: 2000, alto: 1500 })
    expect(dimensionesReducidas(1200, 3600)).toEqual({ ancho: 667, alto: 2000 })
    expect(dimensionesReducidas(800, 600)).toEqual({ ancho: 800, alto: 600 })
  })

  it('solo los planes de pago tienen perfil completo', () => {
    expect(['premium', 'destacado', 'empresas'].every(esPlanDePago)).toBe(true)
    expect(esPlanDePago('gratuito')).toBe(false)
    expect(esPlanDePago(null)).toBe(false)
  })
})

describe('rutas y portada', () => {
  it('la ruta nueva va en la carpeta del usuario', () => {
    expect(rutaNueva(ID, 'fotos', 'webp', 'abc')).toBe(`${ID}/fotos/abc.webp`)
  })

  it('URL pública y vuelta a la ruta', () => {
    const url = urlPublica(SUPA, 'galeria', `${ID}/fotos/abc.webp`)
    expect(url).toBe(`${SUPA}/storage/v1/object/public/galeria/${ID}/fotos/abc.webp`)
    expect(rutaDesdeUrl(url, 'galeria')).toBe(`${ID}/fotos/abc.webp`)
  })

  it('portada: solo una URL del bucket covers y de la carpeta del propio perfil', () => {
    const propia = `${SUPA}/storage/v1/object/public/covers/${ID}/portada/x.webp`
    expect(portadaValida(propia, SUPA, ID)).toBe(propia)
    expect(portadaValida(`${SUPA}/storage/v1/object/public/covers/otro-perfil/portada/x.webp`, SUPA, ID)).toBeNull()
    expect(portadaValida('https://evil.com/x.jpg', SUPA, ID)).toBeNull()
    expect(portadaValida(null, SUPA, ID)).toBeNull()
  })
})

describe('migración 20261008120000 — contratos', () => {
  const SQL = readFileSync(
    join(__dirname, '..', '..', '..', 'supabase', 'migrations', '20261008120000_perfil_galeria_portfolio.sql'), 'utf-8',
  )
  const CODIGO = SQL.replace(/--.*$/gm, '')

  it('límites en la base: 12 fotos, 6 vídeos, 10 proyectos', () => {
    expect(CODIGO).toMatch(/before insert on public\.perfil_galeria_fotos\s+for each row execute function public\.perfil_limite_multimedia\('12'\)/)
    expect(CODIGO).toMatch(/before insert on public\.perfil_galeria_videos\s+for each row execute function public\.perfil_limite_multimedia\('6'\)/)
    expect(CODIGO).toMatch(/before insert on public\.perfil_portfolio\s+for each row execute function public\.perfil_limite_multimedia\('10'\)/)
    expect(CODIGO).toMatch(/pg_advisory_xact_lock/)
  })

  it('la CHECK de vídeos acepta y rechaza exactamente lo mismo que el formulario', () => {
    const yt = CODIGO.match(/plataforma = 'youtube' and url ~ '([^']+)'/)?.[1]
    const vm = CODIGO.match(/plataforma = 'vimeo' and url ~ '([^']+)'/)?.[1]
    expect(yt && vm).toBeTruthy()
    for (const [url, esperado] of URLS) {
      const enBase = new RegExp(yt!).test(url) ? 'youtube' : new RegExp(vm!).test(url) ? 'vimeo' : null
      expect(enBase, url).toBe(esperado)
    }
  })

  it('escribir exige dueño y plan de pago; borrar lo propio, siempre; lectura pública con plan', () => {
    expect(CODIGO).toMatch(/for insert with check \(profile_id = auth\.uid\(\) and public\.plan_de_pago\(\)\)/)
    expect(CODIGO).toMatch(/for update using \(profile_id = auth\.uid\(\)\)\s+with check \(profile_id = auth\.uid\(\) and public\.plan_de_pago\(\)\)/)
    expect(CODIGO).toMatch(/for delete using \(profile_id = auth\.uid\(\)\)\$p\$/)
    expect(CODIGO).toMatch(/for select using \(public\.perfil_premium_visible\(profile_id\)\)/)
    expect(CODIGO).toMatch(/for delete using \(public\.es_moderador\(\)\)/)
    expect(CODIGO).toMatch(/and plan <> 'gratuito'/)
  })

  it('bucket galeria: 5 MB, JPEG/PNG/WebP, carpeta propia y plan de pago para subir', () => {
    expect(CODIGO).toMatch(/values \('galeria', 'galeria', true, 5242880, array\['image\/jpeg', 'image\/png', 'image\/webp'\]\)/)
    expect(CODIGO).toMatch(/with check \(bucket_id = 'galeria' and \(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text and public\.plan_de_pago\(\)\)/)
  })

  it('portada: subir o sustituir en covers también exige plan de pago', () => {
    expect(CODIGO).toMatch(/drop policy if exists covers_owner_insert/)
    expect(CODIGO).toMatch(/with check \(bucket_id = 'covers' and \(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text and public\.plan_de_pago\(\)\)/)
  })

  it('las rutas de las fotos y de la imagen del proyecto deben estar en la carpeta del dueño', () => {
    expect(CODIGO).toMatch(/check \(ruta like profile_id::text \|\| '\/%'\)/)
    expect(CODIGO).toMatch(/imagen_ruta is null or imagen_ruta like profile_id::text \|\| '\/%'/)
  })
})
