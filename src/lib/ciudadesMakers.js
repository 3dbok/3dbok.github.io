// Coordenadas (lat, lng) de las ciudades de los makers, para situarlos en el
// mapa de España de la portada. La clave es el texto EXACTO de `ubicacion` en
// productores.json SIN el sufijo ", España".
//
// Al dar de alta un maker en una ciudad nueva, añade aquí su ciudad. Si falta,
// ese maker no aparece en el mapa (pero sí en el directorio); el build avisa
// por consola de las ciudades que no estén aquí.

export const CIUDADES = {
  "Málaga": [36.7213, -4.4214],
  "Amposta": [40.7093, 0.581],
  "Salceda de Caselas": [42.09, -8.56],
  "Valladolid": [41.6523, -4.7245],
  "Polinyà del Xúquer": [39.1872, -0.3817],
  "Barcelona": [41.3874, 2.1686],
  "Valencia": [39.4699, -0.3763],
  "Barcenilla de Piélagos": [43.3889, -3.96],
  "Mataró": [41.5388, 2.4449],
  "Fuenlabrada": [40.2842, -3.7944],
  "Ávila": [40.6566, -4.6818],
  "Torre Pacheco": [37.7407, -0.9517],
  "Algete": [40.5969, -3.499],
  "Torrelavega": [43.35, -4.05],
  "León": [42.5987, -5.5671],
  "Asturias": [43.3619, -5.8494],
  "Bullas": [38.0442, -1.67],
};

// Devuelve [lat, lng] a partir de `ubicacion` ("Ciudad, España") o null.
export function coordenadasDe(ubicacion) {
  const ciudad = String(ubicacion).replace(/,\s*España\s*$/i, "").trim();
  return CIUDADES[ciudad] ?? null;
}
