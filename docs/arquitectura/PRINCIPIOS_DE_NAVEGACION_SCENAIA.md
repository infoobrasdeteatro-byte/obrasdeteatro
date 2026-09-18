# PRINCIPIOS DE NAVEGACIÓN — SCENAIA / OBRASDETEATRO®

**Proyecto:** ScenaIA / obrasdeteatro.com
**Empresa:** CONECTA PLUS GLOBAL, S.L.U. · Team Show Producciones
**Versión:** 1.0
**Origen:** Expediente RC-002A — Dirección Conceptual del Sidebar
**Estado:** Fundacional — referencia oficial de arquitectura de navegación
**Ámbito de autoridad:** Cabecera, Sidebar, Centro Profesional, y cualquier decisión futura de arquitectura de información, jerarquía de producto o dirección de arte relacionada con la navegación de la plataforma.

> Este documento no es una guía de implementación ni describe componentes, estilos o código. Es un documento de dirección de producto y dirección de arte: define qué es cada nivel de navegación de ScenaIA, qué pregunta responde, y cómo se relacionan entre sí. Cualquier decisión futura sobre Cabecera, Sidebar o Centro Profesional —visual, funcional o arquitectónica— debe ser coherente con los principios aquí descritos. Si una implementación entra en conflicto con este documento, el conflicto debe resolverse aquí primero, antes de tocar código.

---

## Preámbulo

Este documento nació durante la auditoría y el rediseño conceptual del Sidebar de ScenaIA (expediente RC-002A), pero su alcance dejó de pertenecer a ese componente en cuanto quedó claro que las preguntas que estábamos respondiendo no eran "¿cómo debe verse un panel lateral?", sino "¿qué clase de plataforma estamos construyendo, y cómo debe comportarse su navegación durante los próximos años?".

Lo que sigue es la definición del lenguaje de navegación de toda la plataforma: qué representa cada uno de sus tres niveles —Cabecera, Sidebar y Centro Profesional—, qué naturaleza tiene cada uno, qué principios visuales y de jerarquía lo gobiernan, y cómo dialogan entre sí para que, con el tiempo, la navegación deje de percibirse como una interfaz y se convierta en una extensión natural del oficio del profesional que la usa.

---

## Capítulo 1 — Identidad: qué debe transmitir el Sidebar en el primer contacto

La Cabecera ya resuelve una pregunta: "¿qué institución es esta?". El Sidebar responde a una pregunta distinta: "¿qué clase de lugar de trabajo es este?". No busca convencer a nadie de que se quede —eso ya lo hace la marca, arriba— busca que un profesional que ya decidió entrar sienta, en el primer segundo, que ha accedido a un entorno hecho a la medida de su oficio, no a una aplicación genérica con su nombre puesto encima.

La sensación correcta no es entusiasmo ni sorpresa. Es **reconocimiento**. La misma sensación que tiene un profesional cuando entra por primera vez en el archivo de una institución seria de su gremio: no necesita que le expliquen dónde está cada cosa a gritos, porque el propio orden del espacio ya le dice "esto lo ha organizado alguien que entiende este oficio". Si el Sidebar necesita persuadir, decorar o entretener para resultar atractivo, ya ha fallado en su propósito — su autoridad no viene de gustar, viene de ser evidente que fue construido por y para gente que hace teatro en serio.

## Capítulo 2 — Naturaleza: qué es realmente el Sidebar

No es un menú. Un menú ofrece opciones a un visitante que todavía no sabe qué quiere — implica indecisión. El profesional que entra en ScenaIA no está decidiendo si le interesa el teatro: ya lo sabe. Ofrecerle un menú es tratarlo como a un turista.

No es un centro de operaciones ni una consola. Ese territorio ya está asignado — es exactamente lo que representa el Centro Profesional dentro de la arquitectura de tres niveles (ver Capítulo 7). Si el Sidebar se convierte en consola, invade el único espacio que hemos reservado, con toda intención, para la gestión personal. Esa frontera no se toca.

Tampoco es un simple mapa — un mapa es neutral, no jerarquiza, se limita a mostrar todo lo que existe con el mismo peso.

Lo que realmente es —y lo que debería diseñarse para ser— es un **índice editorial vivo del ecosistema**: la tabla de contenidos de una publicación profesional que se actualiza en tiempo real. Como el sumario de una revista especializada seria: no lista "todas las secciones que existen en el mundo", selecciona y ordena lo que importa ahora mismo para quien la está leyendo, y lo hace con la misma disciplina editorial que aplicaría un director de contenidos, no un ingeniero de producto listando rutas.

## Capítulo 3 — Lenguaje visual: principios, no valores

