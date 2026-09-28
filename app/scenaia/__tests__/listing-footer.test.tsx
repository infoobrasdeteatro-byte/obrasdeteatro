import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ChatMessage from '../components/ChatMessage'
import ListingFooter from '../components/ListingFooter'
import MARCADO_MAIN from './marcado-chat-message-main.json'

/** SCENAIA-004B §4.8 -- pie del listado y botón "Ver más", renderizados. */

const verMas = () => {}
const PAGINA_1 = { from: 1, to: 10, total: 11, nextOffset: 10 }
const ULTIMA = { from: 11, to: 11, total: 11, nextOffset: null }
const VACIA = { from: 21, to: 20, total: 11, nextOffset: null }

const tieneBoton = (html: string) => />Ver más<\/button>/.test(html)

describe('ListingFooter', () => {
  it('muestra el texto del pie', () => {
    expect(renderToStaticMarkup(<ListingFooter pagina={PAGINA_1} onVerMas={verMas} />)).toContain('Mostrando 1-10 de 11')
    expect(renderToStaticMarkup(<ListingFooter pagina={{ ...PAGINA_1, total: null }} onVerMas={verMas} />)).toContain('Mostrando 1-10<')
    expect(renderToStaticMarkup(<ListingFooter pagina={ULTIMA} />)).toContain('Mostrando 11 de 11')
    expect(renderToStaticMarkup(<ListingFooter pagina={{ from: 1, to: 10, total: 5000, nextOffset: 10 }} />)).toContain('Mostrando 1-10 de 5.000')
  })

  it('reutiliza los estilos del chat', () => {
    const html = renderToStaticMarkup(<ListingFooter pagina={PAGINA_1} onVerMas={verMas} />)
    expect(html).toContain('class="scenaia-notice"')
    expect(html).toContain('class="ds-btn-secondary"')
  })

  it('"Ver más" aparece solo con página siguiente y en la última respuesta', () => {
    expect(tieneBoton(renderToStaticMarkup(<ListingFooter pagina={PAGINA_1} onVerMas={verMas} />))).toBe(true)
  })

  it('sin "Ver más" cuando nextOffset es null', () => {
    expect(tieneBoton(renderToStaticMarkup(<ListingFooter pagina={ULTIMA} onVerMas={verMas} />))).toBe(false)
  })

  it('sin "Ver más" en una respuesta antigua (sin onVerMas)', () => {
    expect(tieneBoton(renderToStaticMarkup(<ListingFooter pagina={PAGINA_1} />))).toBe(false)
    expect(tieneBoton(renderToStaticMarkup(<ListingFooter pagina={PAGINA_1} onVerMas={null} />))).toBe(false)
  })

  it('página vacía: "No hay más obras en este listado" y sin botón', () => {
    const html = renderToStaticMarkup(<ListingFooter pagina={VACIA} onVerMas={verMas} />)
    expect(html).toContain('No hay más obras en este listado')
    expect(tieneBoton(html)).toBe(false)
  })

  it('con una petición en curso, el botón no se puede pulsar', () => {
    const html = renderToStaticMarkup(<ListingFooter pagina={PAGINA_1} onVerMas={verMas} bloqueado />)
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Ver más<\/button>/)
    expect(renderToStaticMarkup(<ListingFooter pagina={PAGINA_1} onVerMas={verMas} />)).not.toMatch(/disabled=""/)
  })
})

describe('ChatMessage', () => {
  it('sin listingPage, el marcado es idéntico al generado por main', () => {
    expect(renderToStaticMarkup(<ChatMessage role="assistant" content="En obras he encontrado 11 resultados:" />)).toBe(MARCADO_MAIN.asistente)
    expect(
      renderToStaticMarkup(<ChatMessage role="assistant" content="Respuesta" notice={{ kind: 'incompleta', text: 'La respuesta puede estar incompleta.' }} />)
    ).toBe(MARCADO_MAIN.asistenteConAviso)
    expect(renderToStaticMarkup(<ChatMessage role="assistant" content="Respuesta" notice={null} />)).toBe(MARCADO_MAIN.asistenteAvisoNull)
    expect(renderToStaticMarkup(<ChatMessage role="user" content="dame la lista de obras" />)).toBe(MARCADO_MAIN.usuario)
  })

  it('con listingPage null, también idéntico', () => {
    expect(renderToStaticMarkup(<ChatMessage role="assistant" content="Respuesta" notice={null} listingPage={null} />)).toBe(MARCADO_MAIN.asistenteAvisoNull)
  })

  it('con listingPage, el pie va bajo la respuesta, después del aviso', () => {
    const html = renderToStaticMarkup(
      <ChatMessage role="assistant" content="Respuesta" notice={{ kind: 'incompleta', text: 'Aviso' }} listingPage={PAGINA_1} onVerMas={verMas} />
    )
    expect(html.startsWith(MARCADO_MAIN.asistenteConAviso.slice(0, MARCADO_MAIN.asistenteConAviso.indexOf('Respuesta')))).toBe(true)
    expect(html.indexOf('Aviso')).toBeLessThan(html.indexOf('Mostrando 1-10 de 11'))
    expect(tieneBoton(html)).toBe(true)
  })

  it('un mensaje del usuario nunca pinta pie', () => {
    expect(renderToStaticMarkup(<ChatMessage role="user" content="x" listingPage={PAGINA_1} onVerMas={verMas} />)).not.toMatch(/Mostrando/)
  })
})
