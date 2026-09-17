-- Castings: el contacto deja de ser legible por consulta directa.
--
-- LA BRECHA. email_recepcion, url_externa y telefono_contacto eran columnas
-- normales de una tabla cuya politica "Castings públicos" autoriza leer la
-- FILA ENTERA de cualquier casting publicado. Que la ficha publica no pidiera
-- esas tres columnas no protegia nada: la anon key es publica por diseno, y
-- cualquiera podia pedirlas por API sin pasar por la aplicacion. La decision
-- de negocio -- que la unica via de postulacion sea el boton de la plataforma
-- -- estaba escrita solo en la plantilla, no en la base.
--
-- Se cierra donde tiene que estar: revocando el permiso de SELECT sobre esas
-- tres columnas. A partir de aqui NADIE las lee por consulta directa, ni
-- siquiera el propio dueno del casting; todo el mundo pasa por la funcion.
--
-- La escritura no se toca: el REVOKE solo afecta a SELECT, de modo que INSERT
-- y UPDATE del formulario siguen funcionando igual.
revoke select (email_recepcion, url_externa, telefono_contacto)
  on public.castings from anon, authenticated;

-- Unica via de lectura, con la regla de quien puede ver que:
--
--   - el dueno del casting, para poder editarlo;
--   - moderacion, para poder revisar lo que se publica;
--   - quien YA SE POSTULO a ese casting concreto.
--
-- La tercera es la que cierra el otro hueco: hasta ahora el actor no veia el
-- contacto del organizador en ningun momento, ni siquiera despues de
-- presentarse. Postularse es el acto que abre esa puerta, y solo para ese
-- casting.
--
-- Devuelve 0 filas -- no una fila de nulos -- a quien no cumple ninguna
-- condicion: la ausencia de derecho y la ausencia de dato no se confunden.
create or replace function public.contacto_del_casting(p_casting_id uuid)
returns table (
  email_recepcion text,
  url_externa text,
  telefono_contacto text
)
language sql
stable
security definer
set search_path = 'public'
as $$
  select c.email_recepcion, c.url_externa, c.telefono_contacto
  from public.castings c
  where c.id = p_casting_id
    and (
      c.user_id = auth.uid()
      or public.es_moderador()
      or exists (
        select 1 from public.casting_applications ca
        where ca.casting_id = c.id
          and ca.applicant_id = auth.uid()
      )
    );
$$;

comment on function public.contacto_del_casting(uuid) is
  'Unica via de lectura de los datos de contacto de un casting. Las columnas estan revocadas para anon y authenticated: sin esta funcion no son legibles. Devuelve 0 filas a quien no sea el dueno, moderacion, o alguien que ya se postulo a ese casting.';
