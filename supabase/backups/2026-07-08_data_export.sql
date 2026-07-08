-- =============================================================================
-- DATA EXPORT — ObrasDeTeatro®
-- Exportado: 2026-07-08
-- Proyecto Supabase: pnsirwtiiurczjwrayza (eu-west-1)
-- Sprint: INFRA-001
--
-- Contiene los datos de las tablas con contenido real:
--   · institutions (1 fila)
--   · works         (10 filas — Colección Fundacional: Calderón + Lope de Vega)
--   · work_files    (11 filas — 10 enlaces Cervantes Virtual + 1 placeholder)
--
-- Las demás tablas (profiles, subscriptions, etc.) contienen datos de usuarios
-- y NO se exportan aquí por privacidad. Restaurarlos requeriría recrear los
-- usuarios en Supabase Auth y reinsertar manualmente.
--
-- Para restaurar:
--   1. Ejecutar baseline_schema.sql
--   2. Ejecutar este archivo
-- =============================================================================

-- -----------------------------------------------------------------------------
-- INSTITUTIONS
-- -----------------------------------------------------------------------------
INSERT INTO public.institutions (id, name, slug, type, country_code, website, is_public, is_active, created_at)
VALUES (
  'd0a54895-ac1a-4dc4-9286-9ff84c9841ee',
  'Biblioteca Oficial ObrasDeTeatro®',
  'biblioteca-oficial',
  'platform',
  'ES',
  NULL,
  true,
  true,
  '2026-06-28 18:01:58.251581+00'
);

-- -----------------------------------------------------------------------------
-- WORKS — Colección Fundacional
-- -----------------------------------------------------------------------------

-- Lote 001: Pedro Calderón de la Barca (5 obras)

INSERT INTO public.works (
  id, title, subtitle, author, slug, genre, secondary_genres,
  synopsis, synopsis_short, synopsis_full,
  duration_minutes, min_age, cast_size_min, cast_size_max,
  language, country_code, year, rights_status, access_type,
  source_name, source_url, is_library_work, is_published,
  institution_id, created_at
) VALUES (
  '4bfbe073-a590-4974-8dca-95d26187d76a',
  'La vida es sueño',
  NULL,
  'Pedro Calderón de la Barca',
  'la-vida-es-sueno-calderon-de-la-barca',
  'Teatro clásico',
  ARRAY['Drama','Teatro barroco','Teatro del Siglo de Oro'],
  'El príncipe Segismundo descubre que la realidad y los sueños pueden ser indistinguibles, en este drama filosófico del Siglo de Oro español.',
  'El príncipe Segismundo descubre que la realidad y los sueños pueden ser indistinguibles, en este drama filosófico del Siglo de Oro español.',
  'Drama filosófico en tres jornadas, escrito hacia 1635. Segismundo ha sido encerrado desde niño en una torre por su padre, el rey Basilio de Polonia, quien creyó en un horóscopo que auguraba desgracias. Al ser liberado brevemente, sus actos violentos parecen confirmar la profecía. Devuelto a la prisión, le hacen creer que todo fue un sueño. Cuando el pueblo lo libera para combatir a su padre, Segismundo actúa con justicia y clemencia, demostrando que el ser humano puede vencer su destino.',
  120, 14, 3, 6,
  'es', 'ES', 1635, 'public_domain', 'public_download',
  'Biblioteca Digital Hispánica — Biblioteca Nacional de España',
  'https://bdh.bne.es',
  true, true,
  'd0a54895-ac1a-4dc4-9286-9ff84c9841ee',
  '2026-06-28 18:31:39.047542+00'
);

