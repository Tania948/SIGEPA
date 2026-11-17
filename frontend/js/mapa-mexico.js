// Mapa interactivo de México con Leaflet.
// - Mapa base por API: CARTO / OpenStreetMap (calles) y Esri World Imagery (satélite).
// - Límites estatales y municipales del Marco Geoestadístico INEGI (assets/mapa, TopoJSON).
// - Pines de recetas con sus coordenadas.
// Requiere en la página: vendor/leaflet/leaflet.css, vendor/leaflet/leaflet.js y vendor/topojson-client.min.js
/* global L, topojson */

const RUTA = "assets/mapa";
const LIMITES_MEXICO = [[14.3, -118.6], [32.9, -86.4]];
const COLORES = {
  estado: "#cfdccb", borde: "#194e3c", activo: "#b95134", municipio: "#e6b34f", punto: "#b95134",
};

const cache = new Map();
async function topo(ruta) {
  if (!cache.has(ruta)) {
    cache.set(ruta, fetch(`${RUTA}/${ruta}`).then((r) => {
      if (!r.ok) throw new Error("No se pudieron cargar los límites del mapa.");
      return r.json();
    }).then((t) => topojson.feature(t, Object.values(t.objects)[0])));
  }
  return cache.get(ruta);
}
export const claveEnt = (id) => String(id).padStart(2, "0");
export const cargarMunicipios = (idEstado) => topo(`municipios/${claveEnt(idEstado)}.json`);

/** Punto dentro de un polígono GeoJSON (Polygon o MultiPolygon). */
export function contiene(geom, lng, lat) {
  const dentro = (anillo) => {
    let c = false;
    for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
      const [x1, y1] = anillo[i]; const [x2, y2] = anillo[j];
      if ((y1 > lat) !== (y2 > lat) && lng < ((x2 - x1) * (lat - y1)) / (y2 - y1) + x1) c = !c;
    }
    return c;
  };
  const polys = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];
  return polys.some((p) => dentro(p[0]) && !p.slice(1).some(dentro));
}

function capasBase() {
  const calles = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    maxZoom: 18, subdomains: "abcd",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a> · Límites: INEGI',
  });
  const satelite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 18, attribution: "Imágenes &copy; Esri · Límites: INEGI",
  });
  return { Mapa: calles, "Satélite": satelite };
}

/**
 * Crea el atlas.
 * op.alSeleccionarEstado(idEstado)      clic en un estado
 * op.alSeleccionarMunicipio({cve, nombre, idEstado})  clic en un municipio
 * op.textoMunicipio(cve, nombre)        texto del tooltip de un municipio
 * op.soloEstado                         idEstado: muestra únicamente ese estado (página de estado / receta)
 * op.alClicMapa(latlng)                 clic libre en el mapa (para elegir ubicación)
 */
