-- Cartelera (fase 1, parte 2): bucket «carteles» para el cartel de cada
-- espectáculo. Publica cualquier perfil (gratis), así que subir no exige plan:
-- solo la carpeta propia {user_id}/. Público para leer por URL (nombres
-- aleatorios); lo que decide qué se ENSEÑA es espectaculos.cartel_url, y la
-- web solo pinta URLs de este bucket y de la carpeta de quien publica.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('carteles', 'carteles', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Carteles: el dueño lee su carpeta"
  on storage.objects for select to authenticated
  using (bucket_id = 'carteles' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Carteles: el dueño sube"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'carteles' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Carteles: el dueño sustituye"
  on storage.objects for update to authenticated
  using (bucket_id = 'carteles' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'carteles' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Carteles: el dueño borra lo suyo"
  on storage.objects for delete to authenticated
  using (bucket_id = 'carteles' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Carteles: moderación lee"
  on storage.objects for select to authenticated
  using (bucket_id = 'carteles' and public.es_moderador());

create policy "Carteles: moderación retira"
  on storage.objects for delete to authenticated
  using (bucket_id = 'carteles' and public.es_moderador());