INSERT INTO public.works (
  id, title, subtitle, author, slug, genre, secondary_genres,
  synopsis, synopsis_short, synopsis_full,
  duration_minutes, min_age, cast_size_min, cast_size_max,
  language, country_code, year, rights_status, access_type,
  source_name, source_url, is_library_work, is_published,
  institution_id, created_at
) VALUES (
  'f531ebd7-14f5-46d3-b9a6-61a7068ef9c9',
  'El gran teatro del mundo',
  'Auto sacramental',
  'Pedro Calderón de la Barca',
  'el-gran-teatro-del-mundo-calderon-de-la-barca',
  'Auto sacramental',
  ARRAY['Teatro religioso','Teatro alegórico','Teatro barroco','Teatro del Siglo de Oro'],
  'Alegoría religiosa en la que Dios encomienda a sus criaturas representar el drama de la vida humana sobre el gran teatro del mundo.',
  'Alegoría religiosa en la que Dios encomienda a sus criaturas representar el drama de la vida humana sobre el gran teatro del mundo.',
  'Auto sacramental en una jornada. El Autor (Dios) convoca al Mundo para que disponga un teatro donde sus criaturas representarán la comedia de la vida. A cada personaje alegórico —el Rico, el Rey, la Hermosura, el Labrador, el Pobre, la Discreción— se le asigna un papel sin poder elegirlo. Al final de la representación, cada uno debe rendir cuentas de cómo lo ha desempeñado. La obra concluye con el Sacramento de la Eucaristía como colofón doctrinal.',
  75, 12, 4, 10,
  'es', 'ES', 1655, 'public_domain', 'public_download',
  'Biblioteca Virtual Miguel de Cervantes',
  'https://www.cervantesvirtual.com/portales/calderon_de_la_barca/',
  true, true,
  'd0a54895-ac1a-4dc4-9286-9ff84c9841ee',
  '2026-06-28 22:11:59.447839+00'
);

INSERT INTO public.works (
  id, title, subtitle, author, slug, genre, secondary_genres,
  synopsis, synopsis_short, synopsis_full,
  duration_minutes, min_age, cast_size_min, cast_size_max,
  language, country_code, year, rights_status, access_type,
  source_name, source_url, is_library_work, is_published,
  institution_id, created_at
) VALUES (
  '3a06cfdf-78cc-45de-a078-513a27b9b5a2',
  'El alcalde de Zalamea',
  NULL,
  'Pedro Calderón de la Barca',
  'el-alcalde-de-zalamea-calderon-de-la-barca',
  'Drama de honor',
  ARRAY['Drama','Teatro del Siglo de Oro','Teatro histórico','Comedia de capa y espada'],
  'Pedro Crespo, labrador rico de Zalamea, defiende su honra y la de su hija Isabel frente al abuso de un capitán, en este drama sobre la dignidad y la justicia.',
  'Pedro Crespo, labrador rico de Zalamea, defiende su honra y la de su hija Isabel frente al abuso de un capitán, en este drama sobre la dignidad y la justicia.',
  'En el siglo XVII, el ejército acantona tropas en Zalamea de la Serena. El capitán don Álvaro de Ataide se encapricha de Isabel, hija del rico labrador Pedro Crespo, y la deshonra durante la noche. Nombrado alcalde al día siguiente, Crespo intenta llegar a un acuerdo con el capitán y le ofrece su fortuna entera a cambio del matrimonio. El capitán se niega. Crespo lo apresa, lo juzga y lo condena a garrote, invocando su autoridad jurisdiccional. El rey Felipe II, al llegar, en lugar de castigarlo, lo nombra alcalde perpetuo.',
  110, 14, 4, 12,
  'es', 'ES', 1636, 'public_domain', 'public_download',
  'Biblioteca Virtual Miguel de Cervantes',
  'https://www.cervantesvirtual.com/portales/calderon_de_la_barca/',
  true, true,
  'd0a54895-ac1a-4dc4-9286-9ff84c9841ee',
  '2026-06-28 22:11:59.447839+00'
);

