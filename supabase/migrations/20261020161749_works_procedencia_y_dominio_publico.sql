-- Biblioteca: datos de procedencia y de dominio público de cada obra.
--
-- Primera carga masiva (Biblioteca Nacional de España, 20/10/2026): solo
-- obras cuyos autores murieron hace más de 100 años, libres en los 20 países
-- (México, el plazo más largo, protege 100 años tras la muerte). Se guarda el
-- año de muerte para poder abrir más adelante la biblioteca por país sin
-- revisar las fichas una a una.
--   author_death_year  año de muerte del último autor vivo de la obra
--                      (en obras a varias manos cuenta el último en morir).
--   license            licencia o condiciones de uso de la fuente
--                      (p. ej. «CC BY 4.0 · Biblioteca Nacional de España»).
--   external_ref       identificador del registro en la fuente
--                      (p. ej. «bne:a4629858»), para no duplicar en recargas.

alter table public.works
  add column if not exists author_death_year smallint,
  add column if not exists license text,
  add column if not exists external_ref text;

alter table public.works
  add constraint works_author_death_year_rango check (author_death_year is null or author_death_year between -800 and 2100),
  add constraint works_license_longitud check (license is null or char_length(license) <= 200),
  add constraint works_external_ref_longitud check (external_ref is null or char_length(external_ref) <= 120);

create unique index if not exists works_external_ref_unico
  on public.works (external_ref) where external_ref is not null and deleted_at is null;

comment on column public.works.author_death_year is
  'Año de muerte del último autor de la obra. Sirve para saber en qué países es de dominio público.';
comment on column public.works.license is
  'Licencia o condiciones de uso de la fuente de la que procede el texto.';
comment on column public.works.external_ref is
  'Identificador del registro en la fuente (bne:<idBNE>), único entre obras vivas.';