- **Densidad**: debe leerse más como una página bien compuesta que como un panel de control. La densidad de información debe ser la mínima necesaria para orientar, nunca la máxima posible para impresionar.
- **Ritmo**: el espaciado entre grupos debe ser predecible y constante, de forma que el ojo pueda escanear sin esfuerzo consciente — el mismo principio de respiración aplicado en la Cabecera, ahora en vertical. Un ritmo irregular obliga a leer; un ritmo constante permite reconocer de un vistazo.
- **Silencio**: el espacio vacío no es espacio desperdiciado, es la herramienta principal de jerarquía. Lo que separa una categoría importante de una secundaria no es el tamaño de su texto, es cuánto silencio tiene alrededor.
- **Jerarquía**: debe resolverse con muy pocos niveles de peso visual —idealmente dos, nunca más de tres—. Cuantos más niveles tipográficos compitan entre sí, menos jerarquía real existe; la claridad viene de la disciplina de reducir opciones, no de añadir matices.
- **Equilibrio**: en reposo, el Sidebar debe sentirse tranquilo. Nada debe moverse, pulsar o llamar la atención por defecto — el movimiento y el énfasis deben reservarse exclusivamente para cambios de estado reales (algo nuevo, algo que requiere acción), nunca como decoración permanente.
- **Presencia**: cada agrupación debe sentirse como una decisión editorial deliberada, no como una lista generada automáticamente a partir de las rutas de la aplicación. Si se nota que "así es como está organizado el código", ha fallado como diseño.

## Capítulo 4 — Iconografía: ¿la necesitamos, y para qué?

La pregunta correcta no es qué iconos usar, sino qué problema resolvería tener iconos. Un icono solo se justifica por una de dos razones: acelerar el reconocimiento de una acción muy frecuente (como en una barra de herramientas), o aportar significado que el texto por sí solo no transmite. Todo lo demás es decoración — y la decoración es, precisamente, lo que hace que una navegación se perciba como producto de consumo en vez de herramienta profesional.

Para un público que ya conoce su oficio y que va a usar la plataforma de forma recurrente, la lectura de texto bien jerarquizado es, en general, más rápida y más precisa que el reconocimiento de un pictograma — sobre todo cuando el número de destinos es reducido. Esto significa que la iconografía **no debería ser el valor por defecto**, sino un recurso que se gana su lugar: reservado para señalar algo que el texto no puede señalar por sí solo —por ejemplo, que un módulo es de naturaleza distinta al resto (algo vivo, algo generado por IA, algo en tiempo real)—, no para decorar cada línea por igual.

Si se adopta un sistema de iconos, debe comportarse como tipografía: un único lenguaje gráfico coherente, con el mismo peso visual y la misma discreción en todos sus elementos, cuya función sea ayudar al ojo a segmentar grupos —una textura de apoyo—, nunca competir con el texto por ser lo primero que se lee.

## Capítulo 5 — Jerarquía de lectura: qué se lee primero, qué se ignora, cómo se descubre

Lo primero que debe leerse no es una categoría estática, es lo que está vivo ahora mismo en el ecosistema profesional del usuario — el equivalente al titular principal de una portada, no al índice completo. Todo lo demás —las categorías permanentes— debe estar disponible pero en un segundo plano de atención: el usuario debe poder ignorarlas la mayoría de los días sin sentir que se pierde algo, y volver a ellas cuando las necesite, con la confianza de que van a estar exactamente donde las dejó.

Esa estabilidad posicional es en sí misma una decisión de UX, no solo estética: para una herramienta de uso diario, la previsibilidad vale más que la novedad. El descubrimiento de módulos nuevos no debería lograrse reordenando ni haciendo más grande la estructura existente —eso rompe el mapa mental que el profesional ya construyó—, sino mediante una señal discreta y consistente de "esto es nuevo" o "esto tiene actividad reciente", que conviva con la estructura sin alterarla.

## Capítulo 6 — Escalabilidad: ScenaIA dentro de cinco años

La única forma de que la navegación no tenga que reinventarse cada vez que aparezca un módulo nuevo es que, desde hoy, se diseñe separando dos capas que suelen mezclarse: una **columna vertebral estructural**, permanente y deliberadamente difícil de modificar —igual que los ocho dominios de la Cabecera—, y una **capa de contenido dinámico** que vive dentro de esa estructura sin alterarla: actividad reciente, contadores, señales de novedad. El crecimiento de la plataforma debe absorberse en esa segunda capa, no añadiendo filas nuevas a la primera cada vez que se lanza algo.