INSERT INTO public.works (
  id, title, subtitle, author, slug, genre, secondary_genres,
  synopsis, synopsis_short, synopsis_full,
  duration_minutes, min_age, cast_size_min, cast_size_max,
  language, country_code, year, rights_status, access_type,
  source_name, source_url, is_library_work, is_published,
  institution_id, created_at
) VALUES (
  'e580a304-184f-4b6c-8365-cb34c6a29229',
  'La dama duende',
  NULL,
  'Pedro Calderón de la Barca',
  'la-dama-duende-calderon-de-la-barca',
  'Comedia de enredo',
  ARRAY['Comedia','Teatro barroco','Teatro del Siglo de Oro','Comedia de capa y espada'],
  'Doña Ángela, viuda encerrada en casa de sus hermanos, se comunica en secreto con el huésped don Manuel a través de una alacena secreta, en esta brillante comedia de enredo.',
  'Doña Ángela, viuda encerrada en casa de sus hermanos, se comunica en secreto con el huésped don Manuel a través de una alacena secreta, en esta brillante comedia de enredo.',
  'Doña Ángela vive encerrada en casa de sus hermanos don Luis y don Juan, que guardan celosamente su viudez. Cuando don Juan trae como huésped al caballero don Manuel, Ángela descubre que entre su aposento y el de su huésped hay una alacena con puerta secreta. A través de ella se introduce en la habitación de don Manuel, le deja cartas y roba objetos sin que él pueda comprender quién es esa misteriosa mujer. La confusión crece con los celos de don Luis y los equívocos de los criados, hasta que el enredo se resuelve y los enamorados pueden unirse.',
  100, 12, 4, 9,
  'es', 'ES', 1629, 'public_domain', 'public_download',
  'Biblioteca Virtual Miguel de Cervantes',
  'https://www.cervantesvirtual.com/portales/calderon_de_la_barca/',
  true, true,
  'd0a54895-ac1a-4dc4-9286-9ff84c9841ee',
  '2026-06-28 22:11:59.447839+00'
);

INSERT INTO public.works (
  id, title, subtitle, author, slug, genre, secondary_genres,
  synopsis, synopsis_short, synopsis_full,
  duration_minutes, min_age, cast_size_min, cast_size_max,
  language, country_code, year, rights_status, access_type,
  source_name, source_url, is_library_work, is_published,
  institution_id, created_at
) VALUES (
  '2f7a12a0-9a50-47e7-b87d-f1dd8ee7da33',
  'Casa con dos puertas mala es de guardar',
  NULL,
  'Pedro Calderón de la Barca',
  'casa-con-dos-puertas-mala-es-de-guardar-calderon-de-la-barca',
  'Comedia de enredo',
  ARRAY['Comedia','Teatro barroco','Teatro del Siglo de Oro','Comedia de capa y espada'],
  'Félix visita en secreto a su amada Marcela en casa de su amigo Lisardo, sin saber que este corteja a su propia hermana, en esta enredosa comedia de equívocos y puertas.',
  'Félix visita en secreto a su amada Marcela en casa de su amigo Lisardo, sin saber que este corteja a su propia hermana, en esta enredosa comedia de equívocos y puertas.',
  'El galán Félix está enamorado de Marcela, que vive junto a su prima Lisarda en una casa con dos puertas. Su amigo Lisardo, que desconoce los amores de Félix con Marcela, también ronda esa casa enamorado de Lisarda. Félix no sabe que Lisardo pretende a su hermana Laura. Las visitas secretas, los malentendidos entre criados, las identidades confundidas y las puertas que permiten entradas incontrolables generan un enredo de creciente comicidad hasta el desenlace donde todos los amores quedan ordenados.',
  100, 12, 4, 9,
  'es', 'ES', 1629, 'public_domain', 'public_download',
  'Biblioteca Virtual Miguel de Cervantes',
  'https://www.cervantesvirtual.com/portales/calderon_de_la_barca/',
  true, true,
  'd0a54895-ac1a-4dc4-9286-9ff84c9841ee',
  '2026-06-28 22:11:59.447839+00'
);

