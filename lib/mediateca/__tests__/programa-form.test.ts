import { describe, it, expect } from 'vitest'
import { PROGRAMA_VACIO, filaPrograma, idCanalYoutube, spotifyLimpio, validarPrograma } from '../programa-form'
import { duracionLegible, reproductorIvoox, reproductorSpotify } from '../mediateca'

describe('formulario de programa', () => {
  it('ID de canal desde ID o enlace; @usuario no', () => {
    expect(idCanalYoutube('UC9BFlzXJ2JIj4RB1D1vtVCQ')).toBe('UC9BFlzXJ2JIj4RB1D1vtVCQ')
    expect(idCanalYoutube('https://www.youtube.com/channel/UC9BFlzXJ2JIj4RB1D1vtVCQ/videos')).toBe('UC9BFlzXJ2JIj4RB1D1vtVCQ')
    expect(idCanalYoutube('https://www.youtube.com/@cartografiasteatrales')).toBeNull()
  })
  it('Spotify: solo el programa, sin ?si=', () => {
    expect(spotifyLimpio('https://open.spotify.com/show/4mazz6Us4aTySJ3MWIpuFl?si=abc')).toBe('https://open.spotify.com/show/4mazz6Us4aTySJ3MWIpuFl')
    expect(spotifyLimpio('https://open.spotify.com/episode/1s1u4szrg3t4VrL8Y06eUx')).toBeNull()
  })
  it('exige nombre y al menos una fuente de episodios', () => {
    expect(validarPrograma(PROGRAMA_VACIO)).toMatch(/nombre/)
    expect(validarPrograma({ ...PROGRAMA_VACIO, nombre: 'X' })).toMatch(/YouTube o el RSS/)
    expect(validarPrograma({ ...PROGRAMA_VACIO, nombre: 'X', youtube: '@x' })).toMatch(/UC/)
    expect(validarPrograma({ ...PROGRAMA_VACIO, nombre: 'X', rss_url: 'http://x' })).toMatch(/https/)
    const ok = { ...PROGRAMA_VACIO, nombre: 'Cartografías Teatrales', youtube: 'UC9BFlzXJ2JIj4RB1D1vtVCQ', spotify_url: 'https://open.spotify.com/show/4mazz6Us4aTySJ3MWIpuFl?si=1' }
    expect(validarPrograma(ok)).toBeNull()
    expect(filaPrograma(ok)).toMatchObject({ youtube_channel_id: 'UC9BFlzXJ2JIj4RB1D1vtVCQ', spotify_url: 'https://open.spotify.com/show/4mazz6Us4aTySJ3MWIpuFl', rss_url: null })
  })
})

describe('presentación', () => {
  it('duración legible', () => {
    expect(duracionLegible(2577)).toBe('43 min')
    expect(duracionLegible(3723)).toBe('1 h 2 min')
    expect(duracionLegible(null)).toBeNull()
  })
  it('reproductores de iVoox y Spotify', () => {
    expect(reproductorIvoox({ enlace_audio: 'https://www.ivoox.com/cartografias-teatrales-episodio-1-jorge-dubatti-audios-mp3_rf_102958105_1.html', audio_url: null }))
      .toBe('https://www.ivoox.com/player_ej_102958105_6_1.html')
    expect(reproductorIvoox({ enlace_audio: null, audio_url: 'https://www.ivoox.com/x_mf_102958105_feed_1.mp3' })).toBe('https://www.ivoox.com/player_ej_102958105_6_1.html')
    expect(reproductorIvoox({ enlace_audio: 'https://anchor.fm/x', audio_url: 'https://cdn.x/a.mp3' })).toBeNull()
    expect(reproductorSpotify('https://open.spotify.com/show/4mazz6Us4aTySJ3MWIpuFl')).toBe('https://open.spotify.com/embed/show/4mazz6Us4aTySJ3MWIpuFl')
  })
})
