-- Castings: editar el texto de un casting publicado vuelve a pasar por el filtro.
--
-- HUECO QUE CIERRA. El trigger se disparaba con `before insert or update of
-- estado`: solo reaccionaba al cambiar esa columna. De modo que publicar con
-- texto limpio y despues editar `descripcion`, `sinopsis` o
-- `perfil_descripcion` sin tocar `estado` dejaba el texto nuevo publicado sin
-- que el filtro lo viera jamas. El camino para colar una estafa era: publicar
-- algo inocuo, esperar a que el filtro lo apruebe, y reescribirlo despues.
--
-- Se cierra por los dos lados a la vez, y hacen falta los dos:
--   - La lista de columnas del `of` pasa a incluir los tres campos filtrados,
--     para que el trigger llegue a ejecutarse cuando cambian.
--   - Un bloque nuevo al principio de la funcion devuelve a
--     'pendiente_revision' cualquier casting publicado cuyo texto cambie, que
--     es lo que hace que el filtro vuelva a correr sobre el.
--
-- Del resto de la funcion no cambia nada: el guard de moderacion, el filtro,
-- el cupo por plan y el espejo de `publicado` quedan literalmente igual que en
-- 20260911221359, `if found` incluido -- decidir por FOUND y no por
-- "motivo is not null" es lo que hace que una regla activa sin motivo declarado
-- siga reteniendo.

drop trigger if exists trg_castings_sync_estado on public.castings;

create or replace function public.castings_sync_estado()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_plan text;
  v_limite integer;
  v_activos integer;
  v_regla_motivo text;
begin
  -- (0) NUEVO: reeditar el contenido de un casting ya publicado lo devuelve a
  --     revision. No basta con volver a filtrarlo dejandolo publicado: si el
  --     texto nuevo dispara una regla, el casting tiene que dejar de estar
  --     visible mientras un humano lo mira, no seguir publicado con una nota.
  --     Solo cuentan los tres campos que el filtro lee; cambiar ciudad, fechas
  --     o importe no reabre revision.
  if tg_op = 'UPDATE'
     and old.estado = 'publicado'
     and new.estado = 'publicado'
     and (
       new.descripcion is distinct from old.descripcion
       or new.sinopsis is distinct from old.sinopsis
       or new.perfil_descripcion is distinct from old.perfil_descripcion
     )
  then
    new.estado := 'pendiente_revision';
  end if;

  -- (a) Solo admin/moderator fijan directamente 'publicado' o 'rechazado'.
  if new.estado in ('publicado', 'rechazado') then
    if not public.es_moderador() then
      new.estado := 'pendiente_revision';
    end if;
  end if;

  if new.estado = 'pendiente_revision' then
    -- (b) Filtro de contenido.
    select motivo into v_regla_motivo
    from public.moderacion_reglas
    where activo = true
      and (
        (tipo = 'palabra' and (
          new.descripcion ilike '%' || patron || '%'
          or new.sinopsis ilike '%' || patron || '%'
          or new.perfil_descripcion ilike '%' || patron || '%'
        ))
        or
        (tipo = 'regex' and (
          new.descripcion ~* patron
          or new.sinopsis ~* patron
          or new.perfil_descripcion ~* patron
        ))
      )
    limit 1;

    if found then
      new.motivo_filtro := v_regla_motivo;
    else
      -- (c) Cupo de castings publicados simultaneos.
      select plan into v_plan from public.profiles where id = new.user_id;

      v_limite := case v_plan
        when 'premium'   then 3
        when 'destacado' then 10
        when 'empresas'  then null
        else 0
      end;

      if v_limite is not null then
        select count(*) into v_activos
        from public.castings
        where user_id = new.user_id
          and estado = 'publicado'
          and id <> new.id;

        if v_activos >= v_limite then
          raise exception 'Límite de castings activos alcanzado para tu plan (%). Cierra alguno antes de publicar otro.', v_limite;
        end if;
      end if;

      new.estado := 'publicado';
      new.motivo_filtro := null;
    end if;
  end if;

  new.publicado := (new.estado = 'publicado');
  return new;
end;
$$;

-- La lista de columnas del `of` es la otra mitad del arreglo: sin ella, el
-- bloque (0) no llegaria a ejecutarse nunca en una edicion de solo texto.
create trigger trg_castings_sync_estado
  before insert or update of estado, descripcion, sinopsis, perfil_descripcion
  on public.castings
  for each row
  execute function public.castings_sync_estado();