-- Lote 002: Lope de Vega (5 obras)

INSERT INTO public.works (
  id, title, subtitle, author, slug, genre, secondary_genres,
  synopsis, synopsis_short, synopsis_full,
  duration_minutes, min_age, cast_size_min, cast_size_max,
  language, country_code, year, rights_status, access_type,
  source_name, source_url, is_library_work, is_published,
  institution_id, created_at
) VALUES (
  '7bdcd0d5-7ea5-4976-a370-396e8729c1f7',
  'Peribáñez y el Comendador de Ocaña',
  NULL,
  'Lope de Vega',
  'peribanez-y-el-comendador-de-ocana-lope-de-vega',
  'Drama de honor',
  ARRAY['Drama social','Teatro del Siglo de Oro','Teatro barroco','Teatro histórico'],
  'Peribáñez, labrador recién casado, ve cómo el Comendador de Ocaña acosa a su mujer Casilda. El noble lo asciende a capitán para alejarlo. Peribáñez regresa a tiempo, mata al Comendador y se presenta ante los Reyes Católicos reivindicando su honor.',
  'Peribáñez, labrador recién casado, ve cómo el Comendador de Ocaña acosa a su mujer Casilda. El noble lo asciende a capitán para alejarlo. Peribáñez regresa a tiempo, mata al Comendador y se presenta ante los Reyes Católicos reivindicando su honor.',
  'Una de las grandes obras del teatro de honor del Siglo de Oro, con la particularidad de otorgar al protagonista villano una dignidad moral superior a la del noble. El Comendador, prendado de Casilda desde el día de la boda, urde un plan para alejar a Peribáñez. El labriego regresa antes de lo esperado y da muerte al noble. Al presentarse ante Fernando e Isabel no se disculpa: actúa como caballero porque ha recibido el grado de su señor, y la honra confiere obligaciones para ambas partes. La fecha de composición se sitúa entre 1605 y 1612; 1610 es el año más citado en la bibliografía académica.',
  110, 14, 12, 20,
  'es', 'ES', 1610, 'public_domain', 'public_download',
  'Biblioteca Virtual Miguel de Cervantes',
  'https://www.cervantesvirtual.com/portales/lope_de_vega/',
  true, true,
  'd0a54895-ac1a-4dc4-9286-9ff84c9841ee',
  '2026-06-29 16:56:19.916448+00'
);

INSERT INTO public.works (
  id, title, subtitle, author, slug, genre, secondary_genres,
  synopsis, synopsis_short, synopsis_full,
  duration_minutes, min_age, cast_size_min, cast_size_max,
  language, country_code, year, rights_status, access_type,
  source_name, source_url, is_library_work, is_published,
  institution_id, created_at
) VALUES (
  'a47b87c4-3cf6-4eea-9c1f-2dd9f86932c8',
  'El caballero de Olmedo',
  NULL,
  'Lope de Vega',
  'el-caballero-de-olmedo-lope-de-vega',
  'Tragicomedia',
  ARRAY['Drama de honor','Teatro del Siglo de Oro','Teatro barroco','Teatro histórico'],
  'Don Alonso, el caballero más admirado de Olmedo, se enamora de Inés durante las fiestas de Medina. Pese a presagios y advertencias, acude a la ciudad y es asesinado en el camino de vuelta por el despechado don Rodrigo.',
  'Don Alonso, el caballero más admirado de Olmedo, se enamora de Inés durante las fiestas de Medina. Pese a presagios y advertencias, acude a la ciudad y es asesinado en el camino de vuelta por el despechado don Rodrigo.',
  'Inspirada en el antiguo cantar popular «Que de noche le mataron / al caballero», la obra comienza como comedia de galanteo y vira hacia la tragedia cuando don Alonso es asesinado en el camino entre Medina y Olmedo. Los primeros actos tienen tono festivo; los últimos se impregnan de fatalidad: apariciones, sombras y presagios anuncian la muerte del protagonista sin que él pueda evitarla. Don Alonso es víctima de su propia excelencia, destruido por la envidia de quienes no pueden igualarlo. La fecha de composición se sitúa entre 1620 y 1625; la primera edición impresa es de 1641 (Veinte y una parte verdadera de las comedias del Fénix).',
  110, 14, 10, 18,
  'es', 'ES', 1641, 'public_domain', 'public_download',
  'Biblioteca Virtual Miguel de Cervantes',
  'https://www.cervantesvirtual.com/portales/lope_de_vega/',
  true, true,
  'd0a54895-ac1a-4dc4-9286-9ff84c9841ee',
  '2026-06-29 16:56:19.916448+00'
);

