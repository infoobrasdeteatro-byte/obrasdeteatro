import { describe, it, expect } from 'vitest'
import { leerFeedYoutube, leerFeedPodcast, claveEpisodio, duracionASegundos, textoPlano } from '../feeds'
import { planificar } from '../importar'

const YOUTUBE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <title>Cartografias teatrales</title>
 <entry>
  <id>yt:video:AbCdEfGhIj1</id>
  <yt:videoId>AbCdEfGhIj1</yt:videoId>
  <title>Jorge Dubatti - Cartografías teatrales. Episodio 1</title>
  <published>2023-02-12T18:00:00+00:00</published>
  <media:group>
   <media:title>Jorge Dubatti - Cartografías teatrales. Episodio 1</media:title>
   <media:description>Conversamos con el investigador &amp; crítico Jorge Dubatti.</media:description>
   <media:thumbnail url="https://i1.ytimg.com/vi/AbCdEfGhIj1/hqdefault.jpg" width="480" height="360"/>
  </media:group>
 </entry>
 <entry>
  <yt:videoId>ZzZzZzZzZz5</yt:videoId>
  <title>Cartografías teatrales. Episodio 55: Graciela Spinelli</title>
  <published>2026-07-20T18:00:00+00:00</published>
 </entry>
 <entry>
  <yt:videoId>malo</yt:videoId>
  <title>Sin id válido</title>
  <published>2026-07-20T18:00:00+00:00</published>
 </entry>
</feed>`

const PODCAST = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
 <channel>
  <title>Cartografias Teatrales</title>
  <itunes:image href="https://static-1.ivoox.com/canales/portada.jpg"/>
  <item>
   <title>Cartografias Teatrales. Episodio 1: Jorge Dubatti</title>
   <link>https://www.ivoox.com/cartografias-teatrales-episodio-1-jorge-dubatti-audios-mp3_rf_102958105_1.html</link>
   <guid isPermaLink="false">ivoox-102958105</guid>
   <pubDate>Sun, 12 Feb 2023 18:30:00 +0100</pubDate>
   <description><![CDATA[<p>En este primer episodio conversamos con el investigador teatral <b>Jorge Dubatti</b>.</p>]]></description>
   <enclosure url="https://www.ivoox.com/episodio_mf_102958105_feed_1.mp3" type="audio/mpeg" length="0"/>
   <itunes:duration>42:57</itunes:duration>
  </item>
  <item>
   <title>Edición especial: Cristina Castrillo</title>
   <guid>ivoox-2</guid>
   <pubDate>Sun, 18 May 2025 10:00:00 +0200</pubDate>
   <enclosure url="https://www.ivoox.com/especial.mp3" type="audio/mpeg"/>
   <itunes:duration>2100</itunes:duration>
  </item>
  <item>
   <title>Sin audio</title>
   <pubDate>Sun, 18 May 2025 10:00:00 +0200</pubDate>
  </item>
 </channel>
</rss>`

describe('feeds', () => {
  it('lee el RSS de YouTube y descarta entradas sin id válido', () => {
    const v = leerFeedYoutube(YOUTUBE)
    expect(v).toHaveLength(2)
    expect(v[0]).toMatchObject({
      fuente: 'youtube', youtube_video_id: 'AbCdEfGhIj1', clave: 'ep:1',
      descripcion: 'Conversamos con el investigador & crítico Jorge Dubatti.',
      imagen_url: 'https://i.ytimg.com/vi/AbCdEfGhIj1/hqdefault.jpg',
    })
    expect(v[0].fecha_publicacion).toBe('2023-02-12T18:00:00.000Z')
  })

  it('lee el RSS de podcast: audio, duración, texto sin HTML e imagen del canal', () => {
    const a = leerFeedPodcast(PODCAST)
    expect(a).toHaveLength(2)
    expect(a[0]).toMatchObject({
      fuente: 'audio', audio_guid: 'ivoox-102958105', duracion_segundos: 2577, clave: 'ep:1',
      audio_url: 'https://www.ivoox.com/episodio_mf_102958105_feed_1.mp3',
      descripcion: 'En este primer episodio conversamos con el investigador teatral Jorge Dubatti.',
      imagen_url: 'https://static-1.ivoox.com/canales/portada.jpg',
    })
    expect(a[1].duracion_segundos).toBe(2100)
  })

  it('XML roto o vacío no rompe: devuelve lista vacía', () => {
    expect(leerFeedYoutube('<html>no</html>')).toEqual([])
    expect(leerFeedPodcast('')).toEqual([])
  })

  it('claves y utilidades', () => {
    expect(claveEpisodio('Jorge Dubatti - Cartografías teatrales. Episodio 1')).toBe('ep:1')
    expect(claveEpisodio('Cartografias Teatrales. Episodio 1: Jorge Dubatti')).toBe('ep:1')
    expect(claveEpisodio('Ep. 12 - Algo')).toBe('ep:12')
    expect(claveEpisodio('Edición especial: Cristina Castrillo')).toBe('t:edicion especial cristina castrillo')
    expect(duracionASegundos('1:02:03')).toBe(3723)
    expect(duracionASegundos('abc')).toBeNull()
    expect(textoPlano('<p>a</p><p>b</p>')).toBe('a\n\nb')
  })
})

