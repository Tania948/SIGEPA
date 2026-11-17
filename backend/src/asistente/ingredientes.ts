// Catálogo de ingredientes que usa el asistente.
//
// - precio: precio de referencia APROXIMADO en pesos mexicanos por unidad base (kg, pieza, litro o manojo),
//   tomado como orden de magnitud de los monitoreos de Profeco ("Quién es Quién en los Precios") y del SNIIM
//   de la Secretaría de Economía en 2026. Varía mucho por región, temporada y lugar de compra; el asistente
//   siempre lo presenta como estimación. Actualízalo aquí cuando haga falta.
// - origen: de dónde viene el ingrediente (recolección, cultivo, pesca o mercado), en qué estados
//   (id = clave INEGI) y en qué temporada. Sirve para responder "¿dónde se recolecta…?" y para pintar el mapa.
//
// Es contenido fijo del sistema (como catalogos.js en el front): no agrega tablas a la base de datos.

export type UnidadBase = 'kg' | 'pieza' | 'l' | 'manojo';
export type TipoOrigen = 'recoleccion' | 'cultivo' | 'pesca' | 'crianza' | 'elaborado';

export interface Origen {
  tipo: TipoOrigen;
  estados: number[];
  temporada?: string;
  donde: string;
  cuidado?: string;
}

export interface Ingrediente {
  id: string;
  nombre: string;
  /** Palabras (sin acentos, en minúsculas) que identifican el ingrediente en una receta o pregunta. */
  patrones: string[];
  unidad: UnidadBase;
  precio: number;
  /** Ingrediente general al que pertenece ("frijol" para el ayocote), para búsquedas. */
  familia?: string;
  /** kg por pieza, para convertir piezas ↔ kg. */
  pesoPieza?: number;
  /** kg (o litros) por taza. */
  taza?: number;
  origen?: Origen;
}

const RECOLECTA_RESPONSABLE =
  'Pide permiso a quien cuida el terreno (ejido, comunidad o dueño), corta solo hojas o puntas sin arrancar la planta y deja suficiente para que vuelva a crecer.';