INSERT INTO public.works (
  id, title, subtitle, author, slug, genre, secondary_genres,
  synopsis, synopsis_short, synopsis_full,
  duration_minutes, min_age, cast_size_min, cast_size_max,
  language, country_code, year, rights_status, access_type,
  source_name, source_url, is_library_work, is_published,
  institution_id, created_at
) VALUES (
  'ea4abd51-2956-406a-a524-b56c7c5a3353',
  'El perro del hortelano',
  NULL,
  'Lope de Vega',
  'el-perro-del-hortelano-lope-de-vega',
  'Comedia de enredo',
  ARRAY['Comedia','Teatro del Siglo de Oro','Teatro barroco','Comedia palatina'],
  'La condesa Diana de Belflor se niega a amar a su secretario Teodoro pero tampoco consiente que él ame a otra. Como el perro del hortelano, ni come ni deja comer.',
  'La condesa Diana de Belflor se niega a amar a su secretario Teodoro pero tampoco consiente que él ame a otra. Como el perro del hortelano, ni come ni deja comer.',
  'Diana, condesa de Belflor, descubre el amor que su secretario Teodoro siente por su criada Marcela. Presa de los celos, le hace señales de amor y le retira cuando él responde. La obra explora la tensión entre el deseo y las rígidas jerarquías sociales del Barroco: el amor transgrede el orden estamental, pero la condesa no puede romper abiertamente con él. El astuto criado Tristán resuelve el enredo fingiendo una noble genealogía para Teodoro, permitiendo que el amor triunfe sin que nadie tenga que renunciar formalmente a su posición. La fecha de composición se deduce del manuscrito autógrafo conservado.',
  100, 12, 10, 18,
  'es', 'ES', 1613, 'public_domain', 'public_download',
  'Biblioteca Virtual Miguel de Cervantes',
  'https://www.cervantesvirtual.com/portales/lope_de_vega/',
  true, true,
  'd0a54895-ac1a-4dc4-9286-9ff84c9841ee',
  '2026-06-29 16:56:19.916448+00'
);

INSERT INTO public.works (
  id, title, subtitle, author, slug, genre, secondary_genres,
  synopsis, synopsis_short, synopsis_full,
  duration_minutes, min_age, cast_size_min, cast_size_max,
  language, country_code, year, rights_status, access_type,
  source_name, source_url, is_library_work, is_published,
  institution_id, created_at
) VALUES (
  '4ff1e163-30ea-4a05-b3ca-35b06823e3c9',
  'Fuente Ovejuna',
  NULL,
  'Lope de Vega',
  'fuente-ovejuna-lope-de-vega',
  'Drama de honor',
  ARRAY['Drama social','Teatro del Siglo de Oro','Teatro histórico','Teatro barroco'],
  'Los vecinos de Fuente Ovejuna, hartos de los abusos del Comendador Fernán Gómez, se alzan en masa y le dan muerte. Cuando el juez real investiga el crimen, cada vecino responde lo mismo: «Fuente Ovejuna lo hizo».',
  'Los vecinos de Fuente Ovejuna, hartos de los abusos del Comendador Fernán Gómez, se alzan en masa y le dan muerte. Cuando el juez real investiga el crimen, cada vecino responde lo mismo: «Fuente Ovejuna lo hizo».',
  'La obra entrelaza dos tramas: la historia de honor colectivo de los villanos de Fuente Ovejuna y el conflicto histórico entre la Orden de Calatrava y los Reyes Católicos. Laurencia, ultrajada por el Comendador, arenga a las mujeres del pueblo para que participen en el alzamiento. La tragedia individual se convierte en acto político: cuando la tortura no arranca ninguna confesión individual, el pueblo emerge como sujeto colectivo con una sola voluntad. Fernando e Isabel ratifican el perdón, reconociendo implícitamente la justicia del alzamiento. Primera edición impresa: Docena Parte de las comedias de Lope de Vega Carpio (Madrid, 1619).',
  120, 14, 12, 25,
  'es', 'ES', 1614, 'public_domain', 'public_download',
  'Biblioteca Virtual Miguel de Cervantes',
  'https://www.cervantesvirtual.com/portales/lope_de_vega/',
  true, true,
  'd0a54895-ac1a-4dc4-9286-9ff84c9841ee',
  '2026-06-29 16:56:19.916448+00'
);

