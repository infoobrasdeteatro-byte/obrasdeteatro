import { describe, it, expect } from 'vitest'
import { descargarFeedYoutube } from '../importar'
import { urlFeedYoutubeSubidas } from '../feeds'

const CANAL = 'UCxsJKNct8hWaEUbomHFBEew'
const sinEspera = async () => {}

/** fetch falso que responde, por orden, con los códigos indicados. */
function fetchCon(codigos: number[]) {
  const pedidas: string[] = []
  const fetcher = (async (url: string) => {
    pedidas.push(url)
    const status = codigos[pedidas.length - 1] ?? 200
    return new Response(status === 200 ? '<feed/>' : '', { status })
  }) as unknown as typeof fetch
  return { fetcher, pedidas }
}

describe('urlFeedYoutubeSubidas', () => {
  it('pasa de UC… a la lista de subidas UU…', () => {
    expect(urlFeedYoutubeSubidas(CANAL)).toBe('https://www.youtube.com/feeds/videos.xml?playlist_id=UUxsJKNct8hWaEUbomHFBEew')
  })
  it('sin un ID de canal válido no hay segunda vía', () => {
    expect(urlFeedYoutubeSubidas('@cartografiasteatrales')).toBeNull()
    expect(urlFeedYoutubeSubidas('UCcorto')).toBeNull()
  })
})

describe('descargarFeedYoutube', () => {
  it('a la primera, una sola petición por channel_id', async () => {
    const { fetcher, pedidas } = fetchCon([200])
    expect(await descargarFeedYoutube(CANAL, fetcher, sinEspera)).toBe('<feed/>')
    expect(pedidas).toEqual([`https://www.youtube.com/feeds/videos.xml?channel_id=${CANAL}`])
  })

  it('ante un 404 reintenta con la lista de subidas', async () => {
    const { fetcher, pedidas } = fetchCon([404, 200])
    expect(await descargarFeedYoutube(CANAL, fetcher, sinEspera)).toBe('<feed/>')
    expect(pedidas[1]).toContain('playlist_id=UU')
  })

  it('alterna las dos vías y se rinde tras cuatro intentos con el último error', async () => {
    const { fetcher, pedidas } = fetchCon([404, 500, 404, 404, 200])
    await expect(descargarFeedYoutube(CANAL, fetcher, sinEspera)).rejects.toThrow('www.youtube.com respondió 404')
    expect(pedidas).toHaveLength(4)
    expect(pedidas.map(u => u.includes('channel_id'))).toEqual([true, false, true, false])
  })

  it('no reintenta errores que no se arreglan solos (403)', async () => {
    const { fetcher, pedidas } = fetchCon([403, 200])
    await expect(descargarFeedYoutube(CANAL, fetcher, sinEspera)).rejects.toThrow('respondió 403')
    expect(pedidas).toHaveLength(1)
  })
})
