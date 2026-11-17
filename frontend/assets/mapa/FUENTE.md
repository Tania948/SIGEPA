# Límites estatales y municipales

- Fuente: Marco Geoestadístico (INEGI) vía CONABIO 2023, distribuido en GeoJSON por
  https://github.com/PhantomInsights/mexico-geojson (licencia MIT, ver LICENSE-datos.txt).
- Procesado con mapshaper: geometrías simplificadas y convertidas a TopoJSON.
- `estados.json`: 32 entidades (campo `ent` = clave INEGI, igual a `estado.idEstado` en la BD).
- `municipios/NN.json`: municipios de cada entidad (`cve` = CVEGEO, `nombre` = NOMGEO).
