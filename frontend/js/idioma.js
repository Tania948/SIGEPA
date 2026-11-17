// Idioma de la interfaz: español, maya yucateco (maaya t'aan) y náhuatl (nawatlahtolli).
// Traduce los textos fijos de la página (menús, títulos, botones, etiquetas). El contenido de las recetas
// se muestra en el idioma en que lo escribió su portador o portadora.
//
// IMPORTANTE: es una primera versión que debe revisarse con hablantes de cada lengua (el documento del
// proyecto pide validar con la comunidad). Para corregir un texto basta con editar los diccionarios de abajo.

export const IDIOMAS = {
  es: { nombre: "Español", corto: "ES" },
  yua: { nombre: "Maaya t'aan", corto: "MAYA" },
  nah: { nombre: "Nawatlahtolli", corto: "NÁHUATL" },
};

// [español, maya, náhuatl]
const FRASES = [
  // Navegación, menú y pie
  ["Explorar México", "Xíimbal México", "Xikitta Mexko"],
  ["Recetas", "Janalo'ob", "Tlakualchiwalistli"],
  ["Sobre el proyecto", "Yo'olal le meyaja'", "Itech in tekitl"],
  ["Publicar receta", "Ts'íib a janal", "Xiktlali motlakual"],
  ["Iniciar sesión", "Ookol", "Xikalaki"],
  ["Cerrar sesión", "Jóok'ol", "Xikisa"],
  ["Mi perfil / Mis recetas", "In kúuchil / In janalo'ob", "Nochan / Notlakual"],
  ["Mis favoritos", "Ba'ax in yaabilmaj", "Tlen nikneki"],
  ["Quiénes somos", "Máaxo'on", "Akin tejwan"],
  ["Todos los estados", "Tuláakal péetlu'umo'ob", "Nochi weyaltepemeh"],
  ["Búsqueda avanzada", "Kaxtik jach ma'alob", "Achi kuali tlatemolistli"],
  ["Explora y participa", "Xíimbalt yéetel táakpajen", "Xitlachiya wan ximopalewi"],
  ["DESCUBRIR", "KAXTIK", "XIKITTA"],
  ["MI COMUNIDAD", "IN KAAJAL", "NOALTEPEW"],
  ["IDIOMA", "T'AAN", "TLAHTOLLI"],
  ["Una cocina que se comparte.", "Jump'éel k'óoben ku t'oxik u janal.", "Se tlakualchiwalkalli tlen motlamaka."],
  ["Inicia sesión para guardar tus favoritas y aportar tus propias recetas.", "Ookoen utia'al a kanáantik a janalo'ob yéetel a t'oxik a tia'al.", "Xikalaki ika tikpias tlen tikneki wan tiktlamakas motlakual."],
  ["¿Aún no tienes cuenta? Regístrate", "¿Mina'an a kúuchil? Ts'íib a k'aaba'", "¿Ayamo tikpia mokwenta? Ximotlali"],
  ["Gracias por cuidar los sabores de tu comunidad.", "Dios bo'otik a kanáantik u ki'ibokil a kaajal.", "Tlaskamati ika tikpia iawiyakyo moaltepew."],
  ["Saberes que se comparten. Raíces que permanecen.", "Ojéelo'ob ku t'o'oxol. Mootso'ob ku p'áatal.", "Tlamatilistli tlen motlamaka. Nelwayotl tlen mokawa."],
  ["Términos de uso", "U nu'ukbesajil meyaj", "Tlanawatilli"],
  ["Privacidad", "Ba'al ku kanáanta'al", "Tlen ichtakatl"],
  ["Aviso de privacidad", "Ba'al ku kanáanta'al", "Tlen ichtakatl"],

  // Inicio
  ["UN ATLAS VIVO DE NUESTRA COCINA", "JUMP'ÉEL KUXA'AN MAPA TI' K JANAL", "SE YOLKAMAPA TOTLAKUAL"],
  ["México se cuenta a través de su mesa.", "México ku tsikbalta'al tu yóok'ol u mayak'che'.", "Mexko motlapowa ika itlakualpan."],
  ["Explora recetas, lugares y saberes compartidos por quienes los mantienen vivos.", "Xíimbalt janalo'ob, kúuchilo'ob yéetel ojéelo'ob ts'a'ab tumen le máaxo'ob ku kuxkintiko'obo'.", "Xikitta tlakualli, tlalli wan tlamatilistli tlen kitlamakah akin kiyoltiah."],
  ["Busca un platillo o ingredientes", "Kaxt jump'éel janal wa u nu'ukulil", "Xiktemo se tlakualli noso tlen monekis"],
  ["Buscar recetas", "Kaxt janalo'ob", "Xiktemo tlakualli"],
  ["Prueba:", "Ilawil:", "Xikyekowa:"],
  ["Un territorio, muchas cocinas", "Jump'éel lu'um, ya'abach k'óobeno'ob", "Se tlalli, miak tlakualchiwalkalli"],
  ["Ver todos los estados", "Il tuláakal péetlu'umo'ob", "Xikitta nochi weyaltepemeh"],
  ["Explorar un estado", "Xíimbalt jump'éel péetlu'um", "Xikitta se weyaltepetl"],
  ["Estados de México", "U péetlu'umilo'ob México", "Iweyaltepewan Mexko"],
  ["Estado seleccionado", "Péetlu'um yéeya'an", "Weyaltepetl tlen otikpepen"],
  ["Municipios", "Méek'tankaajo'ob", "Altepemeh"],
  ["Receta compartida", "Janal t'o'oxa'an", "Tlakualli tlen motlamakak"],
  ["Ver todo México", "Il tuláakal México", "Xikitta nochi Mexko"],
  ["MUNICIPIO", "MÉEK'TANKAAJ", "ALTEPETL"],
  ["Ver recetas del municipio", "Il u janalo'ob le méek'tankaajo'", "Xikitta itlakual in altepetl"],
  ["Compartir una receta", "T'ox jump'éel janal", "Xiktlamaka se tlakualli"],
  ["Ver todas las recetas", "Il tuláakal janalo'ob", "Xikitta nochi tlakualli"],
  ["Tu receta también es parte del mapa.", "A janal xan u xóot'ol le mapa'.", "Motlakual no itech pouj in mapa."],
  ["Comparte los sabores y las historias de tu comunidad.", "T'ox u ki'ibokil yéetel u tsikbalo'ob a kaajal.", "Xiktlamaka iawiyakyo wan itlapowal moaltepew."],
  ["Publicar una receta", "T'ox jump'éel janal", "Xiktlali se tlakualli"],
  ["Cada receta conserva su lugar de origen y la voz de quien la comparte. Toca un municipio para ver lo que se cocina ahí.",
    "Kada janal ku kanáantik u kúuchil yéetel u t'aan máax ku t'oxik. Ch'a'ak jump'éel méek'tankaaj utia'al a wilik ba'ax ku beeta'al te'elo'.",
    "Nochi tlakualli kipia ichan wan itlahtol akin kitlamaka. Xikkitzki se altepetl ika tikittas tlen mochiwa ompa."],

  // Tarjetas y recetas
  ["Ver receta", "Il u beetil", "Xikitta"],
  ["Por", "Tu ts'íibtaj", "Okichiw"],
  ["Fácil", "Ma' talami'", "Amo ouij"],
  ["Intermedia", "Chúumuk talam", "Tlajko ouij"],
  ["Avanzada", "Talam", "Ouij"],
  ["Editar receta", "K'ex le janala'", "Xikpatla in tlakualli"],
  ["Quitar de favoritos", "Lu'us ti' ba'ax a yaabilmaj", "Xikkixti ten tlen tikneki"],
  ["Ingredientes", "U nu'ukulil", "Tlen monekis"],
  ["Manos a la cocina", "¡Ko'ox meyaj ti' k'óoben!", "¡Ma titekitikan tlakualchiwalkalpan!"],
  ["Raciones", "Jayp'éel máak", "Kesqui tlakah"],
  ["Tiempo total", "Tuláakal k'iin", "Nochi kawitl"],
  ["Dificultad", "Bix u talamil", "Kenin ouij"],
  ["Guardar en favoritos", "Kanáant ti' ba'ax a yaabilmaj", "Xikpia ika tlen tikneki"],
  ["Guardada en favoritos", "Kanáanta'an", "Opixtok"],
  ["Imprimir receta", "Ts'íibt ti' ju'un", "Xikkixti ipan amatl"],
  ["LA HISTORIA DETRÁS DEL PLATILLO", "U TSIKBALIL LE JANALA'", "ITLAPOWAL IN TLAKUALLI"],
  ["Una cocina para reunirnos", "Jump'éel k'óoben utia'al k much'ikbáaj", "Se tlakualchiwalkalli ika timosepanoaskeh"],
  ["¿Dónde se cocina?", "¿Tu'ux ku beeta'al?", "¿Kanin mochiwa?"],
  ["Ubicación aproximada de la localidad de origen.", "U kúuchil le kaaj tu'ux u taal.", "Kanin pewa in tlakualli."],
  ["Otros sabores para descubrir", "Uláak' ki'ibokilo'ob utia'al a kaxtik", "Okseki awiyakyotl ika tikittas"],
  ["Explorar recetas", "Xíimbalt janalo'ob", "Xikitta tlakualli"],
  ["Publicar comentario", "Ts'íib a t'aan", "Xiktlali motlahtol"],
  ["Portador(a) de saberes", "U kanáantmaj ojéelo'ob", "Tlamatini"],
  ["Ver perfil y sus recetas", "Il u kúuchil yéetel u janalo'ob", "Xikitta ichan wan itlakual"],

  // Búsqueda y resultados
  ["ENCUENTRA TU PRÓXIMO PLATILLO", "KAXT A U LÁAK' JANAL", "XIKTEMO MOTLAKUAL"],
  ["Todas las recetas", "Tuláakal janalo'ob", "Nochi tlakualli"],
  ["Refina tu búsqueda", "Ma'alobkint a kaxtik", "Xikkualti motlatemolis"],
  ["Estado", "Péetlu'um", "Weyaltepetl"],
  ["Estado *", "Péetlu'um *", "Weyaltepetl *"],
  ["Tipo de platillo", "U jejeláasil janal", "Tlakualli tlamantli"],
  ["Tiempo de preparación", "U k'iinil u beeta'al", "Kawitl ika mochiwa"],
  ["Hasta 30 minutos", "Tak 30 minuuto'ob", "Ixkichka 30 minutos"],
  ["De 30 a 60 minutos", "Ti' 30 tak 60 minuuto'ob", "Ten 30 ixkichka 60 minutos"],
  ["Más de 60 minutos", "Asab ya'ab ti' 60 minuuto'ob", "Achi miak ke 60 minutos"],
  ["Solo con fotografía", "Chéen yéetel oochel", "San ika ixkopinkayotl"],
  ["Aplicar filtros", "Meyajt le kaxtiko'", "Xiktekiti"],
  ["Limpiar filtros", "P'o' le kaxtiko'", "Xikchipawa"],
  ["Filtros activos:", "Ba'ax ku kaxta'al:", "Tlen titemowah:"],
  ["Todos los tipos", "Tuláakal u jejeláasil", "Nochi tlamantli"],
  ["Cualquier dificultad", "Je'el bix u talamile'", "Kenin tlanel ouij"],
  ["Anterior", "Táanil", "Achtopa"],
  ["Siguiente", "U láak'", "Satepan"],
  ["BUSCA A TU MANERA", "KAXT BIX A K'ÁAT", "XIKTEMO KEN TIKNEKI"],
  ["El sabor que tienes en mente.", "Le ki'ibok yaan ti' a tuukul.", "In awiyakyotl tlen tikilnamiki."],
  ["Personaliza tu búsqueda", "Beet a kaxtik bix a k'áat", "Xikchiwa motlatemolis ken tikneki"],
  ["Nombre del platillo", "U k'aaba' le janalo'", "Itokay in tlakualli"],
  ["Ingredientes que quieres usar", "U nu'ukulil a k'áat a meyajt", "Tlen monekis tlen tikneki"],
  ["Región", "Lu'umil", "Tlalmantli"],
  ["Tiempo máximo", "Asab ya'ab k'iin", "Achi miak kawitl"],
  ["Limpiar todos los campos", "P'o' tuláakal", "Xikchipawa nochi"],
  ["Empieza por lo que tienes.", "Káajsej yéetel ba'ax yaan tech.", "Xipewa ika tlen tikpia."],
  ["¿Prefieres un lugar?", "¿A k'áat jump'éel kúuchil?", "¿Tikneki se tlalli?"],
  ["Volver al mapa", "Suunak ti' le mapa'", "Ximokuepa ka in mapa"],
  ["Cambiar de estado", "K'ex péetlu'um", "Xikpatla weyaltepetl"],
  ["Sus municipios en el mapa", "U méek'tankaajo'ob ti' le mapa'", "Ialtepewan ipan in mapa"],
  ["Toca un municipio para ver sus recetas.", "Ch'a'ak jump'éel méek'tankaaj utia'al a wilik u janalo'ob.", "Xikkitzki se altepetl ika tikittas itlakual."],
  ["Todas las regiones", "Tuláakal lu'umilo'ob", "Nochi tlalmantli"],
  ["Tiempo", "K'iin", "Kawitl"],
  ["Con fotografía", "Yéetel oochel", "Ika ixkopinkayotl"],
  ["Más recientes", "Asab túumben", "Achi yankuik"],
  ["¿Qué se cocina en tu comunidad?", "¿Ba'ax ku beeta'al ti' a kaajal?", "¿Tlen mochiwa moaltepepan?"],
  ["Aportar una receta", "T'ox jump'éel janal", "Xiktlamaka se tlakualli"],

  // Acceso
  ["BIENVENIDA A LA COMUNIDAD", "KI'IMAK ÓOLAL TI' LE KAAJO'", "XIMOPANOLTI ITECH IN ALTEPETL"],
  ["Qué gusto tenerte de vuelta.", "¡Ki'imak in wóol a suunaj!", "¡Nipaki ika otimokuep!"],
  ["Contraseña", "U t'aanil ookol", "Ichtakatlahtolli"],
  ["Contraseña *", "U t'aanil ookol *", "Ichtakatlahtolli *"],
  ["Recordar mi sesión", "K'a'ajsen", "Xinechilnamiki"],
  ["¿Olvidaste tu contraseña?", "¿Tu tu'ubsaj a t'aanil ookol?", "¿Otikilkaw moichtakatlahtol?"],
  ["¿Aún no tienes cuenta?", "¿Mina'an a kúuchil?", "¿Ayamo tikpia mokwenta?"],
  ["Regístrate aquí", "Ts'íib a k'aaba' way", "Ximotlali nikan"],
  ["COCINAR TAMBIÉN ES RECORDAR", "BEETIK JANAL XAN K'A'AJSAJ", "TLAKUALCHIWA NO TLALNAMIKI"],
  ["Cada receta tiene un lugar. Y una historia que contar.", "Kada janal yaan u kúuchil. Yéetel jump'éel tsikbal.", "Nochi tlakualli kipia ichan. Wan se tlapowalli."],
  ["Forma parte de una memoria gastronómica que se construye en comunidad.", "Táakpajen ti' jump'éel k'a'ajsajil janal ku beeta'al ichil kaaj.", "Ximopowa itech se tlalnamikilistli tlen mochiwa ika altepetl."],
  ["Súmate a nuestra mesa.", "Taal ti' k mayak'che'.", "Xiwala ka totlakualpan."],
  ["TU HISTORIA TIENE UN LUGAR AQUÍ", "A TSIKBAL YAAN U KÚUCHIL WAY", "MOTLAPOWAL KIPIA ICHAN NIKAN"],
  ["¿Cómo quieres participar? *", "¿Bix a k'áat a táakpajal? *", "¿Ken tikneki timopalewis? *"],
  ["Portador o portadora de saberes", "U kanáantmaj ojéelo'ob", "Tlamatini"],
  ["Usuario", "Máax ku xíimbal", "Akin kitta"],
  ["Nombre completo *", "U chuka'an k'aaba' *", "Mochi motokay *"],
  ["Crear mi cuenta", "Beet in kúuchil", "Xikchiwa nokwenta"],
  ["Confirma tu contraseña *", "Ka'a ts'íibt a t'aanil ookol *", "Okseppa xiktlali moichtakatlahtol *"],
  ["¿Ya tienes una cuenta?", "¿Yaan a kúuchil?", "¿Ye tikpia mokwenta?"],
  ["Inicia sesión", "Ookoen", "Xikalaki"],
  ["RECUPERA EL ACCESO", "SUUT A OOKOL", "XIKKUEPA MOKALAKIS"],
  ["Volvamos a tu cocina.", "Ko'ox suunal ti' a k'óoben.", "Ma timokuepakan ka motlakualchiwalkal."],
  ["Enviar enlace de recuperación", "Túuxt u bejil", "Xiktitlani in ohtli"],
  ["Volver a iniciar sesión", "Suunak ti' ookol", "Ximokuepa ka kalakilistli"],
  ["ELIGE UNA NUEVA CONTRASEÑA", "YÉEY JUMP'ÉEL TÚUMBEN T'AANIL OOKOL", "XIKPEPENA SE YANKUIK ICHTAKATLAHTOLLI"],
  ["Un nuevo comienzo.", "Jump'éel túumben káajbal.", "Se yankuik pewalistli."],
  ["Nueva contraseña", "Túumben t'aanil ookol", "Yankuik ichtakatlahtolli"],
  ["Guardar nueva contraseña", "Kanáant le túumben t'aanil ookolo'", "Xikpia in yankuik ichtakatlahtolli"],

  // Publicar
  ["COMPARTE LO QUE SE COCINA EN TU COMUNIDAD", "T'OX BA'AX KU BEETA'AL TI' A KAAJAL", "XIKTLAMAKA TLEN MOCHIWA MOALTEPEPAN"],
  ["Tu receta, parte de nuestra memoria.", "A janal, u xóot'ol k k'a'ajsajil.", "Motlakual, itech totlalnamikilis."],
  ["El platillo y su historia", "Le janal yéetel u tsikbalo'", "In tlakualli wan itlapowal"],
  ["El lugar de la receta", "U kúuchil le janala'", "Ichan in tlakualli"],
  ["Ingredientes y cantidades", "U nu'ukulil yéetel bajux", "Tlen monekis wan kesqui"],
  ["Preparación paso a paso", "Bix u beeta'al, chan chan", "Ken mochiwa, se ika se"],
  ["Los últimos detalles", "U ts'ook ba'alo'ob", "Tlen tlami"],
  ["Guardar borrador", "Kanáant le ts'íibo'", "Xikpia in tlakuilolli"],
  ["Agregar ingrediente", "Ts'áa u nu'ukul", "Xiktlali tlen monekis"],
  ["Agregar paso", "Ts'áa jump'éel ba'al", "Xiktlali se tlamantli"],
  ["Antes de publicar", "Táanil ti' a t'oxik", "Achtopa tiktlamakas"],
  ["Comparte con respeto", "T'ox yéetel tsiik", "Xiktlamaka ika tlakaitalistli"],
  ["Municipio *", "Méek'tankaaj *", "Altepetl *"],
  ["Localidad o comunidad *", "Kaaj *", "Kalpolli *"],
  ["Porciones *", "Jayp'éel máak *", "Kesqui tlakah *"],
  ["Tiempo total *", "Tuláakal k'iin *", "Nochi kawitl *"],
  ["Dificultad *", "Bix u talamil *", "Kenin ouij *"],
  ["Tipo de platillo *", "U jejeláasil janal *", "Tlakualli tlamantli *"],
  ["Nombre de la receta *", "U k'aaba' le janalo' *", "Itokay in tlakualli *"],
  ["Descripción e historia *", "Bix yaanik yéetel u tsikbal *", "Ken eltok wan itlapowal *"],
  ["TU VOZ IMPORTA", "A T'AAN JACH K'A'ANA'AN", "MOTLAHTOL MONEKI"],
  ["Cocinar, contar, conservar.", "Beetik janal, tsikbal, kanáantik.", "Tlakualchiwa, tlapowa, tlapia."],

  // Perfiles
  ["MI ESPACIO EN SIGEPA", "IN KÚUCHIL TI' SIGEPA", "NOCHAN IPAN SIGEPA"],
  ["Editar perfil", "K'ex in k'aaba'", "Xikpatla mochan"],
  ["Mis recetas", "In janalo'ob", "Notlakual"],
  ["Favoritos", "Ba'ax in yaabilmaj", "Tlen nikneki"],
  ["Mis aportes", "Ba'ax tin t'oxaj", "Tlen onitlamakak"],
  ["Sabores para volver.", "Ki'ibokilo'ob utia'al suunal.", "Awiyakyotl ika timokuepas."],
  ["Siempre hay otro lugar que descubrir.", "Mantats' yaan uláak' kúuchil utia'al a kaxtik.", "Nochipa onka okse tlalli ika tikittas."],
  ["Volver a explorar México", "Suunak a xíimbalt México", "Ximokuepa xikitta Mexko"],
  ["VOCES DE NUESTRA COCINA", "U T'AAN K K'ÓOBEN", "ITLAHTOL TOTLAKUALCHIWALKAL"],
  ["Quiero compartir recetas", "In k'áat in t'oxik janalo'ob", "Niknekik niktlamakas tlakualli"],

  // Sobre el proyecto
  ["CONOCER, COMPARTIR Y CONSERVAR", "OJÉELTIK, T'OXIK YÉETEL KANÁANTIK", "TLAMACHILIA, TLAMAKA WAN TLAPIA"],
  ["Un mapa de sabores. Una memoria compartida.", "Jump'éel mapa ki'ibokilo'ob. Jump'éel k'a'ajsajil t'o'oxa'an.", "Se mapa awiyakyotl. Se tlalnamikilistli tlen motlamaka."],
  ["Lo que da sentido al proyecto", "Ba'ax ku ts'áak u na'atil le meyaja'", "Tlen kitlalia ineltokalis in tekitl"],
  ["El territorio da contexto", "Le lu'umo' ku ts'áak u na'atil", "In tlalli kitlalia ineltokalis"],
  ["La comunidad tiene la voz", "Le kaajo' yaan u t'aan", "In altepetl kipia itlahtol"],
  ["Conservar también es cuidar", "Kanáantik xan u yaabilta'al", "Tlapia no tlakuitlawia"],
  ["UNA MEMORIA EN MOVIMIENTO", "JUMP'ÉEL K'A'AJSAJIL KU SUTUKBÁAJ", "SE TLALNAMIKILISTLI TLEN MOLINI"],
  ["Hay muchas formas de ser parte.", "Yaan ya'ab bix u táakpajal.", "Onka miak tlamantli ika timopowas."],
  ["Explora", "Xíimbalt", "Xikitta"],
  ["Aporta", "T'ox", "Xiktlamaka"],
  ["Conserva", "Kanáant", "Xikpia"],
  ["No hay una sola manera de cocinar México.", "Ma' chéen jump'éel bix u beeta'al u janal México.", "Amo san se tlamantli ika mochiwa itlakual Mexko."],
  ["Tu historia también alimenta este mapa.", "A tsikbal xan ku ts'áak u janal le mapa'.", "Motlapowal no kitlakualtia inin mapa."],
  ["Inicio", "Káajbal", "Pewalistli"],
  // Formularios y avisos frecuentes
  ["Correo electrónico", "U ts'íibil correo", "Correo"],
  ["Correo electrónico *", "U ts'íibil correo *", "Correo *"],
  ["Comentarios de la comunidad", "U t'aan le kaajo'", "Itlahtol in altepetl"],
  ["Fotografía del platillo *", "U oochel le janalo' *", "Ixkopinkayotl in tlakualli *"],
  ["Agregar fotografía", "Ts'áa oochel", "Xiktlali ixkopinkayotl"],
  ["Portadores de saberes", "U kanáantmajo'ob ojéelo'ob", "Tlamatinimeh"],
  ["Seguir explorando", "Xíimbalt", "Xikitta okse"],
  ["Soy portador o portadora de saberes", "Teen u kanáantmaj ojéelo'ob", "Nehwatl nitlamatini"],
  ["Marca la localidad en el mapa", "Ts'áa u chíikul le kaaj ti' le mapa'", "Xikmachioti in kalpolli ipan in mapa"],
  ["Ingresar", "Ookol", "Xikalaki"],
  ["Asistente", "Áantaj", "Tlapalewiani"],
  ["Asistente SIGEPA", "U áantajil SIGEPA", "Itlapalewiani SIGEPA"],
  ["Recetas, presupuesto e ingredientes con el mapa", "Janalo'ob, taak'in yéetel u nu'ukulil ti' le mapa'", "Tlakualli, tomin wan tlen monekis ipan in mapa"],
  ["Precios aproximados de referencia. Recolecta con permiso y sin dañar las plantas.", "Le tojolo'oba' chéen ku na'atal. Ch'a' yéetel u cha'abil, ma' a k'askúuntik le xíiwo'obo'.", "Tlapatiotl san ken nesi. Xikuika ika tlanawatilli wan amo xikitlakalti in xiwitl."],
];

