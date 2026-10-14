-- Cartelera: el límite de espectáculos publicados por plan se comprueba
-- también al pedir publicar un espectáculo que va a revisión y cuando
-- moderación aprueba uno de la cola. Antes, un perfil sin verificar podía
-- acumular en revisión más de los que permite su plan y moderación los
-- publicaba sin control. Solo cambia la función del trigger.

create or replace function public.espectaculos_preparar()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  base_slug text;
  candidate text;
  counter int := 1;
  modera boolean := public.es_moderador();
  regla text;
  limite integer;
  plan_usuario text;
  verificado boolean;
  activos integer;
begin
  if tg_op = 'INSERT' then
    base_slug := left(public.slugificar(trim(new.titulo)), 80);
    if base_slug = '' then base_slug := 'espectaculo'; end if;
    candidate := base_slug;
    loop
      exit when not exists (select 1 from public.espectaculos where slug = candidate);
      counter := counter + 1;
      candidate := base_slug || '-' || counter;
    end loop;
    new.slug := candidate;
  else
    new.slug := old.slug;
    new.user_id := old.user_id;
    new.publicado_at := old.publicado_at;
  end if;

  if not modera then
    -- Lo que solo decide moderación.
    if tg_op = 'UPDATE' and old.estado = 'retirado' then
      raise exception 'Este espectáculo lo ha retirado el equipo de ObrasDeTeatro. Escríbenos a hola@obrasdeteatro.com si crees que es un error.';
    end if;
    new.origen := case when tg_op = 'INSERT' then 'usuario' else old.origen end;
    new.motivo_rechazo := case when tg_op = 'UPDATE' then old.motivo_rechazo else null end;
    if new.estado in ('rechazado', 'retirado') then
      new.estado := case when tg_op = 'UPDATE' then old.estado else 'borrador' end;
    end if;
    -- «Finalizado» es público: solo se llega desde uno ya publicado.
    if new.estado = 'finalizado' and (tg_op = 'INSERT' or old.estado not in ('publicado', 'finalizado')) then
      new.estado := case when tg_op = 'UPDATE' then old.estado else 'borrador' end;
    end if;
    -- Pedir publicar = pasar por revisión; y cambiar el texto de uno publicado, también.
    if new.estado = 'publicado' and (tg_op = 'INSERT' or old.estado <> 'publicado') then
      new.estado := 'pendiente_revision';
    end if;
    if tg_op = 'UPDATE' and old.estado in ('publicado', 'finalizado') and new.estado = old.estado
       and (new.titulo is distinct from old.titulo or new.sinopsis is distinct from old.sinopsis
            or new.cartel_url is distinct from old.cartel_url or new.compania_nombre is distinct from old.compania_nombre) then
      new.estado := 'pendiente_revision';
    end if;

    if new.estado = 'pendiente_revision' then
      select r.motivo into regla
        from public.moderacion_reglas r
       where r.activo
         and (
           (r.tipo = 'palabra' and (new.titulo ilike '%' || r.patron || '%' or coalesce(new.sinopsis, '') ilike '%' || r.patron || '%'
                                     or new.compania_nombre ilike '%' || r.patron || '%'))
           or (r.tipo = 'regex' and (new.titulo ~* r.patron or coalesce(new.sinopsis, '') ~* r.patron))
         )
       limit 1;
      if found then
        new.motivo_filtro := coalesce(regla, 'Contenido marcado por el filtro automático');
      else
        new.motivo_filtro := null;
        select p.verificado into verificado from public.profiles p where p.id = new.user_id;
        -- Perfil verificado y contenido limpio: sale publicado solo.
        if coalesce(verificado, false) then new.estado := 'publicado'; end if;
      end if;
    end if;
  end if;

  -- Límite de espectáculos publicados a la vez, según el plan. Se comprueba al
  -- pedir publicar (salga ya o vaya a revisión) y también cuando moderación
  -- aprueba uno que estaba en revisión; lo que moderación publica o restaura
  -- por su cuenta no cuenta.
  if (new.estado = 'publicado' and (tg_op = 'INSERT' or old.estado <> 'publicado')
        and (not modera or (tg_op = 'UPDATE' and old.estado = 'pendiente_revision')))
     or (not modera and new.estado = 'pendiente_revision'
        and (tg_op = 'INSERT' or old.estado not in ('publicado', 'pendiente_revision'))) then
    select p.plan::text into plan_usuario from public.profiles p where p.id = new.user_id;
    select l.max_activos into limite from public.cartelera_limites_plan l where l.plan = coalesce(plan_usuario, 'gratuito');
    if limite is not null then
      select count(*) into activos from public.espectaculos e
       where e.user_id = new.user_id and e.estado = 'publicado' and e.id <> new.id;
      if activos >= limite then
        raise exception 'Tu plan permite % espectáculo(s) publicado(s) a la vez. Finaliza alguno o mejora tu plan para publicar otro.', limite;
      end if;
    end if;
  end if;
  if new.estado = 'publicado' and (tg_op = 'INSERT' or old.estado <> 'publicado') then
    new.publicado_at := coalesce(new.publicado_at, now());
  end if;

  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end;
$$;
