import { describe, it, expect, beforeAll } from 'vitest'
import { writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { renderToBuffer } from '@react-pdf/renderer'
import { enlaceSeguro, nombreArchivo, periodo, redesDe, textoPdf } from '../formato'
import { urlPermitida, type ImagenPdf } from '../imagenes'
import { CvPdf, DossierPdf } from '../pdf'
import type { DatosDocumento } from '../datos'

describe('formato', () => {
  it('texto apto para las fuentes del PDF: español intacto, emojis fuera', () => {
    expect(textoPdf('Ñandú «Lorca» — 1º ¿qué? €')).toBe('Ñandú «Lorca» — 1º ¿qué? €')
    expect(textoPdf('Teatro 🎭 en Łódź ✨')).toBe('Teatro en Lódz')
    expect(textoPdf(null)).toBe('')
  })
  it('periodos', () => {
    expect(periodo('2019-03-01', '2022-06-01', false)).toBe('2019 – 2022')
    expect(periodo('2021-01-01', null, true)).toBe('2021 – actualidad')
    expect(periodo('2020-01-01', '2020-05-01', false)).toBe('2020')
    expect(periodo(null, null, false)).toBe('')
  })
  it('nombre de archivo y enlaces', () => {
    expect(nombreArchivo('cv', 'María José Peña')).toBe('CV-Maria-Jose-Pena.pdf')
    expect(nombreArchivo('dossier', '★★')).toBe('Dossier-perfil.pdf')
    expect(enlaceSeguro('javascript:alert(1)')).toBeNull()
    expect(enlaceSeguro(' https://ejemplo.es ')).toBe('https://ejemplo.es')
    expect(redesDe({ instagram: 'https://instagram.com/x', tiktok: 'mal', otra: 'https://y.com' })).toEqual([{ red: 'Instagram', url: 'https://instagram.com/x' }])
  })
  it('solo descarga imágenes de nuestro almacenamiento o de Google', () => {
    const S = 'https://abc.supabase.co'
    expect(urlPermitida(`${S}/storage/v1/object/public/galeria/a.webp`, S)).toBe(true)
    expect(urlPermitida(`${S}/rest/v1/profiles`, S)).toBe(false)
    expect(urlPermitida('https://lh3.googleusercontent.com/a/x', S)).toBe(true)
    expect(urlPermitida('http://169.254.169.254/latest', S)).toBe(false)
    expect(urlPermitida('https://evil.com/x.jpg', S)).toBe(false)
  })
})

describe('PDF', () => {
  let img: ImagenPdf
  beforeAll(async () => {
    const data = await sharp({ create: { width: 600, height: 400, channels: 3, background: '#6b2030' } }).jpeg().toBuffer()
    img = { data, format: 'jpg' }
  })
  const d: DatosDocumento = {
    profileId: 'x', plan: 'premium', nombre: 'Lucía Fernández', nombreCompleto: 'Lucía Fernández Ortega', tipo: 'Actor / Actriz',
    bio: 'Actriz formada en la RESAD de Madrid. '.repeat(20), ubicacion: 'Madrid, España', email: 'lucia@ejemplo.es', telefono: '+34 600 000 000',
    web: 'https://luciafernandez.es', perfilUrl: 'https://www.obrasdeteatro.com/perfil/lucia', redes: [{ red: 'Instagram', url: 'https://instagram.com/lucia' }],
    especialidades: ['Teatro clásico', 'Verso', 'Comedia'], especialidadPrincipal: 'Teatro clásico',
    experiencia: Array.from({ length: 8 }, (_, i) => ({ titulo: `Personaje ${i} en «Obra ${i}»`, detalle: 'Compañía Nacional de Teatro Clásico', periodo: `${2015 + i} – ${2016 + i}`, descripcion: 'Gira nacional con 80 funciones.', etiqueta: 'Actuación' })),
    formacion: [{ titulo: 'Grado en Arte Dramático', detalle: 'RESAD', periodo: '2010 – 2014', descripcion: null }],
    premios: [{ titulo: 'Premio Max a mejor actriz revelación', detalle: 'Fundación SGAE', periodo: '2019', descripcion: null }],
    disponibilidad: 'Abierto/a a propuestas · Ámbito nacional', avatarUrl: null, portadaUrl: null,
    fotos: [{ url: 'u', pie: 'Bodas de sangre', credito: 'Marta Ruiz' }, { url: 'u', pie: null, credito: null }],
    videos: [{ titulo: 'Videobook 2024', url: 'https://www.youtube.com/watch?v=abcdefghijk' }],
    proyectos: [{ titulo: 'La vida es sueño', anio: 2023, rol: 'Rosaura', compania: 'CNTC', descripcion: 'Dirección de Declan Donnellan.', imagenUrl: 'u', enlace: 'https://cntc.es' }],
  }
  it('genera el CV y el dossier', async () => {
    const cv = await renderToBuffer(<CvPdf d={d} img={{ avatar: img }} o={{ email: true, telefono: false }} />)
    const dossier = await renderToBuffer(<DossierPdf d={d} img={{ avatar: img, portada: img, fotos: [img, null], proyectos: [img] }} o={{ email: true, telefono: true }} />)
    expect(cv.subarray(0, 5).toString()).toBe('%PDF-')
    expect(dossier.length).toBeGreaterThan(cv.length)
    if (process.env.DOC_PREVIEW) { writeFileSync(`${process.env.DOC_PREVIEW}/cv.pdf`, cv); writeFileSync(`${process.env.DOC_PREVIEW}/dossier.pdf`, dossier) }
  }, 30_000)
})