const AVISO = {
  yua: "Le t'aano'oba' ku xak'alta'al tumen ajt'aano'ob. Le janalo'obo' yaan ti' u t'aanil tu'ux u taalo'ob.",
  nah: "Inin tlahtolli kitlachiliah tlahtoanih. In tlakualli eltok ipan itlahtol tlen ompa kiski.",
};

const CLAVE = "sigepa.idioma";
const MAPA = { yua: new Map(), nah: new Map() };
FRASES.forEach(([es, yua, nah]) => { MAPA.yua.set(es, yua); MAPA.nah.set(es, nah); });

export function idiomaActual() {
  try { const v = localStorage.getItem(CLAVE); return IDIOMAS[v] ? v : "es"; } catch { return "es"; }
}

/** Traduce una frase fija; si no está en el diccionario regresa el texto original. */
export function t(texto, idioma = idiomaActual()) {
  if (idioma === "es" || !texto) return texto;
  return MAPA[idioma].get(texto) ?? texto;
}

// Separa símbolos de los extremos ("＋ Publicar receta", "Ver receta →") para buscar la frase limpia.
const PARTES = /^(\s*(?:[＋+←✓]\s*)?)(.*?)(\s*(?:→)?\s*)$/s;
const ORIGINALES = new WeakMap();
const ATRIBUTOS = ["placeholder", "aria-label", "title"];