export function crearAtlas(el, op = {}) {
  const mapa = L.map(el, {
    zoomControl: false, minZoom: 4, zoomSnap: 0.25, zoomDelta: 0.5, maxBounds: L.latLngBounds(LIMITES_MEXICO).pad(0.35),
    scrollWheelZoom: op.rueda ?? false, attributionControl: true,
  });
  const bases = capasBase();
  bases.Mapa.addTo(mapa);
  L.control.layers(bases, null, { position: "topleft", collapsed: true }).addTo(mapa);
  L.control.zoom({ position: "topright", zoomInTitle: "Acercar", zoomOutTitle: "Alejar" }).addTo(mapa);
  L.control.scale({ imperial: false, position: "bottomleft" }).addTo(mapa);
  mapa.fitBounds(LIMITES_MEXICO);
  mapa.on("focus", () => mapa.scrollWheelZoom.enable());
  mapa.on("blur", () => { if (!op.rueda) mapa.scrollWheelZoom.disable(); });

  let capaEstados = null;
  let capaMunicipios = null;
  let capaPuntos = L.layerGroup().addTo(mapa);
  let estadoActivo = null;
  let municipioActivo = null;
  const listo = topo("estados.json").then((geo) => {
    capaEstados = L.geoJSON(geo, {
      filter: (f) => !op.soloEstado || Number(f.properties.ent) === Number(op.soloEstado),
      style: () => ({ color: COLORES.borde, weight: 0.9, fillColor: COLORES.estado, fillOpacity: 0.45 }),
      onEachFeature: (f, capa) => {
        if (op.soloEstado) return;
        capa.bindTooltip(() => op.textoEstado?.(Number(f.properties.ent)) ?? f.properties.nombre, { sticky: true, className: "mapa-tooltip" });
        capa.on({
          mouseover: () => { if (Number(f.properties.ent) !== estadoActivo) capa.setStyle({ fillOpacity: 0.7 }); },
          mouseout: () => { if (Number(f.properties.ent) !== estadoActivo) capa.setStyle({ fillOpacity: 0.45 }); },
          click: () => op.alSeleccionarEstado?.(Number(f.properties.ent)),
        });
      },
    }).addTo(mapa);
    capaPuntos.bringToFront?.();
    return capaEstados;
  });

  if (op.alClicMapa) mapa.on("click", (e) => op.alClicMapa(e.latlng));

  async function pintarMunicipios(idEstado) {
    if (capaMunicipios) { mapa.removeLayer(capaMunicipios); capaMunicipios = null; }
    if (!idEstado) return null;
    const geo = await cargarMunicipios(idEstado);
    if (estadoActivo !== idEstado) return null;
    capaMunicipios = L.geoJSON(geo, {
      style: () => ({ color: COLORES.borde, weight: 0.6, opacity: 0.8, fillColor: COLORES.municipio, fillOpacity: 0 }),
      onEachFeature: (f, capa) => {
        const { cve, nombre } = f.properties;
        capa.bindTooltip(() => op.textoMunicipio?.(cve, nombre) ?? nombre, { sticky: true, className: "mapa-tooltip" });
        capa.on({
          mouseover: () => { if (cve !== municipioActivo) capa.setStyle({ fillOpacity: 0.28 }); },
          mouseout: () => { if (cve !== municipioActivo) capa.setStyle({ fillOpacity: 0 }); },
          click: (e) => {
            if (op.alClicMapa) { op.alClicMapa(e.latlng); return; }
            op.alSeleccionarMunicipio?.({ cve, nombre, idEstado });
          },
        });
      },
    }).addTo(mapa);
    capaPuntos.eachLayer((p) => p.bringToFront?.());
    return capaMunicipios;
  }

  const api = {
    mapa,
    listo,
    /** Resalta un estado, acerca el mapa y carga sus municipios. */
    async seleccionarEstado(idEstado, { acercar = true } = {}) {
      await listo;
      estadoActivo = idEstado ? Number(idEstado) : null;
      municipioActivo = null;
      let limites = null;
      capaEstados.eachLayer((c) => {
        const activo = Number(c.feature.properties.ent) === estadoActivo;
        c.setStyle(activo
          ? { fillColor: COLORES.activo, fillOpacity: op.soloEstado ? 0.12 : 0.22, color: COLORES.activo, weight: 2 }
          : { fillColor: COLORES.estado, fillOpacity: estadoActivo ? 0.25 : 0.45, color: COLORES.borde, weight: 0.9 });
        if (activo) limites = c.getBounds();
      });
      if (acercar) mapa.flyToBounds(limites ?? LIMITES_MEXICO, { padding: [24, 24], duration: 0.6 });
      return pintarMunicipios(estadoActivo);
    },
    /** Resalta un municipio (clave INEGI de 5 dígitos). */
    seleccionarMunicipio(cve, { acercar = true } = {}) {
      municipioActivo = cve;
      let limites = null;
      capaMunicipios?.eachLayer((c) => {
        const activo = c.feature.properties.cve === cve;
        c.setStyle(activo ? { fillColor: COLORES.activo, fillOpacity: 0.45, weight: 2, color: COLORES.activo }
          : { fillColor: COLORES.municipio, fillOpacity: 0, weight: 0.6, color: COLORES.borde });
        if (activo) { limites = c.getBounds(); c.bringToFront(); }
      });
      capaPuntos.eachLayer((p) => p.bringToFront?.());
      if (acercar && limites) mapa.flyToBounds(limites, { padding: [40, 40], maxZoom: 12, duration: 0.6 });
      return limites;
    },
    /** Vuelve a la vista de todo México. */
    verPais() {
      estadoActivo = null; municipioActivo = null;
      capaEstados?.eachLayer((c) => c.setStyle({ fillColor: COLORES.estado, fillOpacity: 0.45, color: COLORES.borde, weight: 0.9 }));
      pintarMunicipios(null);
      mapa.flyToBounds(LIMITES_MEXICO, { duration: 0.6 });
    },
    /** Pines de recetas: [{idReceta, nombreReceta, latitud, longitud, municipio, estado}] */
    mostrarPuntos(lista, { enlace = true } = {}) {
      capaPuntos.clearLayers();
      lista.filter((r) => r.latitud != null && r.longitud != null).forEach((r) => {
        const m = L.circleMarker([r.latitud, r.longitud], {
          radius: 6, color: "#fff", weight: 2, fillColor: COLORES.punto, fillOpacity: 1, pane: "markerPane",
        });
        const lugar = [r.localidad, r.municipio && r.municipio !== r.localidad ? r.municipio : null, r.estado?.nomEstado].filter(Boolean).join(", ");
        m.bindPopup(`<strong class="mapa-popup__titulo">${escapar(r.nombreReceta)}</strong><span class="mapa-popup__lugar">${escapar(lugar)}</span>`
          + (enlace && r.idReceta ? `<a class="mapa-popup__enlace" href="receta.html?id=${r.idReceta}">Ver receta →</a>` : ""));
        m.addTo(capaPuntos);
      });
    },
    /** Pin único (receta o ubicación elegida). */
    marcar(lat, lng, texto) {
      capaPuntos.clearLayers();
      if (lat == null || lng == null) return;
      const m = L.circleMarker([lat, lng], { radius: 8, color: "#fff", weight: 3, fillColor: COLORES.punto, fillOpacity: 1, pane: "markerPane" }).addTo(capaPuntos);
      if (texto) m.bindTooltip(texto, { permanent: false, className: "mapa-tooltip" });
    },
    recalcular() { mapa.invalidateSize(); },
  };
  return api;
}

function escapar(t) {
  return String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
