-- Contactos y datos prácticos de los espacios escénicos (segunda tanda).
--
-- Completa teléfono, correo, dirección, código postal, aforo, accesibilidad,
-- titularidad y año de inauguración a partir de fuentes oficiales: webs de
-- los propios espacios, ayuntamientos, cabildos, Comunidad de Madrid,
-- INAEM, Madrid Destino (esmadrid.com) y Gobierno de Canarias.
--
-- Solo contacto general del espacio: fijos y números de atención, y buzones
-- genéricos. Sin móviles ni correos de personas.
-- Nunca sobrescribe: cada campo usa coalesce y solo rellena lo vacío.

update public.espacios_escenicos set telefono = coalesce(telefono, '+34 928 32 18 07'), email = coalesce(email, 'info@elteatroguiniguada.com'), direccion = coalesce(direccion, 'Calle Mesa de León s/n'), codigo_postal = coalesce(codigo_postal, '35001') where slug = 'teatro-guiniguada';
update public.espacios_escenicos set aforo = coalesce(aforo, 503), accesibilidad = coalesce(accesibilidad, 'si'), anio_inauguracion = coalesce(anio_inauguracion, 2023) where slug = 'auditorio-de-adeje';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 922 56 86 00'), email = coalesce(email, 'info@auditoriodetenerife.com'), direccion = coalesce(direccion, 'Avenida de la Constitución 1'), codigo_postal = coalesce(codigo_postal, '38003') where slug = 'auditorio-de-tenerife-adan-martin';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 922 32 44 44'), aforo = coalesce(aforo, 1000) where slug = 'auditorio-teobaldo-power';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 922 31 96 01'), titularidad = coalesce(titularidad, 'publica') where slug = 'paraninfo-de-la-universidad-de-la-laguna';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 922 34 62 21'), direccion = coalesce(direccion, 'Calle San Agustín 59'), titularidad = coalesce(titularidad, 'publica') where slug = 'teatro-cine-los-realejos';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 922 60 94 50'), email = coalesce(email, 'infoguimera@santacruzdetenerife.es'), codigo_postal = coalesce(codigo_postal, '38003'), titularidad = coalesce(titularidad, 'publica') where slug = 'teatro-guimera';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 922 26 54 33'), direccion = coalesce(direccion, 'Calle Obispo Rey Redondo 50'), codigo_postal = coalesce(codigo_postal, '38201'), accesibilidad = coalesce(accesibilidad, 'parcial') where slug = 'teatro-leal';
update public.espacios_escenicos set direccion = coalesce(direccion, 'Plaza El Ramal s/n'), codigo_postal = coalesce(codigo_postal, '38260') where slug = 'teatro-union-tejina';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 536 52 26'), email = coalesce(email, 'ateneo1mayo.madrid@usmr.ccoo.es') where slug = 'auditorio-marcelino-camacho';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 337 01 40'), email = coalesce(email, 'auditorio.nacional@inaem.mcu.es'), direccion = coalesce(direccion, 'Calle del Príncipe de Vergara 146'), codigo_postal = coalesce(codigo_postal, '28002'), aforo = coalesce(aforo, 2338), accesibilidad = coalesce(accesibilidad, 'si'), titularidad = coalesce(titularidad, 'publica') where slug = 'auditorio-nacional-de-musica';
update public.espacios_escenicos set email = coalesce(email, 'bululu@bululu2120.com'), aforo = coalesce(aforo, 40) where slug = 'bululu-2120';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 507 97 40'), email = coalesce(email, 'pacorabal@madrid.org'), direccion = coalesce(direccion, 'Calle de Felipe de Diego 13'), codigo_postal = coalesce(codigo_postal, '28018'), aforo = coalesce(aforo, 358), accesibilidad = coalesce(accesibilidad, 'si'), anio_inauguracion = coalesce(anio_inauguracion, 1999) where slug = 'centro-cultural-paco-rabal';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 910 05 24 25'), email = coalesce(email, 'info@letsgocompany.com') where slug = 'espacio-ibercaja-delicias';
update public.espacios_escenicos set email = coalesce(email, 'exlimite@exlimite.com') where slug = 'exlimite';
update public.espacios_escenicos set aforo = coalesce(aforo, 980) where slug = 'gran-teatro-caixabank-principe-pio';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 704 95 83'), email = coalesce(email, 'info@nave73.es') where slug = 'nave-73';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 318 46 70'), email = coalesce(email, 'info@mataderomadrid.org'), direccion = coalesce(direccion, 'Paseo de la Chopera 14'), codigo_postal = coalesce(codigo_postal, '28045') where slug = 'naves-matadero';
update public.espacios_escenicos set email = coalesce(email, 'atencionalcliente@atgentertainment.com'), direccion = coalesce(direccion, 'Calle de Jorge Juan 62'), codigo_postal = coalesce(codigo_postal, '28009') where slug = 'nuevo-teatro-alcala';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 169 14 19'), email = coalesce(email, 'sala@offlatina.com'), aforo = coalesce(aforo, 81) where slug = 'off-de-la-latina';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 474 97 65'), codigo_postal = coalesce(codigo_postal, '28005'), aforo = coalesce(aforo, 55) where slug = 'plotpoint';
update public.espacios_escenicos set email = coalesce(email, 'realjunior@teatroreal.es'), direccion = coalesce(direccion, 'Plaza de Daoíz y Velarde 4'), codigo_postal = coalesce(codigo_postal, '28007'), aforo = coalesce(aforo, 330) where slug = 'real-teatro-de-retiro';
update public.espacios_escenicos set email = coalesce(email, 'teatro@replikateatro.com'), aforo = coalesce(aforo, 100) where slug = 'replika-teatro';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 517 23 17'), email = coalesce(email, 'info@cuartapared.es'), direccion = coalesce(direccion, 'Calle de Ercilla 17'), codigo_postal = coalesce(codigo_postal, '28005') where slug = 'sala-cuarta-pared';
update public.espacios_escenicos set email = coalesce(email, 'taquilla@lamirador.com'), accesibilidad = coalesce(accesibilidad, 'si') where slug = 'sala-mirador';
update public.espacios_escenicos set email = coalesce(email, 'info@tarambana.net'), aforo = coalesce(aforo, 90) where slug = 'sala-tarambana';
update public.espacios_escenicos set anio_inauguracion = coalesce(anio_inauguracion, 1945) where slug = 'teatro-albeniz';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 521 45 41'), email = coalesce(email, 'info@teatroalfil.com') where slug = 'teatro-alfil';
update public.espacios_escenicos set codigo_postal = coalesce(codigo_postal, '28010') where slug = 'teatro-amaya';
update public.espacios_escenicos set direccion = coalesce(direccion, 'Avenida de Portugal s/n'), codigo_postal = coalesce(codigo_postal, '28011'), aforo = coalesce(aforo, 660), titularidad = coalesce(titularidad, 'publica') where slug = 'teatro-auditorio-casa-de-campo';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 659 77 21'), direccion = coalesce(direccion, 'Calle Blas de Otero 4'), codigo_postal = coalesce(codigo_postal, '28100'), titularidad = coalesce(titularidad, 'publica') where slug = 'teatro-auditorio-ciudad-de-alcobendas';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 532 44 37'), email = coalesce(email, 'info@teatrobellasartes.es'), accesibilidad = coalesce(accesibilidad, 'si') where slug = 'teatro-bellas-artes';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 664 85 02'), email = coalesce(email, 'culturayparticipa@ayto-alcorcon.es'), direccion = coalesce(direccion, 'Calle Los Robles s/n'), aforo = coalesce(aforo, 912), accesibilidad = coalesce(accesibilidad, 'si'), titularidad = coalesce(titularidad, 'publica'), anio_inauguracion = coalesce(anio_inauguracion, 1994) where slug = 'teatro-buero-vallejo';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 318 47 00'), email = coalesce(email, 'entradas@madrid-destino.com'), direccion = coalesce(direccion, 'Ronda de Atocha 35'), codigo_postal = coalesce(codigo_postal, '28012'), accesibilidad = coalesce(accesibilidad, 'si'), titularidad = coalesce(titularidad, 'publica') where slug = 'teatro-circo-price';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 448 16 27'), email = coalesce(email, 'taquilla@teatroabadia.com'), accesibilidad = coalesce(accesibilidad, 'si') where slug = 'teatro-de-la-abadia';
update public.espacios_escenicos set email = coalesce(email, 'abonostaquillas.tz@inaem.cultura.gob.es'), aforo = coalesce(aforo, 1218), titularidad = coalesce(titularidad, 'publica') where slug = 'teatro-de-la-zarzuela';
update public.espacios_escenicos set direccion = coalesce(direccion, 'Avenida de Méjico s/n'), codigo_postal = coalesce(codigo_postal, '28009'), titularidad = coalesce(titularidad, 'publica') where slug = 'teatro-de-titeres-de-el-retiro';
update public.espacios_escenicos set titularidad = coalesce(titularidad, 'publica'), anio_inauguracion = coalesce(anio_inauguracion, 2003) where slug = 'teatro-del-bosque';
update public.espacios_escenicos set email = coalesce(email, 'teatroespanol@teatroespanol.es'), direccion = coalesce(direccion, 'Calle del Príncipe 25'), codigo_postal = coalesce(codigo_postal, '28012'), accesibilidad = coalesce(accesibilidad, 'si'), titularidad = coalesce(titularidad, 'publica') where slug = 'teatro-espanol';
update public.espacios_escenicos set aforo = coalesce(aforo, 675), titularidad = coalesce(titularidad, 'publica'), anio_inauguracion = coalesce(anio_inauguracion, 1998) where slug = 'teatro-federico-garcia-lorca';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 318 46 31'), email = coalesce(email, 'info.tfg@teatrofernangomez.es'), direccion = coalesce(direccion, 'Plaza de Colón 4'), codigo_postal = coalesce(codigo_postal, '28001'), aforo = coalesce(aforo, 732), titularidad = coalesce(titularidad, 'publica') where slug = 'teatro-fernan-gomez';
update public.espacios_escenicos set accesibilidad = coalesce(accesibilidad, 'si') where slug = 'teatro-infanta-isabel';
update public.espacios_escenicos set email = coalesce(email, 'info@teatrolalatina.es') where slug = 'teatro-la-latina';
update public.espacios_escenicos set direccion = coalesce(direccion, 'Calle de Ercilla 20'), codigo_postal = coalesce(codigo_postal, '28005') where slug = 'teatro-lagrada';
update public.espacios_escenicos set email = coalesce(email, 'info@teatrolara.org'), aforo = coalesce(aforo, 464) where slug = 'teatro-lara';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 900 506 670'), email = coalesce(email, 'atencion@stage-entertainment.com'), codigo_postal = coalesce(codigo_postal, '28013') where slug = 'teatro-lope-de-vega';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 129 17 71'), direccion = coalesce(direccion, 'Calle de Manuela Malasaña 6'), codigo_postal = coalesce(codigo_postal, '28004') where slug = 'teatro-maravillas';
update public.espacios_escenicos set email = coalesce(email, 'cdn@inaem.cultura.gob.es') where slug = 'teatro-maria-guerrero';
update public.espacios_escenicos set email = coalesce(email, 'entradas@grupomarquina.es'), direccion = coalesce(direccion, 'Calle de Prim 11'), codigo_postal = coalesce(codigo_postal, '28004'), aforo = coalesce(aforo, 500) where slug = 'teatro-marquina';
update public.espacios_escenicos set codigo_postal = coalesce(codigo_postal, '28031'), aforo = coalesce(aforo, 100) where slug = 'teatro-municipal-de-vallecas';
update public.espacios_escenicos set email = coalesce(email, 'info@teatromunozseca.es'), codigo_postal = coalesce(codigo_postal, '28013') where slug = 'teatro-munoz-seca';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 456 75 13'), email = coalesce(email, 'taquilla@granteatropavon.es') where slug = 'teatro-pavon';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 416 90 11'), direccion = coalesce(direccion, 'Calle Pradillo 12') where slug = 'teatro-pradillo';
update public.espacios_escenicos set accesibilidad = coalesce(accesibilidad, 'si') where slug = 'teatro-real';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 083 95 00'), email = coalesce(email, 'atencionalcliente@atgentertainment.com'), codigo_postal = coalesce(codigo_postal, '28013') where slug = 'teatro-rialto';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 505 88 00'), email = coalesce(email, 'cdn@inaem.cultura.gob.es') where slug = 'teatro-valle-inclan';
update public.espacios_escenicos set email = coalesce(email, 'elteatrovictoriademadrid@gmail.com') where slug = 'teatro-victoria-madrid';
update public.espacios_escenicos set telefono = coalesce(telefono, '+34 91 308 99 50'), email = coalesce(email, 'espectaculos@uteteatrosdelcanal.com'), direccion = coalesce(direccion, 'Calle de Cea Bermúdez 1'), codigo_postal = coalesce(codigo_postal, '28003'), aforo = coalesce(aforo, 843) where slug = 'teatros-del-canal';
update public.espacios_escenicos set codigo_postal = coalesce(codigo_postal, '35010') where slug = 'auditorio-alfredo-kraus';