function traducirTexto(nodo, idioma) {
  if (!ORIGINALES.has(nodo)) ORIGINALES.set(nodo, nodo.nodeValue);
  const original = ORIGINALES.get(nodo);
  if (idioma === "es") { if (nodo.nodeValue !== original) nodo.nodeValue = original; return; }
  const m = original.replace(/\s+/g, " ").match(PARTES);
  if (!m || !m[2]) return;
  const trad = MAPA[idioma].get(m[2]);
  const nuevo = trad ? `${m[1]}${trad}${m[3]}` : original;
  if (nodo.nodeValue !== nuevo) nodo.nodeValue = nuevo;
}

function traducirElemento(el, idioma) {
  ATRIBUTOS.forEach((a) => {
    if (!el.hasAttribute?.(a)) return;
    const clave = `data-es-${a}`;
    if (!el.hasAttribute(clave)) el.setAttribute(clave, el.getAttribute(a));
    const original = el.getAttribute(clave);
    el.setAttribute(a, idioma === "es" ? original : t(original, idioma));
  });
}

function traducirArbol(raiz, idioma) {
  if (raiz.nodeType === Node.TEXT_NODE) { traducirTexto(raiz, idioma); return; }
  if (raiz.nodeType !== Node.ELEMENT_NODE || raiz.closest?.("script,style,[data-sin-traducir]")) return;
  traducirElemento(raiz, idioma);
  raiz.querySelectorAll?.("[placeholder],[aria-label],[title]").forEach((el) => traducirElemento(el, idioma));
  const recorrido = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest("script,style,[data-sin-traducir]") || !n.nodeValue.trim()
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = recorrido.nextNode(); n; n = recorrido.nextNode()) traducirTexto(n, idioma);
}