INSERT INTO public.works (
  id, title, subtitle, author, slug, genre, secondary_genres,
  synopsis, synopsis_short, synopsis_full,
  duration_minutes, min_age, cast_size_min, cast_size_max,
  language, country_code, year, rights_status, access_type,
  source_name, source_url, is_library_work, is_published,
  institution_id, created_at
) VALUES (
  '2f5de386-85e4-4659-8d69-151e92cf94b6',
  'La dama boba',
  NULL,
  'Lope de Vega',
  'la-dama-boba-lope-de-vega',
  'Comedia',
  ARRAY['Comedia de enredo','Teatro del Siglo de Oro','Teatro barroco','Comedia de costumbres'],
  'Finea, considerada boba por no saber letras, se transforma por amor en una joven ingeniosa y astuta. Su hermana Nise, culta y presuntuosa, resulta la más ignorante en cuestiones del corazón.',
  'Finea, considerada boba por no saber letras, se transforma por amor en una joven ingeniosa y astuta. Su hermana Nise, culta y presuntuosa, resulta la más ignorante en cuestiones del corazón.',
  'La obra explora la educación sentimental a través de dos hermanas opuestas: Nise, ilustrada y pedante, y Finea, juzgada como boba por carecer de letras. Cuando Finea se enamora de Laurencio —el prometido de su hermana—, el amor actúa como catalizador del entendimiento: aprende a leer, a poetizar y a urdir engaños con rapidez que desconcierta a todos. Lope ironiza sobre la falsedad de la cultura libresca frente a la inteligencia natural despertada por la pasión. El manuscrito autógrafo, fechado el 28 de abril de 1613, se conserva en la Biblioteca Nacional de España.',
  100, 12, 10, 16,
  'es', 'ES', 1613, 'public_domain', 'public_download',
  'Biblioteca Virtual Miguel de Cervantes',
  'https://www.cervantesvirtual.com/portales/lope_de_vega/',
  true, true,
  'd0a54895-ac1a-4dc4-9286-9ff84c9841ee',
  '2026-06-29 16:56:19.916448+00'
);

-- -----------------------------------------------------------------------------
-- WORK_FILES — enlaces a ediciones digitales
-- -----------------------------------------------------------------------------

-- Nota: El primer registro (b2292e49) es un placeholder interno con is_public=false.
-- Los demás 10 apuntan a lectores integrados de Cervantes Virtual.

