import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { renderToStaticMarkup } from 'react-dom/server'
import NuevaConversacion from '../components/NuevaConversacion'
import {
  CONFIRMACION_NUEVA_CONVERSACION,
  estadoDeConversacionNueva,
  mostrarNuevaConversacion,
  puedeEmpezarNueva,
  requiereConfirmacion,
} from '../conversacion'
import { cuerpoDelTurno, historialEnviable } from '../listado'
import type { TurnoDelChat } from '../listado'

/** "Nueva conversación" en ScenaIA: funciones puras, render, recorrido e invariantes. */

const nada = () => {}
const UN_TURNO: TurnoDelChat[] = [{ role: 'user', content: 'dame la lista de obras' }]

/** Un chat tras un listado de dos páginas: la primera con "Ver más" y la continuación. */
const TRAS_LISTADO: TurnoDelChat[] = [
  { role: 'user', content: 'dame la lista de obras' },
  {
    role: 'assistant',
    content: 'En obras he encontrado 11 resultados: …',
    listingPage: { from: 1, to: 10, total: 11, nextOffset: 10 },
    listingRequest: 'dame la lista de obras',
  },
  {
    role: 'assistant',
    content: "En obras he encontrado 11 resultados:\n- Teresa's Ecstasy",
    listingPage: { from: 11, to: 11, total: 11, nextOffset: null },
    listingRequest: 'dame la lista de obras',
    esContinuacion: true,
  },
]
/** Estado conversacional como el que devuelve el servidor tras ese listado. */
const ESTADO_PREVIO = { conversationId: 'conv-1', activeDomain: 'Obras', occupancyByDomain: [{ domain: 'Obras', slots: { genero: 'COMEDIA' } }], stateVersion: 2, updatedAt: 'T' }

describe('funciones puras', () => {
  it('con 0 mensajes el botón no se muestra y no se puede empezar de nuevo', () => {
    expect(mostrarNuevaConversacion([])).toBe(false)
    expect(puedeEmpezarNueva([], false)).toBe(false)
    expect(puedeEmpezarNueva([], true)).toBe(false)
  })

  it('con mensajes y un turno en curso: se muestra, pero bloqueado', () => {
    expect(mostrarNuevaConversacion(UN_TURNO)).toBe(true)
    expect(puedeEmpezarNueva(UN_TURNO, true)).toBe(false)
  })

  it('con mensajes y sin turno en curso: disponible, y pide confirmación', () => {
    expect(puedeEmpezarNueva(UN_TURNO, false)).toBe(true)
    expect(requiereConfirmacion(UN_TURNO)).toBe(true)
    expect(requiereConfirmacion([])).toBe(false)
  })

  it('la confirmación es el texto acordado', () => {
    expect(CONFIRMACION_NUEVA_CONVERSACION).toBe('¿Empezar una conversación nueva? Se borrará la actual.')
  })

  it('estado inicial: sin mensajes, sin estado conversacional y sin error; el texto escrito no forma parte de él', () => {
    const inicial = estadoDeConversacionNueva()
    expect(inicial).toEqual({ messages: [], conversationState: null, error: null })
    expect(Object.keys(inicial).sort()).toEqual(['conversationState', 'error', 'messages'])
    // Cada llamada da un estado nuevo: nunca se comparte un array entre conversaciones.
    expect(estadoDeConversacionNueva().messages).not.toBe(inicial.messages)
  })
})

describe('render del botón', () => {
  it('con el chat vacío no pinta nada', () => {
    expect(renderToStaticMarkup(<NuevaConversacion mensajes={[]} pendiente={false} onNueva={nada} />)).toBe('')
    expect(renderToStaticMarkup(<NuevaConversacion mensajes={[]} pendiente={true} onNueva={nada} />)).toBe('')
  })

  it('con conversación: botón "Nueva conversación" con ds-btn-secondary, pulsable', () => {
    const html = renderToStaticMarkup(<NuevaConversacion mensajes={UN_TURNO} pendiente={false} onNueva={nada} />)
    expect(html).toContain('>Nueva conversación</button>')
    expect(html).toContain('class="ds-btn-secondary"')
    expect(html).toContain('type="button"')
    expect(html).not.toMatch(/disabled=""/)
  })

  it('durante un turno en curso: atributo disabled', () => {
    const html = renderToStaticMarkup(<NuevaConversacion mensajes={UN_TURNO} pendiente={true} onNueva={nada} />)
    expect(html).toContain('>Nueva conversación</button>')
    expect(html).toMatch(/disabled=""/)
    expect(html).toContain('aria-disabled="true"')
  })
})

describe('recorrido con las funciones reales', () => {
  it('tras un listado con "Ver más", el historial enviable deja de estar vacío… y reiniciar lo vacía', () => {
    expect(historialEnviable(TRAS_LISTADO)).toHaveLength(2)

    const inicial = estadoDeConversacionNueva()
    expect(historialEnviable(inicial.messages)).toEqual([])
  })

  it('el turno siguiente se envía con historial vacío y conversationState: null, sin continuación', () => {
    const antes = cuerpoDelTurno('dame comedias', historialEnviable(TRAS_LISTADO), ESTADO_PREVIO)
    expect(antes.conversationState).toEqual(ESTADO_PREVIO)

    const inicial = estadoDeConversacionNueva()
    const despues = cuerpoDelTurno('dame comedias', historialEnviable(inicial.messages), inicial.conversationState)
    expect(despues).toEqual({
      message: 'dame comedias',
      history: [],
      conversationState: null,
      route: '/scenaia',
      module: 'centro-profesional',
    })
    expect('continuation' in despues).toBe(false)
  })
})

describe('invariantes (solo lo que añade este cambio)', () => {
  const fuente = (ruta: string) =>
    readFileSync(join(__dirname, '..', ruta), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
  const CLIENTE = fuente('ScenaiaClient.tsx')
  const accion = CLIENTE.slice(CLIENTE.indexOf('function handleNuevaConversacion'), CLIENTE.indexOf('return (', CLIENTE.indexOf('function handleNuevaConversacion')))

  it('la acción existe y aplica el estado inicial con los tres setters', () => {
    expect(accion).toMatch(/puedeEmpezarNueva\(messages, pending\)/)
    expect(accion).toMatch(/requiereConfirmacion\(messages\) && !window\.confirm\(CONFIRMACION_NUEVA_CONVERSACION\)/)
    expect(accion).toMatch(/setMessages\(inicial\.messages\)/)
    expect(accion).toMatch(/setConversationState\(inicial\.conversationState\)/)
    expect(accion).toMatch(/setError\(inicial\.error\)/)
    // El texto que se está escribiendo se conserva.
    expect(accion).not.toMatch(/setMessage\(/)
  })

  it('la acción no llama al servidor ni guarda nada en el navegador', () => {
    for (const [nombre, codigo] of [
      ['acción', accion],
      ['conversacion.ts', fuente('conversacion.ts')],
      ['NuevaConversacion.tsx', fuente('components/NuevaConversacion.tsx')],
    ] as const) {
      expect(codigo, nombre).not.toMatch(/fetch\(|localStorage|sessionStorage|indexedDB|document\.cookie/)
    }
  })

  it('el cliente sigue sin usar almacenamiento del navegador en ningún punto', () => {
    expect(CLIENTE).not.toMatch(/localStorage|sessionStorage/)
  })

  it('el botón vive dentro de .scenaia-shell', () => {
    expect(CLIENTE).toMatch(/className="scenaia-shell">\s*<NuevaConversacion mensajes=\{messages\} pendiente=\{pending\} onNueva=\{handleNuevaConversacion\} \/>/)
  })
})
