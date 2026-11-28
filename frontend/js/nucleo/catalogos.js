// Contenido de presentación que no forma parte del diccionario de datos
// (textos de cada estado, regiones sugeridas y listas de opciones de los formularios).

export const TIPOS_PLATILLO = ["Plato fuerte", "Sopa o caldo", "Antojito", "Tamal", "Salsa o mole", "Guarnición", "Postre", "Bebida"];
export const DIFICULTADES = ["Fácil", "Intermedia", "Avanzada"];
export const UNIDADES = ["g", "kg", "ml", "litros", "tazas", "cucharadas", "cucharaditas", "piezas", "pieza", "dientes", "ramitas", "hojas", "manojo", "pizca", "—"];
export const TIEMPOS_MAXIMOS = [30, 45, 60, 90, 120, 180];
export const RANGOS_TIEMPO = [
  { valor: "0-30", texto: "Hasta 30 minutos" },
  { valor: "30-60", texto: "De 30 a 60 minutos" },
  { valor: "60-", texto: "Más de 60 minutos" },
];

const ZONAS = {
  "Aguascalientes": "CENTRO · BAJÍO", "Baja California": "NOROESTE", "Baja California Sur": "NOROESTE",
  "Campeche": "SURESTE · PENÍNSULA", "Chiapas": "SUR · PACÍFICO", "Chihuahua": "NORTE", "Ciudad de México": "CENTRO",
  "Coahuila": "NORTE", "Colima": "OCCIDENTE · PACÍFICO", "Durango": "NORTE", "Guanajuato": "CENTRO · BAJÍO",
  "Guerrero": "SUR · PACÍFICO", "Hidalgo": "CENTRO", "Jalisco": "OCCIDENTE", "Estado de México": "CENTRO",
  "Michoacán": "OCCIDENTE", "Morelos": "CENTRO", "Nayarit": "OCCIDENTE · PACÍFICO", "Nuevo León": "NORESTE",
  "Oaxaca": "SUR · PACÍFICO", "Puebla": "CENTRO · ORIENTE", "Querétaro": "CENTRO · BAJÍO", "Quintana Roo": "SURESTE · PENÍNSULA",
  "San Luis Potosí": "CENTRO · NORTE", "Sinaloa": "NOROESTE", "Sonora": "NOROESTE", "Tabasco": "SURESTE · GOLFO",
  "Tamaulipas": "NORESTE · GOLFO", "Tlaxcala": "CENTRO · ORIENTE", "Veracruz": "ORIENTE · GOLFO",
  "Yucatán": "SURESTE · PENÍNSULA", "Zacatecas": "CENTRO · NORTE",
};

const INFO = {
  "Oaxaca": {
    intro: "Del comal de los Valles Centrales a las cocinas del Istmo: descubre distintas maneras de preparar, compartir y recordar.",
    texto: "Maíces, chiles y hierbas de temporada dan forma a una cocina que cambia entre sierras, valles y costas. Aquí, cada familia guarda una manera propia de llevar los ingredientes a la mesa.",
    temas: [["Maíz", "maíz"], ["Moles", "mole"], ["Cocina de comunidad", ""]],
    etiquetas: ["MILPA", "COMAL", "MERCADO", "COMUNIDAD"],
    imagen: "mercado",   // clave de FOTOS en nucleo/fotos.js (Wikimedia Commons)
  },
  "Yucatán": {
    intro: "Del recado rojo a la lima agria: una cocina de pib, cítricos y hojas de plátano.",
    etiquetas: ["PIB", "RECADO", "MILPA", "COMUNIDAD"],
  },
};

export function infoEstado(nombre = "") {
  const i = INFO[nombre] ?? {};
  return {
    zona: ZONAS[nombre] ?? "",
    intro: i.intro ?? `Descubre los platillos, ingredientes y saberes que las comunidades de ${nombre} comparten en SIGEPA.`,
    texto: i.texto ?? i.intro ?? `Cada receta de ${nombre} conserva su lugar de origen y la voz de quien la comparte. Explora lo que se cocina en sus regiones.`,
    temas: i.temas ?? [],
    etiquetas: i.etiquetas ?? [],
    imagen: i.imagen ?? null,
  };
}

/** Regiones del estado: vienen del catálogo region de la base (/api/recetas/regiones?estado=). */
export function regionesDe(_nombreEstado, desdeApi = []) {
  return [...new Set(desdeApi.map((r) => r.region ?? r))];
}
