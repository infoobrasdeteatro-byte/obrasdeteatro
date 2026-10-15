-- Cartelera: ficha artística más completa. Nuevos papeles: ayudantía de
-- dirección, traducción, producción ejecutiva, maquillaje y caracterización,
-- peluquería, atrezo, dirección musical, audiovisuales, dirección técnica,
-- equipo técnico, regiduría, diseño gráfico, fotografía, prensa y
-- comunicación y distribución. Los que ya existían siguen igual.

alter table public.espectaculo_personas drop constraint espectaculo_personas_rol;
alter table public.espectaculo_personas add constraint espectaculo_personas_rol check (rol in (
  'reparto', 'direccion', 'ayudante_direccion', 'autoria', 'dramaturgia', 'adaptacion', 'traduccion',
  'produccion', 'produccion_ejecutiva', 'escenografia', 'iluminacion', 'vestuario', 'maquillaje', 'peluqueria',
  'atrezzo', 'musica', 'direccion_musical', 'coreografia', 'sonido', 'video', 'direccion_tecnica',
  'tecnica', 'regiduria', 'diseno_grafico', 'fotografia', 'comunicacion', 'distribucion', 'otro'
));