La segunda condición para escalar con salud es que la relevancia deje de ser igual para todos desde el diseño conceptual, aunque no se implemente el primer día: un actor, una compañía y un teatro no deberían ver, dentro de cinco años, exactamente la misma navegación en el mismo orden. El sistema debe estar pensado para que la personalización por rol y por uso sea una evolución natural de la misma estructura, no una reconstrucción posterior.

Y la tercera condición, la más simple de enunciar y la más fácil de romper sin querer: cada módulo nuevo debe encajar dentro de una categoría ya existente. El día que añadir algo nuevo exija inventar una categoría nueva, ese debería ser un evento raro y deliberado —una decisión de dirección, como lo fue definir los ocho dominios de la Cabecera—, nunca una consecuencia automática de tener una función más que enseñar.

## Capítulo 7 — La arquitectura completa: relación entre los tres niveles

Hasta el capítulo anterior se ha definido, en profundidad, un único nivel: el Sidebar. Pero ningún nivel de navegación tiene sentido aislado de los otros dos. Este capítulo define la relación entre la Cabecera, el Sidebar y el Centro Profesional.

### 7.1 La Cabecera

La Cabecera no navega: **declara**. Su función no es llevar al usuario a ningún sitio en concreto, es afirmar, cada vez que carga la página, qué es ScenaIA y qué dominios componen el ecosistema del teatro en español según esta plataforma. Responde a una única pregunta, siempre la misma: *¿qué existe aquí?*

Por eso permanece estable. Una institución no puede declarar el mundo de forma distinta cada semana — si los dominios cambiaran con frecuencia, dejarían de ser una declaración y pasarían a ser una opinión pasajera. La Cabecera gana autoridad exactamente por no moverse: cuanto menos cambia, más se convierte en el suelo firme sobre el que todo lo demás puede permitirse moverse con libertad. Su papel en la experiencia no es "ser usada", es "estar ahí" — el usuario no necesita mirarla conscientemente para beneficiarse de ella, de la misma forma que no se mira el nombre de un periódico en cada página que se pasa, pero se sabría al instante si desapareciera.

### 7.2 El Sidebar

El Sidebar no compite con la Cabecera porque responde a una pregunta distinta, un nivel más abajo: no *¿qué existe?*, sino *¿qué está pasando, ahora, dentro de lo que existe?*. La Cabecera declara las categorías permanentes del mundo teatral; el Sidebar convierte esas categorías en algo que se puede recorrer un martes cualquiera. Es la bisagra entre la institución y la actividad diaria — toma la promesa estática de la marca ("esto es un ecosistema completo") y la transforma en conocimiento navegable y vivo ("esto es lo que ocurre en él hoy").

Por eso se define como un índice editorial vivo y no como un menú de aplicación: un menú pertenece al mismo registro que la Cabecera —estructura, no contenido—, mientras que el Sidebar pertenece al registro del tiempo. Si el Sidebar intentara declarar identidad institucional por su cuenta, duplicaría el trabajo de la Cabecera y generaría la misma competencia ya diagnosticada y resuelta en la propia cabecera. Su lealtad no es a "parecer importante", es a mantenerse siempre subordinado a lo que la Cabecera ya declaró, limitándose a darle movimiento.

### 7.3 El Centro Profesional

El Centro Profesional no responde ni a *¿qué existe?* ni a *¿qué está pasando?* — responde a una tercera pregunta, de naturaleza completamente distinta: *¿qué es mío, y qué tengo que gestionar?*. Es la única capa que habla en primera persona. Cabecera y Sidebar hablan del ecosistema, en tercera persona, con la misma voz para cualquier usuario que los mire; el Centro Profesional habla de un único usuario, y no tiene sentido fuera de esa relación individual.

Esa diferencia de persona gramatical es la razón real por la que pertenece a una capa distinta. Explorar el ecosistema es un acto de curiosidad, abierto, sin obligación — se puede ignorar durante días sin coste. Gestionar la vida profesional es un acto de responsabilidad — facturación, identidad, sesiones, obras propias — con consecuencias reales si se ignora. Mezclar ambas cosas en el mismo espacio obligaría al usuario a decidir, cada vez que mira el Sidebar, si está "mirando el mundo" o "atendiendo sus obligaciones" — dos estados mentales distintos que no deberían competir por el mismo territorio visual. Esta es la razón profunda, no solo organizativa, por la que el Centro Profesional no debe mezclarse nunca con el Sidebar: no es una cuestión de orden, es una cuestión de qué tipo de atención se le pide al usuario en cada momento.

### 7.4 La arquitectura completa

