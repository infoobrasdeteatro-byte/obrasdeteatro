-- Alertas de convocatorias personalizadas (planes de pago).
--
-- Una fila por usuario: qué países y categorías le interesan y cada cuánto
-- quiere el correo. La envía el cron /api/cron/alertas-convocatorias con la
-- clave de servicio; aquí solo se guarda la configuración.
--
-- Listas vacías = todos los países / todas las categorías.

-- 1. Tabla.
create table public.alertas_convocatorias (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  activa boolean not null default true,
  paises text[] not null default '{}',
  categorias text[] not null default '{}',
  frecuencia text not null default 'semanal',
  ultimo_envio_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Los 20 países del ámbito (la misma lista de calls.pais_code) y las cinco
  -- categorías de calls_category_check.
  constraint alertas_convocatorias_paises_check check (paises <@ array[
    'ES','AR','MX','CO','CL','PE','UY','PY','BO','EC',
    'VE','CR','PA','GT','HN','NI','SV','DO','CU','PR'
  ]::text[]),
  constraint alertas_convocatorias_categorias_check check (
    categorias <@ array['festival', 'premio', 'residencia', 'beca', 'ayuda']::text[]
  ),
  constraint alertas_convocatorias_frecuencia_check check (frecuencia in ('diaria', 'semanal'))
);

comment on table public.alertas_convocatorias is
  'Alertas de convocatorias por correo (planes de pago). Cada usuario ve y escribe solo la suya; ultimo_envio_at solo lo escribe el envío (clave de servicio).';

create trigger alertas_convocatorias_updated_at
  before update on public.alertas_convocatorias
  for each row execute function public.update_updated_at();

-- 2. RLS: cada usuario, su fila. Crear o cambiar la alerta exige plan de pago
--    (public.plan_de_pago(): plan distinto de gratuito). Borrarla, no: quien
--    deja de pagar puede quitarla igualmente. Mientras no pague, el envío la
--    ignora aunque siga activa.
alter table public.alertas_convocatorias enable row level security;

create policy "Alerta propia - lectura"
  on public.alertas_convocatorias for select
  using (profile_id = auth.uid());

create policy "Alerta propia - creación (plan de pago)"
  on public.alertas_convocatorias for insert
  with check (profile_id = auth.uid() and public.plan_de_pago());

create policy "Alerta propia - edición (plan de pago)"
  on public.alertas_convocatorias for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and public.plan_de_pago());

create policy "Alerta propia - borrado"
  on public.alertas_convocatorias for delete
  using (profile_id = auth.uid());

-- 3. Columnas que puede escribir el usuario. ultimo_envio_at (y las fechas)
--    quedan fuera: solo las escribe el envío, con la clave de servicio, para
--    que nadie pueda adelantar o retrasar su propia ventana de convocatorias.
revoke all on public.alertas_convocatorias from anon;
revoke insert, update, truncate on public.alertas_convocatorias from authenticated;
grant select, delete on public.alertas_convocatorias to authenticated;
grant insert (profile_id, activa, paises, categorias, frecuencia) on public.alertas_convocatorias to authenticated;
grant update (activa, paises, categorias, frecuencia) on public.alertas_convocatorias to authenticated;
