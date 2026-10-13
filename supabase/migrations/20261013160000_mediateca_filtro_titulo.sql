-- Mediateca: filtro por título para canales de YouTube compartidos.
--
-- Algunos programas se emiten en el canal de otro (p. ej. «Cartografía
-- Teatral» de la Revista SATCH, en el canal de TVR Ñuble). Con filtro_titulo,
-- de ese canal solo se importan los vídeos cuyo título lo contiene (sin
-- distinguir mayúsculas ni tildes). Vacío = todo el canal, como hasta ahora.

alter table public.mediateca_programas
  add column filtro_titulo text,
  add constraint mediateca_programas_filtro_longitud check (filtro_titulo is null or char_length(btrim(filtro_titulo)) between 2 and 120);

comment on column public.mediateca_programas.filtro_titulo is
  'Si se indica, del canal de YouTube solo se importan los vídeos cuyo título lo contiene (sin mayúsculas ni tildes).';
