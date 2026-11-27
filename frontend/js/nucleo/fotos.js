// Fotografías reales con licencia libre de Wikimedia Commons (no generadas por IA).
// Se enlazan desde los servidores de Wikimedia y cada una acredita a su autor en su página de Commons.
// Para cambiar una foto: busca el archivo en commons.wikimedia.org, copia su nombre y genera la URL
// con el script docs/fotos.md (o pega la URL "960px" que da Commons en "Usar este archivo").

export const FOTOS = {
  cocinaMexicana: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/T%C3%ADpica_cocina_mexicana.jpg/960px-T%C3%ADpica_cocina_mexicana.jpg", archivo: "Típica_cocina_mexicana.jpg", alt: "Cocina mexicana tradicional con ollas de barro, especias y utensilios" },
  comal: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Barro_comal.jpg/960px-Barro_comal.jpg", archivo: "Barro_comal.jpg", alt: "Jitomates asándose sobre un comal de barro" },
  mercado: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Mole_du_marche_de_Oaxaca.JPG/960px-Mole_du_marche_de_Oaxaca.JPG", archivo: "Mole_du_marche_de_Oaxaca.JPG", alt: "Puesto de moles en un mercado de Oaxaca" },
  chocolate: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/MakingHotChocoVillaEtla4.jpg/960px-MakingHotChocoVillaEtla4.jpg", archivo: "MakingHotChocoVillaEtla4.jpg", alt: "Cocinera sirviendo chocolate en el mercado de Villa de Etla, Oaxaca" },
  chapulines: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Chapulines_de_Oaxaca.jpg/960px-Chapulines_de_Oaxaca.jpg", archivo: "Chapulines_de_Oaxaca.jpg", alt: "Chapulines a la venta en un mercado de Oaxaca" },
};

const COMMONS = "https://upload.wikimedia.org/wikipedia/commons/";

/** ¿La URL es de Wikimedia Commons? */
export const esCommons = (url) => typeof url === "string" && url.startsWith(COMMONS);

/** Nombre del archivo en Commons a partir de la URL de la miniatura. */
export function archivoCommons(url) {
  if (!esCommons(url)) return null;
  const partes = url.replace(COMMONS, "").split("/");
  const nombre = partes[0] === "thumb" ? partes[3] : partes[2];
  return nombre ? decodeURIComponent(nombre) : null;
}

/** Página del archivo en Commons (autor, licencia y descarga). */
export const paginaCommons = (archivo) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(archivo.replace(/ /g, "_"))}`;

/** Pide la miniatura en otro ancho estándar de Wikimedia (250, 330, 500, 960, 1280). */
export const tamanoFoto = (url, ancho) => (esCommons(url) ? url.replace(/\/\d+px-/, `/${ancho}px-`) : url);

/** Crédito corto para mostrar junto a una foto de Commons. */
export function creditoFoto(url) {
  const archivo = archivoCommons(url);
  return archivo ? { texto: "Foto: Wikimedia Commons", enlace: paginaCommons(archivo), archivo } : null;
}

/**
 * Si una foto no carga (sin internet o el archivo cambió), se oculta y su contenedor muestra un fondo
 * ilustrado en lugar de una imagen rota.
 */
export function activarRespaldoFotos() {
  document.addEventListener("error", (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || img.dataset.respaldoAplicado) return;
    img.dataset.respaldoAplicado = "1";
    img.hidden = true;
    img.parentElement?.classList.add("foto-caida");
  }, true);
}

/** Rellena las <img data-foto="clave"> con la foto del catálogo y su crédito. */
export function pintarFotosFijas(raiz = document) {
  raiz.querySelectorAll("img[data-foto]").forEach((img) => {
    const f = FOTOS[img.dataset.foto];
    if (!f) return;
    img.src = tamanoFoto(f.url, Number(img.dataset.ancho) || 960);
    img.alt = f.alt;
    if (img.dataset.credito !== undefined && !img.nextElementSibling?.classList.contains("credito-foto")) {
      img.insertAdjacentHTML("afterend", `<a class="credito-foto" href="${paginaCommons(f.archivo)}" target="_blank" rel="noopener">Foto: Wikimedia Commons</a>`);
    }
  });
}