// El orden importa: los nombres más específicos van antes que los generales.
export const INGREDIENTES: Ingrediente[] = [
  { id: 'agua', nombre: 'Agua', patrones: ['agua'], unidad: 'l', precio: 0 },
  { id: 'sal', nombre: 'Sal', patrones: ['sal gruesa', 'sal'], unidad: 'kg', precio: 15 },
  { id: 'carbon', nombre: 'Carbón o leña', patrones: ['carbon', 'lena'], unidad: 'kg', precio: 15 },

  // Maíz y granos
  { id: 'tortilla-harina', nombre: 'Tortillas de harina', patrones: ['tortillas de harina'], unidad: 'kg', precio: 60, pesoPieza: 0.04 },
  { id: 'tlayuda', nombre: 'Tlayudas', patrones: ['tlayuda'], unidad: 'pieza', precio: 9 },
  { id: 'tortilla', nombre: 'Tortillas de maíz', patrones: ['tortillitas', 'tortilla'], unidad: 'kg', precio: 24, pesoPieza: 0.03 },
  { id: 'masa-tamal', nombre: 'Masa para tamal', patrones: ['masa para tamal'], unidad: 'kg', precio: 30, taza: 0.25 },
  { id: 'masa', nombre: 'Masa de maíz', patrones: ['masa'], unidad: 'kg', precio: 18, taza: 0.25 },
  { id: 'maiz-pozolero', familia: 'maiz', nombre: 'Maíz pozolero', patrones: ['maiz pozolero'], unidad: 'kg', precio: 45, taza: 0.2 },
  { id: 'maiz', nombre: 'Maíz', patrones: ['maiz nixtamalizado', 'maiz'], unidad: 'kg', precio: 20, taza: 0.2 },
  { id: 'hojas-elote', nombre: 'Hojas de maíz (totomoxtle)', patrones: ['hojas de elote', 'hojas de maiz', 'totomoxtle'], unidad: 'manojo', precio: 20,
    origen: { tipo: 'cultivo', estados: [20, 21, 15, 12, 14, 30], temporada: 'Todo el año (secas)', donde: 'Se venden secas en mercados; salen de la cosecha de la milpa.' } },
  { id: 'hojas-milpa', nombre: 'Hojas de milpa', patrones: ['hojas de milpa'], unidad: 'manojo', precio: 25,
    origen: { tipo: 'cultivo', estados: [20, 21, 12, 7], temporada: 'Lluvias (junio a octubre)', donde: 'Hojas tiernas de la planta de maíz; se cortan en la milpa familiar.', cuidado: RECOLECTA_RESPONSABLE } },
  { id: 'elote', nombre: 'Elote', patrones: ['elote'], unidad: 'pieza', precio: 10, pesoPieza: 0.3,
    origen: { tipo: 'cultivo', estados: [14, 15, 21, 20, 32, 16, 12], temporada: 'Lluvias (julio a octubre)', donde: 'Cosecha de la milpa; en mercados y puestos de temporada.' } },
  { id: 'huitlacoche', nombre: 'Huitlacoche', patrones: ['huitlacoche', 'cuitlacoche'], unidad: 'kg', precio: 140,
    origen: { tipo: 'recoleccion', estados: [15, 21, 29, 9, 17, 11], temporada: 'Lluvias (julio a septiembre)', donde: 'Hongo que crece en las mazorcas de la milpa; se cosecha con el elote y se vende en mercados.' } },
  { id: 'harina', nombre: 'Harina de trigo', patrones: ['harina'], unidad: 'kg', precio: 25, taza: 0.13 },
  { id: 'arroz', nombre: 'Arroz', patrones: ['arroz'], unidad: 'kg', precio: 32, taza: 0.2 },
  { id: 'garbanzo', nombre: 'Garbanzo', patrones: ['garbanzo'], unidad: 'kg', precio: 45, taza: 0.2 },
  { id: 'haba', nombre: 'Haba', patrones: ['haba'], unidad: 'kg', precio: 50, taza: 0.2 },
  { id: 'alverjon', nombre: 'Alverjón', patrones: ['alverjon'], unidad: 'kg', precio: 40, taza: 0.2 },
  { id: 'ayocote', familia: 'frijol', nombre: 'Frijol ayocote', patrones: ['ayocote'], unidad: 'kg', precio: 60, taza: 0.18,
    origen: { tipo: 'cultivo', estados: [21, 29, 15, 13], temporada: 'Cosecha en otoño', donde: 'Se siembra junto al maíz en la milpa del centro del país.' } },
  { id: 'frijol', nombre: 'Frijol', patrones: ['frijol'], unidad: 'kg', precio: 30, taza: 0.18 },

  // Carnes, aves y huevo
  { id: 'caldo', nombre: 'Caldo de pollo', patrones: ['caldo de pollo'], unidad: 'l', precio: 20, taza: 0.25 },
  { id: 'huevo', nombre: 'Huevo', patrones: ['huevo'], unidad: 'pieza', precio: 2.7, pesoPieza: 0.055 },
  { id: 'pechuga', familia: 'pollo', nombre: 'Pechuga de pollo', patrones: ['pechuga'], unidad: 'kg', precio: 110, pesoPieza: 0.5 },
  { id: 'pollo', nombre: 'Pollo', patrones: ['pollo'], unidad: 'kg', precio: 70, pesoPieza: 0.25, taza: 0.15 },
  { id: 'pavo', nombre: 'Guajolote o pavo', patrones: ['pavo', 'guajolote'], unidad: 'kg', precio: 90, pesoPieza: 4, taza: 0.15 },
  { id: 'carne-seca', familia: 'res', nombre: 'Carne seca o machaca', patrones: ['carne seca', 'machacado', 'machaca'], unidad: 'kg', precio: 450 },
  { id: 'cecina', familia: 'res', nombre: 'Cecina', patrones: ['cecina'], unidad: 'kg', precio: 260 },
  { id: 'tasajo', familia: 'res', nombre: 'Tasajo', patrones: ['tasajo'], unidad: 'kg', precio: 280 },
  { id: 'carnitas', familia: 'cerdo', nombre: 'Carnitas', patrones: ['carnitas'], unidad: 'kg', precio: 220 },
  { id: 'chicharron', nombre: 'Chicharrón', patrones: ['chicharron'], unidad: 'kg', precio: 200, taza: 0.05 },
  { id: 'chorizo', nombre: 'Chorizo', patrones: ['chorizo'], unidad: 'kg', precio: 120, pesoPieza: 0.1 },
  { id: 'tocino', nombre: 'Tocino', patrones: ['tocino'], unidad: 'kg', precio: 160 },
  { id: 'asiento', nombre: 'Asiento de cerdo', patrones: ['asiento'], unidad: 'kg', precio: 60, taza: 0.2 },
  { id: 'manteca', nombre: 'Manteca de cerdo', patrones: ['manteca'], unidad: 'kg', precio: 50, taza: 0.2 },
  { id: 'lechon', familia: 'cerdo', nombre: 'Lechón', patrones: ['lechon'], unidad: 'kg', precio: 150, pesoPieza: 8 },
  { id: 'cerdo', nombre: 'Carne de cerdo', patrones: ['cerdo', 'lomo', 'pierna'], unidad: 'kg', precio: 130 },
  { id: 'cabrito', nombre: 'Cabrito, chivo o carnero', patrones: ['cabrito', 'chivo', 'carnero'], unidad: 'kg', precio: 220, pesoPieza: 6 },
  { id: 'res', nombre: 'Carne de res', patrones: ['res', 'chambarete', 'carne molida', 'carne picada'], unidad: 'kg', precio: 190, taza: 0.2 },
  { id: 'escamoles', nombre: 'Escamoles', patrones: ['escamol'], unidad: 'kg', precio: 1500,
    origen: { tipo: 'recoleccion', estados: [13, 15, 29, 21], temporada: 'Marzo a abril', donde: 'Larvas de hormiga que se sacan de nidos al pie de magueyes y nopales en zonas semiáridas del Valle del Mezquital y los llanos de Apan.',
      cuidado: 'Su recolección está regulada en varios estados. Hazla con recolectores de la comunidad y deja parte del nido para que la colonia sobreviva.' } },
  { id: 'chapulines', nombre: 'Chapulines', patrones: ['chapulin'], unidad: 'kg', precio: 350,
    origen: { tipo: 'recoleccion', estados: [20, 21, 29], temporada: 'Mayo a noviembre (más en lluvias)', donde: 'Se recolectan temprano en milpas y alfalfares; en Oaxaca se venden tostados en los mercados.' } },

  // Pescados y mariscos
  { id: 'pejelagarto', familia: 'pescado', nombre: 'Pejelagarto', patrones: ['pejelagarto'], unidad: 'kg', precio: 160, pesoPieza: 0.6,
    origen: { tipo: 'pesca', estados: [27, 7, 4], temporada: 'Todo el año', donde: 'Pesca en ríos y lagunas de Tabasco; se vende asado en los mercados de Villahermosa.' } },
  { id: 'chocolata', familia: 'almeja', nombre: 'Almeja chocolata', patrones: ['chocolata'], unidad: 'kg', precio: 120, pesoPieza: 0.08,
    origen: { tipo: 'pesca', estados: [3, 26, 25], temporada: 'Todo el año (respetando vedas)', donde: 'Bancos de arena del Golfo de California, como Loreto y Bahía Magdalena.' } },
  { id: 'almeja', nombre: 'Almejas', patrones: ['almeja'], unidad: 'kg', precio: 120 },
  { id: 'camaron', nombre: 'Camarón', patrones: ['camaron'], unidad: 'kg', precio: 260 },
  { id: 'pulpo', nombre: 'Pulpo', patrones: ['pulpo'], unidad: 'kg', precio: 280 },
  { id: 'jaiba', nombre: 'Jaiba', patrones: ['jaiba'], unidad: 'pieza', precio: 25, pesoPieza: 0.2 },
  { id: 'langosta', nombre: 'Langosta', patrones: ['langosta'], unidad: 'pieza', precio: 300, pesoPieza: 0.6 },
  { id: 'pescado', nombre: 'Pescado', patrones: ['pescado', 'pargo', 'cazon', 'filete'], unidad: 'kg', precio: 150, pesoPieza: 1 },

  // Lácteos
  { id: 'quesillo', familia: 'queso', nombre: 'Quesillo', patrones: ['quesillo', 'queso oaxaca'], unidad: 'kg', precio: 160 },
  { id: 'queso-seco', familia: 'queso', nombre: 'Queso seco', patrones: ['queso seco', 'cotija'], unidad: 'kg', precio: 180 },
  { id: 'queso', nombre: 'Queso fresco', patrones: ['queso', 'cuajada'], unidad: 'kg', precio: 120, taza: 0.12 },
  { id: 'crema', nombre: 'Crema', patrones: ['crema'], unidad: 'l', precio: 70, taza: 0.25 },
  { id: 'mantequilla', nombre: 'Mantequilla', patrones: ['mantequilla'], unidad: 'kg', precio: 200, taza: 0.22 },
  { id: 'leche', nombre: 'Leche', patrones: ['leche'], unidad: 'l', precio: 28, taza: 0.25 },

  // Hierbas, hojas y quelites (muchos se recolectan)
  { id: 'hoja-aguacate', nombre: 'Hoja de aguacate criollo', patrones: ['hojas de aguacate', 'hoja de aguacate'], unidad: 'manojo', precio: 15,
    origen: { tipo: 'recoleccion', estados: [20, 21, 16, 15, 12, 30], temporada: 'Todo el año', donde: 'Del árbol de aguacate criollo (de hoja anisada) en traspatios y huertas; también se vende seca en mercados.', cuidado: RECOLECTA_RESPONSABLE } },
  { id: 'hierba-santa', nombre: 'Hierba santa (hoja santa, momo, acuyo)', patrones: ['hierba santa', 'hoja santa', 'momo', 'acuyo', 'tlanepa'], unidad: 'manojo', precio: 15,
    origen: { tipo: 'recoleccion', estados: [20, 30, 7, 27, 21, 12, 4, 31], temporada: 'Todo el año; más tierna en lluvias', donde: 'Crece silvestre en orillas de caminos, arroyos y traspatios de clima cálido y húmedo.', cuidado: RECOLECTA_RESPONSABLE } },
  { id: 'chepiche', nombre: 'Chepiche y pápalo', patrones: ['chepiche', 'pipicha', 'papalo'], unidad: 'manojo', precio: 12,
    origen: { tipo: 'recoleccion', estados: [20, 21, 17, 12, 9], temporada: 'Lluvias (junio a octubre)', donde: 'Quelites que nacen entre la milpa y en terrenos de cultivo; también se venden por manojo en mercados.', cuidado: RECOLECTA_RESPONSABLE } },
  { id: 'chipilin', nombre: 'Chipilín', patrones: ['chipilin'], unidad: 'manojo', precio: 15,
    origen: { tipo: 'recoleccion', estados: [7, 27, 20, 30], temporada: 'Lluvias (junio a noviembre)', donde: 'Planta silvestre de potreros y orillas de milpas en tierras cálidas.', cuidado: RECOLECTA_RESPONSABLE } },
  { id: 'quelites', nombre: 'Quelites y verdolagas', patrones: ['quelite', 'verdolaga', 'quintonil', 'huauzontle'], unidad: 'manojo', precio: 15,
    origen: { tipo: 'recoleccion', estados: [9, 15, 21, 20, 29, 17, 13], temporada: 'Lluvias (junio a septiembre)', donde: 'Brotan solos en milpas, chinampas y parcelas; en Xochimilco y Milpa Alta se cultivan.', cuidado: RECOLECTA_RESPONSABLE } },
  { id: 'guias', nombre: 'Guías de calabaza', patrones: ['guias'], unidad: 'manojo', precio: 20,
    origen: { tipo: 'cultivo', estados: [20, 21, 12, 7], temporada: 'Lluvias (julio a octubre)', donde: 'Puntas tiernas de la planta de calabaza de la milpa; se venden por manojo.', cuidado: 'Corta solo las puntas para que la planta siga dando fruto.' } },
  { id: 'flor-calabaza', nombre: 'Flor de calabaza', patrones: ['flor de calabaza'], unidad: 'manojo', precio: 25,
    origen: { tipo: 'cultivo', estados: [15, 21, 9, 17, 20, 29], temporada: 'Lluvias (junio a octubre)', donde: 'Flores macho de la calabaza; se cortan por la mañana en la milpa.', cuidado: 'Toma las flores macho (sin calabacita) para no perder la cosecha.' } },
  { id: 'pepita', nombre: 'Pepita de calabaza', patrones: ['pepita'], unidad: 'kg', precio: 180, taza: 0.13 },
  { id: 'calabacita', nombre: 'Calabacita', patrones: ['calabacita', 'calabaza'], unidad: 'kg', precio: 28, pesoPieza: 0.2 },
  { id: 'epazote', nombre: 'Epazote', patrones: ['epazote'], unidad: 'manojo', precio: 10,
    origen: { tipo: 'recoleccion', estados: [9, 15, 21, 20, 17, 13, 29, 14], temporada: 'Todo el año; abundante en lluvias', donde: 'Crece silvestre en terrenos baldíos, orillas de milpa y traspatios.', cuidado: RECOLECTA_RESPONSABLE } },
  { id: 'chaya', nombre: 'Chaya', patrones: ['chaya'], unidad: 'manojo', precio: 15,
    origen: { tipo: 'cultivo', estados: [31, 23, 4, 27, 7], temporada: 'Todo el año', donde: 'Arbusto de los solares mayas; se corta de la planta sin arrancarla.', cuidado: 'Siempre se come cocida: cruda tiene compuestos tóxicos.' } },
  { id: 'hoja-platano', nombre: 'Hoja de plátano', patrones: ['hojas de platano', 'hoja de platano'], unidad: 'manojo', precio: 25,
    origen: { tipo: 'cultivo', estados: [27, 30, 7, 20, 12, 31], temporada: 'Todo el año', donde: 'Platanares del sureste; se venden en paquetes en mercados.' } },
  { id: 'mixiote', nombre: 'Hoja de mixiote', patrones: ['mixiote'], unidad: 'manojo', precio: 40,
    origen: { tipo: 'recoleccion', estados: [13, 15, 29, 21], temporada: 'Todo el año', donde: 'Es la película de la penca del maguey pulquero.',
      cuidado: 'Quitarla daña al maguey y su extracción está restringida. Lo responsable es usar papel para mixiote o comprar hoja de productores autorizados.' } },
  { id: 'maguey', nombre: 'Pencas de maguey', patrones: ['maguey'], unidad: 'pieza', precio: 30,
    origen: { tipo: 'cultivo', estados: [13, 15, 29, 21, 24, 32, 11], temporada: 'Todo el año', donde: 'Magueyeras del altiplano; las pencas se compran a productores de pulque.' } },
  { id: 'laurel', nombre: 'Laurel, tomillo y hierbas de olor', patrones: ['laurel', 'tomillo', 'hierbas de olor', 'azafran'], unidad: 'manojo', precio: 10 },
  { id: 'oregano', nombre: 'Orégano mexicano', patrones: ['oregano'], unidad: 'manojo', precio: 10,
    origen: { tipo: 'recoleccion', estados: [10, 8, 14, 22, 32, 11, 26], temporada: 'Septiembre a noviembre', donde: 'Arbusto silvestre de zonas semiáridas; lo recolectan comunidades y ejidos que lo secan y venden.', cuidado: 'Su aprovechamiento silvestre requiere permiso; compra a ejidos que lo manejan.' } },

  // Verduras, frutas y chiles
  { id: 'jitomate', nombre: 'Jitomate', patrones: ['jitomate', 'salsa de jitomate'], unidad: 'kg', precio: 30, pesoPieza: 0.15, taza: 0.2 },
  { id: 'tomate', nombre: 'Tomate verde', patrones: ['tomate'], unidad: 'kg', precio: 25, pesoPieza: 0.04 },
  { id: 'cebolla', nombre: 'Cebolla', patrones: ['cebolla', 'poro'], unidad: 'kg', precio: 30, pesoPieza: 0.2, taza: 0.15 },
  { id: 'ajo', nombre: 'Ajo', patrones: ['ajo'], unidad: 'kg', precio: 110, pesoPieza: 0.005 },
  { id: 'chiltepin', familia: 'chile-fresco', nombre: 'Chiltepín', patrones: ['chiltepin', 'chile piquin', 'amashito'], unidad: 'kg', precio: 900, pesoPieza: 0.0005,
    origen: { tipo: 'recoleccion', estados: [26, 25, 8, 19, 28, 27, 31], temporada: 'Septiembre a noviembre', donde: 'Chile silvestre que crece bajo árboles del monte (mezquites, palo fierro); en Sonora lo cosechan familias serranas.', cuidado: 'Corta los frutos sin dañar la mata; las aves dispersan la semilla, así que deja algunos.' } },
  { id: 'chile-seco', nombre: 'Chiles secos', patrones: ['ancho', 'guajillo', 'pasilla', 'mulato', 'arbol', 'chile colorado', 'chiles pasados', 'chilhuacle', 'chipotle', 'morita'], unidad: 'kg', precio: 220, pesoPieza: 0.008 },
  { id: 'chile-fresco', nombre: 'Chiles frescos', patrones: ['chile', 'chiles'], unidad: 'kg', precio: 40, pesoPieza: 0.02 },
  { id: 'xoconostle', nombre: 'Xoconostle', patrones: ['xoconostle'], unidad: 'kg', precio: 40, pesoPieza: 0.06,
    origen: { tipo: 'recoleccion', estados: [32, 24, 13, 11, 15, 1], temporada: 'Todo el año; más en otoño', donde: 'Tuna ácida de nopales silvestres y huertas del altiplano.', cuidado: 'Usa pinzas o guantes por las espinas y corta solo frutos maduros.' } },
  { id: 'nopal', nombre: 'Nopales', patrones: ['nopal'], unidad: 'kg', precio: 20, pesoPieza: 0.08, taza: 0.15,
    origen: { tipo: 'cultivo', estados: [9, 15, 17, 21, 24, 32, 11], temporada: 'Todo el año (más tiernos en primavera)', donde: 'Milpa Alta (CDMX) es el gran productor; en el norte también se cortan de nopaleras silvestres.', cuidado: 'Corta pencas tiernas con cuchillo sin desprender la planta madre.' } },
  { id: 'papa', nombre: 'Papa', patrones: ['papa'], unidad: 'kg', precio: 30, pesoPieza: 0.15 },
  { id: 'zanahoria', nombre: 'Zanahoria', patrones: ['zanahoria'], unidad: 'kg', precio: 18, pesoPieza: 0.1 },
  { id: 'chayote', nombre: 'Chayote', patrones: ['chayote'], unidad: 'kg', precio: 22, pesoPieza: 0.35 },
  { id: 'ejote', nombre: 'Ejotes', patrones: ['ejote'], unidad: 'kg', precio: 40, taza: 0.12 },
  { id: 'col', nombre: 'Col', patrones: ['col'], unidad: 'kg', precio: 15, pesoPieza: 1 },
  { id: 'pepino', nombre: 'Pepino', patrones: ['pepino'], unidad: 'kg', precio: 20, pesoPieza: 0.3 },
  { id: 'rabano', nombre: 'Rábano, lechuga y orégano', patrones: ['rabano', 'lechuga'], unidad: 'manojo', precio: 15 },
  { id: 'aguacate', nombre: 'Aguacate', patrones: ['aguacate'], unidad: 'kg', precio: 70, pesoPieza: 0.2 },
  { id: 'platano', nombre: 'Plátano macho', patrones: ['platano'], unidad: 'kg', precio: 25, pesoPieza: 0.3 },
  { id: 'naranja', nombre: 'Naranja (o naranja agria)', patrones: ['naranja'], unidad: 'kg', precio: 20, pesoPieza: 0.2, taza: 0.9 },
  { id: 'limon', nombre: 'Limón', patrones: ['limon'], unidad: 'kg', precio: 35, pesoPieza: 0.04 },
  { id: 'lima', nombre: 'Lima', patrones: ['lima'], unidad: 'pieza', precio: 3 },
  { id: 'durazno', nombre: 'Durazno', patrones: ['durazno'], unidad: 'kg', precio: 40, pesoPieza: 0.12 },
  { id: 'pera', nombre: 'Pera', patrones: ['pera'], unidad: 'kg', precio: 40, pesoPieza: 0.15 },
  { id: 'granada', nombre: 'Granada', patrones: ['granada'], unidad: 'pieza', precio: 25 },
  { id: 'nuez', nombre: 'Nuez de Castilla', patrones: ['nuez de castilla'], unidad: 'kg', precio: 600, taza: 0.1,
    origen: { tipo: 'cultivo', estados: [21, 29, 13], temporada: 'Agosto y septiembre', donde: 'Huertas de nogal de Calpan, Huejotzingo y la Sierra de Puebla; se pela fresca para los chiles en nogada.' } },
  { id: 'pasas', nombre: 'Pasas y almendras', patrones: ['pasas', 'almendra'], unidad: 'kg', precio: 250, taza: 0.15 },
  { id: 'ajonjoli', nombre: 'Ajonjolí', patrones: ['ajonjoli'], unidad: 'kg', precio: 120, taza: 0.15 },

  // Cacao, dulces y condimentos
  { id: 'flor-cacao', nombre: 'Flor de cacao (rosita)', patrones: ['flor de cacao', 'rosita'], unidad: 'kg', precio: 400,
    origen: { tipo: 'cultivo', estados: [20, 7], temporada: 'Todo el año', donde: 'Flor del árbol de cacahuaxóchitl en la Chinantla y la costa de Oaxaca; se vende seca en mercados.' } },
  { id: 'mamey', nombre: 'Hueso de mamey', patrones: ['mamey'], unidad: 'kg', precio: 200 },
  { id: 'cacao', nombre: 'Cacao', patrones: ['cacao'], unidad: 'kg', precio: 250, taza: 0.12,
    origen: { tipo: 'cultivo', estados: [27, 7, 20, 12], temporada: 'Cosecha de octubre a abril', donde: 'Cacaotales de la Chontalpa (Tabasco) y el Soconusco (Chiapas).' } },
  { id: 'chocolate', nombre: 'Chocolate de mesa', patrones: ['chocolate'], unidad: 'kg', precio: 150, pesoPieza: 0.09 },
  { id: 'vainilla', nombre: 'Vainilla', patrones: ['vainilla'], unidad: 'pieza', precio: 40,
    origen: { tipo: 'cultivo', estados: [30, 21, 20], temporada: 'Cosecha de diciembre a marzo', donde: 'Totonacapan: Papantla (Veracruz) y la Sierra Norte de Puebla.' } },
  { id: 'piloncillo', nombre: 'Piloncillo', patrones: ['piloncillo', 'panela'], unidad: 'kg', precio: 45, pesoPieza: 0.25, taza: 0.2 },
  { id: 'azucar', nombre: 'Azúcar', patrones: ['azucar'], unidad: 'kg', precio: 30, taza: 0.2 },
  { id: 'recado', nombre: 'Recado (rojo o negro)', patrones: ['recado', 'achiote'], unidad: 'kg', precio: 120, pesoPieza: 0.1 },
  { id: 'mole', nombre: 'Pasta de mole', patrones: ['mole'], unidad: 'kg', precio: 180, taza: 0.25 },
  { id: 'especias', nombre: 'Especias (comino, clavo, canela, pimienta)', patrones: ['comino', 'clavo', 'canela', 'pimienta'], unidad: 'kg', precio: 400, pesoPieza: 0.003 },
  { id: 'aceite', nombre: 'Aceite vegetal', patrones: ['aceite'], unidad: 'l', precio: 45, taza: 0.25 },
  { id: 'vinagre', nombre: 'Vinagre', patrones: ['vinagre'], unidad: 'l', precio: 25, taza: 0.25 },
  { id: 'soya', nombre: 'Salsa de soya', patrones: ['soya'], unidad: 'l', precio: 80 },
  { id: 'salsa', nombre: 'Salsa', patrones: ['salsa'], unidad: 'l', precio: 50, taza: 0.25 },
  { id: 'mayonesa', nombre: 'Mayonesa', patrones: ['mayonesa'], unidad: 'kg', precio: 70, taza: 0.22 },
  { id: 'cerveza', nombre: 'Cerveza', patrones: ['cerveza'], unidad: 'l', precio: 50, taza: 0.25 },
  { id: 'pulque', nombre: 'Pulque', patrones: ['pulque'], unidad: 'l', precio: 40, taza: 0.25 },
  { id: 'tequesquite', nombre: 'Tequesquite', patrones: ['tequesquite'], unidad: 'kg', precio: 40 },
  { id: 'polvo', nombre: 'Polvo para hornear', patrones: ['polvo para hornear'], unidad: 'kg', precio: 120 },
  { id: 'pan-molido', nombre: 'Pan molido', patrones: ['pan molido'], unidad: 'kg', precio: 50, taza: 0.12 },
  { id: 'pan', nombre: 'Pan blanco o birote', patrones: ['pan', 'birote', 'bolillo'], unidad: 'pieza', precio: 4 },

  // Solo para preguntas de recolección (no aparecen como ingrediente de recetas de ejemplo)
  { id: 'hongos', nombre: 'Hongos silvestres', patrones: ['hongo', 'setas', 'clavito', 'tecomate', 'pancita'], unidad: 'kg', precio: 160,
    origen: { tipo: 'recoleccion', estados: [15, 16, 29, 21, 9, 13, 17, 30], temporada: 'Lluvias (julio a septiembre)', donde: 'Bosques de pino y encino del Eje Neovolcánico, como el Nevado de Toluca, La Marquesa, La Malinche y el Cofre de Perote.',
      cuidado: 'Hay especies mortales muy parecidas a las comestibles: recolecta solo con un guía o hongueros de la comunidad y nunca comas uno que no esté identificado con certeza.' } },
  { id: 'pinon', nombre: 'Piñón', patrones: ['pinon'], unidad: 'kg', precio: 900,
    origen: { tipo: 'recoleccion', estados: [5, 8, 19, 32, 24, 10], temporada: 'Septiembre a noviembre', donde: 'Pinos piñoneros de las sierras del norte; lo recolectan familias y ejidos.' } },
  { id: 'mezquite', nombre: 'Vaina de mezquite', patrones: ['mezquite'], unidad: 'kg', precio: 30,
    origen: { tipo: 'recoleccion', estados: [26, 8, 5, 10, 24, 32, 11], temporada: 'Junio a agosto', donde: 'Se juntan del suelo bajo los mezquites del desierto; se muelen para hacer harina o atole.' } },
  { id: 'pitaya', nombre: 'Pitaya', patrones: ['pitaya', 'pitahaya'], unidad: 'kg', precio: 60,
    origen: { tipo: 'recoleccion', estados: [26, 3, 21, 20, 14, 32], temporada: 'Mayo a julio', donde: 'Fruto de cactáceas columnares del desierto de Sonora y la Mixteca.' } },
];

export const sinAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const escaparRegex = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const REGLAS = INGREDIENTES.map((i) => ({
  ingrediente: i,
  regex: new RegExp(`(^|[^a-z])(${i.patrones.map(escaparRegex).join('|')})(s|es)?($|[^a-z])`),
}));

/** Busca el ingrediente del catálogo que corresponde a un nombre libre ("chiles guajillo, sin semillas"). */
export function identificar(nombre: string): Ingrediente | null {
  const n = sinAcentos(nombre);
  return REGLAS.find((r) => r.regex.test(n))?.ingrediente ?? null;
}

/** Todos los ingredientes del catálogo que se mencionan en un texto. */
export function mencionados(texto: string, { soloConOrigen = false } = {}): Ingrediente[] {
  const n = ` ${sinAcentos(texto)} `;
  return REGLAS.filter((r) => (!soloConOrigen || r.ingrediente.origen) && r.regex.test(n)).map((r) => r.ingrediente);
}
