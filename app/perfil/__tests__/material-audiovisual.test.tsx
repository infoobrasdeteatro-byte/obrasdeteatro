import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SelectorImagen from '../SelectorImagen'
import { errorFoto, errorProyecto, errorVideo } from '@/lib/perfil-multimedia/multimedia'

const PROYECTO = { titulo: 'Yerma', anio: '2023', rol: '', compania: '', descripcion: '', enlace: '' }

describe('validaciones con el campo afectado (para marcarlo en el editor)', () => {
  it('proyecto', () => {
    expect(errorProyecto({ ...PROYECTO, titulo: '' })).toEqual({ campo: 'titulo', mensaje: 'El título es obligatorio.' })
    expect(errorProyecto({ ...PROYECTO, anio: '1800' })?.campo).toBe('anio')
    expect(errorProyecto({ ...PROYECTO, descripcion: 'x'.repeat(501) })?.campo).toBe('descripcion')
    expect(errorProyecto({ ...PROYECTO, enlace: 'http://a.org' })?.campo).toBe('enlace')
    expect(errorProyecto(PROYECTO)).toBeNull()
  })

  it('foto y vídeo', () => {
    expect(errorFoto({ pie: 'x'.repeat(141), credito: '' })?.campo).toBe('pie')
    expect(errorFoto({ pie: '', credito: 'x'.repeat(81) })?.campo).toBe('credito')
    expect(errorVideo({ url: 'https://dailymotion.com/x', titulo: '' })?.campo).toBe('url')
    expect(errorVideo({ url: 'https://vimeo.com/76979871', titulo: 'x'.repeat(101) })?.campo).toBe('titulo')
  })
})

describe('SelectorImagen', () => {
  it('se ve como un botón «Elegir imagen» con el input accesible detrás', () => {
    const h = renderToStaticMarkup(<SelectorImagen id="portada" archivo={null} onCambio={() => {}} />)
    expect(h).toContain('<input id="portada" type="file" accept="image/jpeg,image/png,image/webp" class="selector-imagen-input"')
    expect(h).toContain('<label for="portada" class="ds-btn-secondary selector-imagen-boton">Elegir imagen</label>')
    expect(h).toContain('Ningún archivo elegido')
  })

  it('muestra el nombre del archivo elegido y marca el error', () => {
    const archivo = new File(['x'], 'ensayo.webp', { type: 'image/webp' })
    const h = renderToStaticMarkup(<SelectorImagen id="foto" archivo={archivo} onCambio={() => {}} invalido descripcion="aviso-fotos" />)
    expect(h).toContain('ensayo.webp')
    expect(h).toContain('aria-invalid="true"')
    expect(h).toContain('aria-describedby="aviso-fotos"')
    expect(h).toContain('selector-imagen-boton--error')
  })
})
