-- Los archivos marcados como públicos (is_public) de obras publicadas se
--    pueden leer sin cuenta. Hasta ahora work_files solo tenía la política
--    «Archivos de obra propia», así que el botón «Leer obra» de la ficha
--    nunca aparecía a los visitantes, ni siquiera en las obras de dominio
--    público. Los archivos privados siguen siendo solo del dueño.
create policy "Archivos públicos de obras publicadas"
  on public.work_files for select
  using (
    is_public = true
    and exists (
      select 1 from public.works w
      where w.id = work_files.work_id and w.is_published = true and w.deleted_at is null
    )
  );