INSERT INTO public.work_files (id, work_id, file_type, file_url, file_name, file_size, is_public, created_at)
VALUES
  ('b2292e49-0a04-4ca8-b9bb-5edddb26bacd', '4bfbe073-a590-4974-8dca-95d26187d76a', 'script', 'biblioteca/calderon/la-vida-es-sueno.pdf',                                                         'La vida es sueño — Guión.pdf',                  NULL, false, '2026-06-28 18:32:28.608170+00'),
  ('9695ac71-b386-43a7-a941-7bfec9cc605c', '4bfbe073-a590-4974-8dca-95d26187d76a', 'script', 'https://www.cervantesvirtual.com/obra-visor/la-vida-es-sueno--0/html/',                            'Leer en Cervantes Virtual',                     NULL, true,  '2026-06-29 17:37:04.354317+00'),
  ('1e4c5b8f-0b93-41f4-89a7-9cbed4f21a86', '3a06cfdf-78cc-45de-a078-513a27b9b5a2', 'script', 'https://www.cervantesvirtual.com/obra-visor/el-alcalde-de-zalamea-0/html/',                        'Leer en Cervantes Virtual',                     NULL, true,  '2026-06-29 17:37:04.354317+00'),
  ('f9ab09cb-ff1f-44b7-a5e1-94134d6adaf2', 'f531ebd7-14f5-46d3-b9a6-61a7068ef9c9', 'script', 'https://www.cervantesvirtual.com/obra-visor/el-gran-teatro-del-mundo--0/html/',                   'Leer en Cervantes Virtual',                     NULL, true,  '2026-06-29 17:37:04.354317+00'),
  ('f66a7edc-7963-4f13-95ff-853c2e1f859c', 'e580a304-184f-4b6c-8365-cb34c6a29229', 'script', 'https://www.cervantesvirtual.com/obra-visor/la-dama-duende--0/html/',                             'Leer en Cervantes Virtual',                     NULL, true,  '2026-06-29 17:37:04.354317+00'),
  ('8e641475-016e-47d5-b0aa-edb1c07a65c4', '2f7a12a0-9a50-47e7-b87d-f1dd8ee7da33', 'script', 'https://www.cervantesvirtual.com/obra-visor/casa-con-dos-puertas-mala-es-de-guardar--0/html/',   'Leer en Cervantes Virtual',                     NULL, true,  '2026-06-29 17:37:04.354317+00'),
  ('b1d7bd6c-c3b4-477d-ac73-564e56571f7a', '4ff1e163-30ea-4a05-b3ca-35b06823e3c9', 'script', 'https://www.cervantesvirtual.com/obra-visor/fuente-ovejuna--1/html/',                             'Leer en Cervantes Virtual',                     NULL, true,  '2026-06-29 17:37:04.354317+00'),
  ('272fe2af-a6da-4a61-b336-d2e06ead2266', 'ea4abd51-2956-406a-a524-b56c7c5a3353', 'script', 'https://www.cervantesvirtual.com/obra-visor/el-perro-del-hortelano--0/html/',                     'Leer en Cervantes Virtual',                     NULL, true,  '2026-06-29 17:37:04.354317+00'),
  ('d5082fd8-b3e2-4a55-9d7d-56a8679fa073', '2f5de386-85e4-4659-8d69-151e92cf94b6', 'script', 'https://www.cervantesvirtual.com/obra-visor/la-dama-boba--0/html/',                               'Leer en Cervantes Virtual',                     NULL, true,  '2026-06-29 17:37:04.354317+00'),
  ('d5af7326-b692-492d-ba76-8c60362a5b57', 'a47b87c4-3cf6-4eea-9c1f-2dd9f86932c8', 'script', 'https://www.cervantesvirtual.com/obra-visor/el-caballero-de-olmedo--0/html/',                     'Leer en Cervantes Virtual',                     NULL, true,  '2026-06-29 17:37:04.354317+00'),
  ('fa653ecc-6c43-4426-8cc9-1ec0cec4131d', '7bdcd0d5-7ea5-4976-a370-396e8729c1f7', 'script', 'https://www.cervantesvirtual.com/obra-visor/peribanez-y-el-comendador-de-ocana--0/html/',         'Leer en Cervantes Virtual',                     NULL, true,  '2026-06-29 17:37:04.354317+00');