Si un profesional entra cada día en ScenaIA durante cinco años, lo que debería ocurrir —si esta arquitectura funciona— es que deje progresivamente de percibir que existen tres niveles. Al principio los distingue conscientemente: arriba la marca, a la izquierda la exploración, en algún sitio su propia gestión. Con el tiempo, esa distinción consciente desaparece y se convierte en instinto motor: la mano sabe dónde ir antes de que la mente formule la pregunta. Eso solo ocurre si, y solo si, cada nivel ha respondido siempre a la misma pregunta y nunca ha invadido la pregunta del nivel vecino. La confianza en una arquitectura de navegación no se construye demostrando que es potente — se construye demostrando, miles de veces seguidas, que nunca sorprende.

El fracaso de una arquitectura de navegación no se nota el primer día. Se nota el día trescientos, cuando el usuario, sin darse cuenta, tiene que pararse a pensar "¿esto está en el Sidebar o en mi perfil?". Ese instante de duda es el síntoma exacto de una frontera mal trazada, y es acumulativo: cada vez que ocurre, la plataforma deja de sentirse como una herramienta profesional y vuelve a sentirse, por un segundo, como software. El objetivo de estos tres niveles no es que el usuario los admire — es que, pasado el tiempo suficiente, deje de verlos. Una arquitectura de navegación conseguida es aquella que se vuelve tan previsible que se convierte en una extensión de la intuición del propio profesional, no en una interfaz que hay que interpretar.

### 7.5 Respuesta a la pregunta de fondo

¿Es esto una arquitectura, o simplemente tres componentes que funcionan bien por separado? Es una arquitectura. La diferencia entre ambas cosas es precisa: tres componentes bien hechos podrían, en teoría, intercambiar responsabilidades sin que nada se rompiera formalmente. Aquí no es así. Cada nivel responde a una pregunta que ningún otro nivel puede responder sin generar una contradicción con lo ya definido — la Cabecera no puede volverse dinámica sin dejar de ser institución; el Sidebar no puede volverse permanente sin volverse Cabecera; el Centro Profesional no puede volverse compartido sin dejar de ser personal. Esa imposibilidad de sustitución mutua, no la coherencia estética entre los tres, es la prueba real de que existe una arquitectura y no una colección de buenas decisiones aisladas.

---

## Conclusión

Este documento describe la gramática de navegación de ScenaIA: qué pregunta responde cada espacio, en qué orden se declaran esas preguntas (primero el mundo, luego su actividad, después lo personal) y por qué esa jerarquía de preguntas no puede invertirse sin que el usuario empiece, de nuevo, a tener que pensar.

A partir de su aprobación, cualquier diseñador o desarrollador que se incorpore al proyecto debería poder entender la filosofía de navegación completa de ScenaIA leyendo únicamente este documento. Toda implementación futura de la Cabecera, el Sidebar o el Centro Profesional —incluido el expediente RC-002B— debe ser coherente con los principios aquí descritos. Si en el futuro una necesidad de producto entra en conflicto con alguno de ellos, el conflicto debe resolverse revisando y, si corresponde, versionando este documento — nunca contradiciéndolo silenciosamente desde una implementación aislada.

---

## Principio de Evolución

Este documento no constituye una arquitectura rígida ni inmutable. Su propósito no es congelar la evolución de ScenaIA. Su propósito es proporcionar un marco arquitectónico que permita que la plataforma evolucione sin perder coherencia.

### Dirección del producto

La dirección del proyecto conserva en todo momento la potestad de:

- incorporar nuevos módulos;
- eliminar funcionalidades existentes;
- reorganizar el Sidebar;
- modificar el orden de navegación cuando la evolución del producto lo requiera;
- crear nuevas categorías cuando el crecimiento del ecosistema lo justifique;
- redefinir prioridades de navegación en función de la estrategia de producto.

Nada de ello contradice este documento.

### Qué protege realmente este documento

Este documento no protege una implementación. Protege una forma de pensar.

Lo que debe permanecer estable no son las funciones concretas del Sidebar, sino los principios arquitectónicos sobre los que se toman las decisiones.

En otras palabras: **la arquitectura permanece estable. La implementación evoluciona.**

### Evolución consciente

Si en el futuro la realidad del producto demuestra que alguno de estos principios ha dejado de responder a las necesidades de ScenaIA, su revisión no solo será posible, sino deseable.

La única condición es que dicha revisión se realice de forma deliberada, mediante un nuevo expediente de arquitectura, y nunca como consecuencia accidental de una implementación puntual.

### Cierre

ScenaIA es una plataforma viva. Su evolución forma parte de su naturaleza. Este documento no pretende limitar esa evolución.

Pretende asegurar que cada cambio importante responda a una visión de producto consciente y coherente, preservando la identidad de la plataforma mientras esta continúa creciendo.