describe('planificar', () => {
  const fuentes = [...leerFeedYoutube(YOUTUBE), ...leerFeedPodcast(PODCAST)]

  it('primera importación: el episodio 1 de YouTube y de iVoox es una sola ficha', () => {
    const { nuevos, cambios } = planificar([], fuentes)
    expect(nuevos).toHaveLength(3)
    const ep1 = nuevos.find(n => n.clave === 'ep:1')!
    expect(ep1.audio_guid).toBe('ivoox-102958105')
    expect(ep1.youtube_video_id).toBe('AbCdEfGhIj1')
    expect(ep1.duracion_segundos).toBe(2577)
    expect(cambios.size).toBe(0)
  })

  it('segunda importación: nada nuevo; un vídeo nuevo se cuelga del audio existente', () => {
    const existente = {
      id: 'e1', titulo: 'Cartografias Teatrales. Episodio 1: Jorge Dubatti', descripcion: 'x', duracion_segundos: 2577,
      imagen_url: null, youtube_video_id: null, audio_guid: 'ivoox-102958105', audio_url: 'https://a.mp3', enlace_audio: null,
    }
    const { nuevos, cambios } = planificar([existente], fuentes.filter(f => f.clave === 'ep:1'))
    expect(nuevos).toHaveLength(0)
    expect(cambios.get('e1')).toMatchObject({ youtube_video_id: 'AbCdEfGhIj1' })
  })
})

describe('canal compartido con filtro de título', () => {
  const CANAL = `<?xml version="1.0"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <entry><yt:videoId>5Bz-lG1sIko</yt:videoId><title>Cartografía Teatral</title><published>2026-08-27T01:00:00+00:00</published>
  <media:group><media:description>CARTOGRAFÍA TEATRAL Invitada: Patricio Yované Conduce: Guillermo Pallacán #teatro #chile</media:description></media:group></entry>
 <entry><yt:videoId>AAAAAAAAAA1</yt:videoId><title>Clase en vivo 1. Ética y responsabilidad social en medios</title><published>2026-08-28T01:00:00+00:00</published></entry>
 <entry><yt:videoId>AAAAAAAAAA2</yt:videoId><title>CARTOGRAFIA TEATRAL</title><published>2026-09-03T01:00:00+00:00</published>
  <media:group><media:description>Invitado: Juan Pérez
Conduce: Guillermo Pallacán</media:description></media:group></entry>
</feed>`

  it('solo entran los vídeos del programa, con el invitado en el título', () => {
    const v = leerFeedYoutube(CANAL, { filtroTitulo: 'Cartografía Teatral' })
    expect(v.map(x => x.youtube_video_id)).toEqual(['5Bz-lG1sIko', 'AAAAAAAAAA2'])
    expect(v[0].titulo).toBe('Cartografía Teatral: Patricio Yované')
    expect(v[1].titulo).toBe('CARTOGRAFIA TEATRAL: Juan Pérez')
    expect(v[0].clave).not.toBe(v[1].clave)
  })

  it('sin filtro entra todo el canal y el título no cambia', () => {
    const v = leerFeedYoutube(CANAL)
    expect(v).toHaveLength(3)
    expect(v[0].titulo).toBe('Cartografía Teatral')
  })
})

describe('limpieza de descripciones', () => {
  it('quita líneas de puntos y hashtags, conserva el texto', () => {
    const d = 'CARTOGRAFÍA TEATRAL\nInvitada: Carmen Aros\nConduce: Guillermo Pallacán\n.\n.\n.\n.\n#teatro #santiago #artes\n#tvrñuble #ñuble #nuble\n#Diguillín #ChillánViejo'
    expect(textoPlano(d)).toBe('CARTOGRAFÍA TEATRAL\nInvitada: Carmen Aros\nConduce: Guillermo Pallacán')
  })
  it('respeta párrafos y el texto con # dentro de palabras', () => {
    expect(textoPlano('<p>Hola</p><p>Episodio 3 de C#</p>')).toBe('Hola\n\nEpisodio 3 de C#')
  })
})