function pintarAviso(idioma) {
  document.querySelector("[data-aviso-idioma]")?.remove();
  if (idioma === "es") return;
  document.querySelector(".nav")?.insertAdjacentHTML("afterend",
    `<div class="aviso-idioma" data-aviso-idioma data-sin-traducir role="note"><span lang="${idioma}">${AVISO[idioma]}</span>
     <span>Traducción en revisión con hablantes de la lengua. Las recetas se muestran en el idioma en que fueron escritas.</span></div>`);
}

let observador = null;
export function aplicarIdioma(idioma = idiomaActual()) {
  try { localStorage.setItem(CLAVE, idioma); } catch { /* sin almacenamiento */ }
  document.documentElement.lang = idioma;
  observador?.disconnect();
  traducirArbol(document.body, idioma);
  pintarAviso(idioma);
  document.querySelectorAll("[data-idioma-actual]").forEach((e) => { e.textContent = IDIOMAS[idioma].corto; });
  document.querySelectorAll("[data-idioma]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.idioma === idioma)));
  // Traduce también lo que se pinte después (listas, tarjetas, mensajes)
  observador = new MutationObserver((cambios) => {
    const actual = idiomaActual();
    cambios.forEach((c) => c.addedNodes.forEach((n) => traducirArbol(n, actual)));
  });
  observador.observe(document.body, { childList: true, subtree: true });
}
