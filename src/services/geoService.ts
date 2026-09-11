import { PROVINCES_ANGOLA, MUNICIPALITIES_LUANDA } from './mockData';

export interface GeocodedAddress {
  provincia: string;
  municipio: string;
  bairro: string;
  rua?: string;
  displayName?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  source: 'osm_nominatim' | 'angola_gis_offline' | 'saved_profile';
  timestamp: string;
}

export const USER_LOCATION_STORAGE_KEY = 'mutikukwama_user_location_v1';

// Haversine formula to compute distance in kilometers between two points
export function getDistanceBetweenCoords(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Offline Angola Geographic Knowledge Base for Municipalities & Neighborhoods (Bairros)
interface MunicipalityZone {
  municipio: string;
  provincia: string;
  centerLat: number;
  centerLng: number;
  bairros: Array<{
    nome: string;
    lat: number;
    lng: number;
    ruaExemplo?: string;
  }>;
}

const ANGOLA_MUNICIPALITY_ZONES: MunicipalityZone[] = [
  {
    municipio: 'Viana',
    provincia: 'Luanda',
    centerLat: -8.902,
    centerLng: 13.368,
    bairros: [
      { nome: 'Viana Centro', lat: -8.902, lng: 13.368, ruaExemplo: 'Rua Hoji Ya Henda' },
      { nome: 'Vila de Viana', lat: -8.898, lng: 13.372, ruaExemplo: 'Estrada de Catete' },
      { nome: 'Zango 1', lat: -8.978, lng: 13.435, ruaExemplo: 'Avenida Principal do Zango' },
      { nome: 'Zango 2', lat: -8.989, lng: 13.450, ruaExemplo: 'Rua 12 do Zango' },
      { nome: 'Zango 3', lat: -8.995, lng: 13.468, ruaExemplo: 'Rua Direita do Zango 3' },
      { nome: 'Zango 4', lat: -9.012, lng: 13.489, ruaExemplo: 'Avenida Central Zango 4' },
      { nome: 'Capalanga', lat: -8.882, lng: 13.402, ruaExemplo: 'Rua Direita de Capalanga' },
      { nome: 'Estalagem', lat: -8.885, lng: 13.345, ruaExemplo: 'Estrada da Estalagem' },
      { nome: 'Grafanil', lat: -8.868, lng: 13.325, ruaExemplo: 'Rua da Moagem' },
      { nome: 'Baía', lat: -8.915, lng: 13.420, ruaExemplo: 'Estrada de Catete Km 28' },
    ],
  },
  {
    municipio: 'Maianga',
    provincia: 'Luanda',
    centerLat: -8.835,
    centerLng: 13.235,
    bairros: [
      { nome: 'Alvalade', lat: -8.836, lng: 13.237, ruaExemplo: 'Rua Comandante Gika' },
      { nome: 'Maianga Centro', lat: -8.832, lng: 13.228, ruaExemplo: 'Rua Amílcar Cabral' },
      { nome: 'Cassenda', lat: -8.848, lng: 13.225, ruaExemplo: 'Avenida 21 de Janeiro' },
      { nome: 'Prenda', lat: -8.840, lng: 13.220, ruaExemplo: 'Rua do Prenda' },
      { nome: 'Rocha Pinto', lat: -8.855, lng: 13.229, ruaExemplo: 'Estrada do Aeroporto' },
      { nome: 'Mártires do Kifangondo', lat: -8.838, lng: 13.242, ruaExemplo: 'Rua dos Militares' },
      { nome: 'Gamek', lat: -8.859, lng: 13.238, ruaExemplo: 'Rua Direita do Gamek' },
    ],
  },
  {
    municipio: 'Ingombota',
    provincia: 'Luanda',
    centerLat: -8.812,
    centerLng: 13.232,
    bairros: [
      { nome: 'Mutamba', lat: -8.814, lng: 13.233, ruaExemplo: 'Largo da Mutamba' },
      { nome: 'Maculusso', lat: -8.822, lng: 13.238, ruaExemplo: 'Rua Frederico Welwitsch' },
      { nome: 'Kinaxixi', lat: -8.816, lng: 13.238, ruaExemplo: 'Largo do Kinaxixi' },
      { nome: 'Coqueiros', lat: -8.810, lng: 13.226, ruaExemplo: 'Rua Major Kanhangulo' },
      { nome: 'Ilha de Luanda', lat: -8.785, lng: 13.220, ruaExemplo: 'Avenida Murtala Mohamed' },
      { nome: 'Ingombota Centro', lat: -8.811, lng: 13.230, ruaExemplo: 'Rua Rainha Ginga' },
    ],
  },
  {
    municipio: 'Talatona',
    provincia: 'Luanda',
    centerLat: -8.920,
    centerLng: 13.190,
    bairros: [
      { nome: 'Talatona Centro', lat: -8.920, lng: 13.190, ruaExemplo: 'Avenida Talatona' },
      { nome: 'Patriota', lat: -8.945, lng: 13.185, ruaExemplo: 'Avenida Lar do Patriota' },
      { nome: 'Benfica', lat: -8.960, lng: 13.170, ruaExemplo: 'Rua Direita do Benfica' },
      { nome: 'Camama', lat: -8.925, lng: 13.245, ruaExemplo: 'Via Expressa Camama' },
      { nome: 'Futungo de Belas', lat: -8.910, lng: 13.155, ruaExemplo: 'Estrada da Samba' },
      { nome: 'Morro Bento', lat: -8.892, lng: 13.185, ruaExemplo: 'Estrada da Samba' },
    ],
  },
  {
    municipio: 'Belas',
    provincia: 'Luanda',
    centerLat: -9.005,
    centerLng: 13.210,
    bairros: [
      { nome: 'Centralidade do Kilamba', lat: -9.005, lng: 13.210, ruaExemplo: 'Bloco A, Avenida Imperial Santana' },
      { nome: 'Quenguela', lat: -9.040, lng: 13.230, ruaExemplo: 'Estrada do Quenguela' },
      { nome: 'Barra do Cuanza', lat: -9.310, lng: 13.160, ruaExemplo: 'Foz do Rio Cuanza' },
      { nome: 'Ramiros', lat: -9.080, lng: 13.140, ruaExemplo: 'Estrada dos Ramiros' },
      { nome: 'Cabuco', lat: -9.030, lng: 13.190, ruaExemplo: 'Rua do Cabuco' },
    ],
  },
  {
    municipio: 'Kilamba Kiaxi',
    provincia: 'Luanda',
    centerLat: -8.880,
    centerLng: 13.260,
    bairros: [
      { nome: 'Nova Vida', lat: -8.878, lng: 13.245, ruaExemplo: 'Avenida Pedro de Castro Van-Dúnem Loy' },
      { nome: 'Golfe 1', lat: -8.885, lng: 13.265, ruaExemplo: 'Rua do Golfe' },
      { nome: 'Golfe 2', lat: -8.895, lng: 13.275, ruaExemplo: 'Estrada do Calemba 2' },
      { nome: 'Palanca', lat: -8.868, lng: 13.255, ruaExemplo: 'Rua da Unidade Operativa' },
      { nome: 'Calemba 2', lat: -8.905, lng: 13.285, ruaExemplo: 'Via Expressa Calemba' },
    ],
  },
  {
    municipio: 'Cazenga',
    provincia: 'Luanda',
    centerLat: -8.825,
    centerLng: 13.295,
    bairros: [
      { nome: 'Hoji Ya Henda', lat: -8.820, lng: 13.280, ruaExemplo: 'Avenida Deolinda Rodrigues' },
      { nome: 'Tala Hady', lat: -8.830, lng: 13.298, ruaExemplo: 'Rua dos Comandos' },
      { nome: 'Cazenga Popular', lat: -8.825, lng: 13.310, ruaExemplo: 'Rua do Kalawenda' },
      { nome: 'Kalawenda', lat: -8.835, lng: 13.325, ruaExemplo: 'Estrada do Calawenda' },
      { nome: '11 de Novembro', lat: -8.815, lng: 13.290, ruaExemplo: 'Rua Direita da Cuca' },
    ],
  },
  {
    municipio: 'Cacuaco',
    provincia: 'Luanda',
    centerLat: -8.760,
    centerLng: 13.380,
    bairros: [
      { nome: 'Vila de Cacuaco', lat: -8.760, lng: 13.380, ruaExemplo: 'Estrada Principal de Cacuaco' },
      { nome: 'Centralidade do Sequele', lat: -8.745, lng: 13.435, ruaExemplo: 'Avenida dos Pioneiros do Sequele' },
      { nome: 'Kifangondo', lat: -8.730, lng: 13.460, ruaExemplo: 'Estrada Nacional 100' },
      { nome: 'Fundão', lat: -8.790, lng: 13.440, ruaExemplo: 'Estrada do Fundão' },
      { nome: 'Belo Monte', lat: -8.775, lng: 13.395, ruaExemplo: 'Rua de Belo Monte' },
    ],
  },
  {
    municipio: 'Rangel',
    provincia: 'Luanda',
    centerLat: -8.825,
    centerLng: 13.260,
    bairros: [
      { nome: 'Terra Nova', lat: -8.828, lng: 13.265, ruaExemplo: 'Rua da Terra Nova' },
      { nome: 'Marçal', lat: -8.820, lng: 13.255, ruaExemplo: 'Largo do Marçal' },
      { nome: 'Rangel Centro', lat: -8.824, lng: 13.260, ruaExemplo: 'Avenida Brasil' },
      { nome: 'Nelito Soares', lat: -8.830, lng: 13.250, ruaExemplo: 'Rua D. Manuel I' },
    ],
  },
  {
    municipio: 'Samba',
    provincia: 'Luanda',
    centerLat: -8.855,
    centerLng: 13.210,
    bairros: [
      { nome: 'Samba Centro', lat: -8.855, lng: 13.210, ruaExemplo: 'Avenida 4 de Fevereiro' },
      { nome: 'Corimba', lat: -8.875, lng: 13.195, ruaExemplo: 'Estrada da Corimba' },
      { nome: 'Morro da Luz', lat: -8.845, lng: 13.215, ruaExemplo: 'Rua do Farol' },
    ],
  },
  // Other Angolan Provinces & Municipalities
  {
    municipio: 'Benguela',
    provincia: 'Benguela',
    centerLat: -12.580,
    centerLng: 13.400,
    bairros: [
      { nome: 'Praia Morena', lat: -12.580, lng: 13.395, ruaExemplo: 'Avenida 10 de Fevereiro' },
      { nome: 'Benguela Centro', lat: -12.578, lng: 13.405, ruaExemplo: 'Rua 31 de Janeiro' },
      { nome: 'Bairro da Graça', lat: -12.595, lng: 13.415, ruaExemplo: 'Rua da Graça' },
    ],
  },
  {
    municipio: 'Lobito',
    provincia: 'Benguela',
    centerLat: -12.350,
    centerLng: 13.540,
    bairros: [
      { nome: 'Restinga', lat: -12.330, lng: 13.535, ruaExemplo: 'Avenida da Restinga' },
      { nome: 'Caponte', lat: -12.360, lng: 13.550, ruaExemplo: 'Rua Direita do Caponte' },
      { nome: 'Compão', lat: -12.345, lng: 13.560, ruaExemplo: 'Estrada do Compão' },
    ],
  },
  {
    municipio: 'Huambo',
    provincia: 'Huambo',
    centerLat: -12.775,
    centerLng: 15.735,
    bairros: [
      { nome: 'Cidade Alta', lat: -12.775, lng: 15.735, ruaExemplo: 'Avenida Norton de Matos' },
      { nome: 'São Pedro', lat: -12.790, lng: 15.720, ruaExemplo: 'Rua de São Pedro' },
      { nome: 'Capango', lat: -12.760, lng: 15.750, ruaExemplo: 'Rua do Capango' },
    ],
  },
  {
    municipio: 'Lubango',
    provincia: 'Huíla',
    centerLat: -14.920,
    centerLng: 13.495,
    bairros: [
      { nome: 'Lubango Centro', lat: -14.920, lng: 13.495, ruaExemplo: 'Avenida 27 de Março' },
      { nome: 'Senhora do Monte', lat: -14.935, lng: 13.480, ruaExemplo: 'Parque da N. Sra. do Monte' },
      { nome: 'Mapunda', lat: -14.905, lng: 13.510, ruaExemplo: 'Rua da Mapunda' },
    ],
  },
  {
    municipio: 'Cabinda',
    provincia: 'Cabinda',
    centerLat: -5.560,
    centerLng: 12.190,
    bairros: [
      { nome: 'Cabinda Centro', lat: -5.560, lng: 12.190, ruaExemplo: 'Avenida Duque de Chiazi' },
      { nome: 'Simindele', lat: -5.545, lng: 12.205, ruaExemplo: 'Rua de Simindele' },
      { nome: 'Chicamba', lat: -5.575, lng: 12.180, ruaExemplo: 'Estrada de Chicamba' },
    ],
  },
];

// Offline fallback matcher based on minimum distance to Angola zones
export function resolveAngolaOfflineGIS(lat: number, lng: number): GeocodedAddress {
  let closestZone = ANGOLA_MUNICIPALITY_ZONES[0];
  let closestDistance = Infinity;

  // Find closest municipality zone
  for (const zone of ANGOLA_MUNICIPALITY_ZONES) {
    const dist = getDistanceBetweenCoords(lat, lng, zone.centerLat, zone.centerLng);
    if (dist < closestDistance) {
      closestDistance = dist;
      closestZone = zone;
    }
  }

  // Find closest specific bairro inside that zone
  let closestBairro = closestZone.bairros[0];
  let closestBairroDist = Infinity;

  for (const b of closestZone.bairros) {
    const bDist = getDistanceBetweenCoords(lat, lng, b.lat, b.lng);
    if (bDist < closestBairroDist) {
      closestBairroDist = bDist;
      closestBairro = b;
    }
  }

  return {
    provincia: closestZone.provincia,
    municipio: closestZone.municipio,
    bairro: closestBairro.nome,
    rua: closestBairro.ruaExemplo || `Avenida Principal de ${closestZone.municipio}`,
    displayName: `${closestBairro.nome}, ${closestZone.municipio}, ${closestZone.provincia}, Angola`,
    latitude: lat,
    longitude: lng,
    source: 'angola_gis_offline',
    timestamp: new Date().toISOString(),
  };
}

// Clean and normalize municipality name
function cleanMunicipality(raw: string): string {
  if (!raw) return 'Maianga';
  let cleaned = raw
    .replace(/^Município de\s+/i, '')
    .replace(/^Distrito Urbano d[eao]\s+/i, '')
    .replace(/^Distrito d[eao]\s+/i, '')
    .replace(/^Comuna d[eao]\s+/i, '')
    .trim();

  // Match against known Luanda municipalities
  const found = MUNICIPALITIES_LUANDA.find(
    (m) => m.toLowerCase() === cleaned.toLowerCase() || cleaned.toLowerCase().includes(m.toLowerCase())
  );
  if (found) return found;

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// Clean and match province with official PROVINCES_ANGOLA
function cleanProvince(rawState: string, rawCountry?: string): string {
  if (!rawState) return 'Luanda';
  const clean = rawState
    .replace(/^Província de\s+/i, '')
    .replace(/^Província do\s+/i, '')
    .replace(/^Province of\s+/i, '')
    .trim();

  // Explicit mappings for new 21 provinces and alternate spellings
  if (/ícolo|icolo/i.test(clean)) return 'Icolo Bengo';
  if (/moxico leste|moxico oriental/i.test(clean)) return 'Moxico Leste';
  if (/kuando/i.test(clean) && !/cubango/i.test(clean)) return 'Kuando';

  const found = PROVINCES_ANGOLA.find(
    (p) => p.toLowerCase() === clean.toLowerCase() || clean.toLowerCase().includes(p.toLowerCase())
  );
  if (found) return found;

  // If Kwanza Sul/Norte alternate spelling
  if (/kwanza sul/i.test(clean)) return 'Cuanza Sul';
  if (/kwanza norte/i.test(clean)) return 'Cuanza Norte';

  return 'Luanda';
}

// Clean and extract bairro
function cleanBairro(
  address: any,
  fallbackZone: MunicipalityZone,
  lat?: number,
  lng?: number
): string {
  const candidates = [
    address.neighbourhood,
    address.quarter,
    address.residential,
    address.suburb,
    address.hamlet,
    address.village,
    address.city_district,
    address.district,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'string') continue;
    const rawClean = candidate
      .replace(/^Bairro\s+/i, '')
      .replace(/^Distrito Urbano d[eao]\s+/i, '')
      .replace(/^Distrito d[eao]\s+/i, '')
      .replace(/^Município d[eao]\s+/i, '')
      .replace(/^Municipio d[eao]\s+/i, '')
      .replace(/^Comuna d[eao]\s+/i, '')
      .trim();

    // Rejection rules: cannot be municipality name, cannot start with Município, cannot be province or country
    const isMunName = rawClean.toLowerCase() === fallbackZone.municipio.toLowerCase();
    const isProvName = rawClean.toLowerCase() === fallbackZone.provincia.toLowerCase();
    const isGenericOrInvalid =
      /^(centro|angola|luanda|munic[ií]pio.*|distrito.*|comuna.*|prov[ií]ncia.*)$/i.test(rawClean);

    if (rawClean && rawClean.length >= 2 && !isMunName && !isProvName && !isGenericOrInvalid) {
      return rawClean;
    }
  }

  // Fallback to offline closest real bairro inside this municipality zone
  if (lat !== undefined && lng !== undefined && fallbackZone.bairros.length > 0) {
    let closest = fallbackZone.bairros[0];
    let closestDist = Infinity;
    for (const b of fallbackZone.bairros) {
      const d = getDistanceBetweenCoords(lat, lng, b.lat, b.lng);
      if (d < closestDist) {
        closestDist = d;
        closest = b;
      }
    }
    return closest.nome;
  }

  return fallbackZone.bairros[0]?.nome || 'Centro';
}

// Main Reverse Geocoding Function with OSM Nominatim + Angola GIS Hybrid Engine
export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number,
  accuracy?: number
): Promise<GeocodedAddress> {
  const fallback = resolveAngolaOfflineGIS(latitude, longitude);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'pt-AO, pt;q=0.9, en;q=0.5',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn('Nominatim reverse geocode returned status:', res.status);
      return { ...fallback, accuracy };
    }

    const data = await res.json();
    if (!data || !data.address) {
      return { ...fallback, accuracy };
    }

    const addr = data.address;

    // Detect province
    const rawProv = addr.state || addr.province || addr.region || fallback.provincia;
    const provincia = cleanProvince(rawProv, addr.country);

    // Detect municipality
    const rawMun =
      addr.county ||
      addr.municipality ||
      addr.city_district ||
      addr.city ||
      addr.town ||
      addr.village ||
      fallback.municipio;
    const municipio = cleanMunicipality(rawMun);

    // Find zone for fallback bairro
    const matchedZone = ANGOLA_MUNICIPALITY_ZONES.find(
      (z) => z.municipio.toLowerCase() === municipio.toLowerCase()
    );

    // Detect bairro
    const rawBairro = matchedZone
      ? cleanBairro(addr, matchedZone, latitude, longitude)
      : cleanBairro(addr, fallback as any, latitude, longitude);
    const fallbackBairro = matchedZone?.bairros?.[0]?.nome || fallback.bairro || 'Centro';
    let bairro = rawBairro || fallbackBairro;

    // Strict validation: bairro cannot be or contain "Município" or equal the municipality name
    if (!bairro || /munic[ií]pio/i.test(bairro) || bairro.toLowerCase() === municipio.toLowerCase()) {
      bairro = fallback.bairro || matchedZone?.bairros?.[0]?.nome || 'Centro';
    }

    // Detect road / rua
    const rua =
      addr.road ||
      addr.street ||
      addr.pedestrian ||
      addr.amenity ||
      addr.building ||
      fallback.rua ||
      '';

    return {
      provincia,
      municipio,
      bairro,
      rua,
      displayName: data.display_name || `${bairro}, ${municipio}, ${provincia}`,
      latitude,
      longitude,
      accuracy,
      source: 'osm_nominatim',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.info('Using Angola Offline GIS for GPS reverse geocode fallback:', error);
    return { ...fallback, accuracy };
  }
}

// Save location in localStorage and broadcast update event to entire application
export function saveUserGpsLocation(location: GeocodedAddress): void {
  try {
    localStorage.setItem(USER_LOCATION_STORAGE_KEY, JSON.stringify(location));
    window.dispatchEvent(
      new CustomEvent('mutikukwama:location-updated', {
        detail: location,
      })
    );
  } catch (err) {
    console.error('Failed to save user GPS location in localStorage:', err);
  }
}

// Retrieve saved user GPS location
export function getSavedUserGpsLocation(): GeocodedAddress | null {
  try {
    const raw = localStorage.getItem(USER_LOCATION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse user GPS location from localStorage:', err);
    return null;
  }
}

// Clear saved user GPS location
export function clearSavedUserGpsLocation(): void {
  try {
    localStorage.removeItem(USER_LOCATION_STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent('mutikukwama:location-cleared')
    );
  } catch (err) {
    console.error('Failed to clear user GPS location:', err);
  }
}

export interface PreciseLocationResult {
  success: boolean;
  location?: GeocodedAddress;
  error?: string;
  sourceType: 'device_high_accuracy' | 'device_network' | 'ip_lookup' | 'offline_manual';
}

// Preset precise reference points across Angolan Bairros & Municipalities
export const ANGOLA_COMMON_LOCATIONS = [
  // Viana
  { nome: 'Viana - Vila Sede (Centro)', municipio: 'Viana', provincia: 'Luanda', lat: -8.9038, lng: 13.3732, ref: 'Estrada de Catete' },
  { nome: 'Viana - Zango 1', municipio: 'Viana', provincia: 'Luanda', lat: -8.9780, lng: 13.4350, ref: 'Av. Principal do Zango 1' },
  { nome: 'Viana - Zango 2', municipio: 'Viana', provincia: 'Luanda', lat: -8.9890, lng: 13.4500, ref: 'Rua 12 do Zango 2' },
  { nome: 'Viana - Zango 3', municipio: 'Viana', provincia: 'Luanda', lat: -8.9950, lng: 13.4680, ref: 'Rua Direita do Zango 3' },
  { nome: 'Viana - Zango 4', municipio: 'Viana', provincia: 'Luanda', lat: -9.0120, lng: 13.4890, ref: 'Av. Central do Zango 4' },
  { nome: 'Viana - Estalagem', municipio: 'Viana', provincia: 'Luanda', lat: -8.8850, lng: 13.3450, ref: 'Estrada da Estalagem' },
  { nome: 'Viana - Capalanga', municipio: 'Viana', provincia: 'Luanda', lat: -8.8820, lng: 13.4020, ref: 'Capalanga' },
  { nome: 'Viana - Grafanil', municipio: 'Viana', provincia: 'Luanda', lat: -8.8680, lng: 13.3250, ref: 'Rua da Moagem' },
  { nome: 'Viana - Baía', municipio: 'Viana', provincia: 'Luanda', lat: -8.9150, lng: 13.4200, ref: 'Km 28 Estrada de Catete' },
  // Kilamba Kiaxi & Calemba 2
  { nome: 'Calemba 2 (Via Expressa)', municipio: 'Kilamba Kiaxi', provincia: 'Luanda', lat: -8.9050, lng: 13.2850, ref: 'Via Expressa / Estrada do Calemba 2' },
  { nome: 'Calemba 2 (Rotunda)', municipio: 'Kilamba Kiaxi', provincia: 'Luanda', lat: -8.9080, lng: 13.2880, ref: 'Rotunda do Calemba 2 / Eixo Loy' },
  { nome: 'Calemba 2 - Estalagem (Fronteira Viana)', municipio: 'Viana', provincia: 'Luanda', lat: -8.9100, lng: 13.2950, ref: 'Ligação Calemba 2 à Estalagem' },
  { nome: 'Kilamba Kiaxi - Palanca', municipio: 'Kilamba Kiaxi', provincia: 'Luanda', lat: -8.8680, lng: 13.2550, ref: 'Unidade Operativa / Palanca' },
  { nome: 'Kilamba Kiaxi - Nova Vida', municipio: 'Kilamba Kiaxi', provincia: 'Luanda', lat: -8.8780, lng: 13.2450, ref: 'Urbanização Nova Vida' },
  { nome: 'Kilamba Kiaxi - Golfe 1', municipio: 'Kilamba Kiaxi', provincia: 'Luanda', lat: -8.8850, lng: 13.2650, ref: 'Rua do Golfe' },
  { nome: 'Kilamba Kiaxi - Golfe 2', municipio: 'Kilamba Kiaxi', provincia: 'Luanda', lat: -8.8950, lng: 13.2750, ref: 'Estrada do Calemba 2' },
  // Cacuaco
  { nome: 'Cacuaco - Vila Sede', municipio: 'Cacuaco', provincia: 'Luanda', lat: -8.7600, lng: 13.3800, ref: 'Estrada Principal de Cacuaco' },
  { nome: 'Cacuaco - Centralidade do Sequele', municipio: 'Cacuaco', provincia: 'Luanda', lat: -8.7450, lng: 13.4350, ref: 'Av. dos Pioneiros do Sequele' },
  { nome: 'Cacuaco - Kifangondo', municipio: 'Cacuaco', provincia: 'Luanda', lat: -8.7300, lng: 13.4600, ref: 'Estrada Nacional 100' },
  // Talatona
  { nome: 'Talatona - Belas Shopping / Centro', municipio: 'Talatona', provincia: 'Luanda', lat: -8.9192, lng: 13.1895, ref: 'Via AL15 / Centro Financeiro' },
  { nome: 'Talatona - Lar do Patriota', municipio: 'Talatona', provincia: 'Luanda', lat: -8.9450, lng: 13.1850, ref: 'Avenida Lar do Patriota' },
  { nome: 'Talatona - Benfica', municipio: 'Talatona', provincia: 'Luanda', lat: -8.9600, lng: 13.1700, ref: 'Rua Direita do Benfica' },
  { nome: 'Talatona - Camama', municipio: 'Talatona', provincia: 'Luanda', lat: -8.9250, lng: 13.2450, ref: 'Via Expressa Camama' },
  // Belas
  { nome: 'Belas - Centralidade do Kilamba', municipio: 'Belas', provincia: 'Luanda', lat: -9.0050, lng: 13.2100, ref: 'Bloco A, Av. Imperial Santana' },
  // Cazenga
  { nome: 'Cazenga - Hoji Ya Henda', municipio: 'Cazenga', provincia: 'Luanda', lat: -8.8200, lng: 13.2800, ref: 'Av. Deolinda Rodrigues' },
  { nome: 'Cazenga - Tala Hady', municipio: 'Cazenga', provincia: 'Luanda', lat: -8.8300, lng: 13.2980, ref: 'Rua dos Comandos' },
  // Maianga
  { nome: 'Maianga - Alvalade', municipio: 'Maianga', provincia: 'Luanda', lat: -8.8354, lng: 13.2389, ref: 'Rua Comandante Gika' },
  { nome: 'Maianga - Cassenda / Prenda', municipio: 'Maianga', provincia: 'Luanda', lat: -8.8400, lng: 13.2200, ref: 'Av. 21 de Janeiro' },
  // Ingombota
  { nome: 'Ingombota - Mutamba / Baixa', municipio: 'Ingombota', provincia: 'Luanda', lat: -8.8147, lng: 13.2302, ref: 'Av. 4 de Fevereiro / Marginal' },
  { nome: 'Ingombota - Kinaxixi / Maculusso', municipio: 'Ingombota', provincia: 'Luanda', lat: -8.8160, lng: 13.2380, ref: 'Largo do Kinaxixi' },
  // Benguela, Huambo, Lubango
  { nome: 'Benguela - Centro Urbano', municipio: 'Benguela', provincia: 'Benguela', lat: -12.5800, lng: 13.4000, ref: 'Avenida 10 de Fevereiro' },
  { nome: 'Huambo - Cidade Alta', municipio: 'Huambo', provincia: 'Huambo', lat: -12.7750, lng: 15.7350, ref: 'Av. Norton de Matos' },
  { nome: 'Lubango - Centro', municipio: 'Lubango', provincia: 'Huíla', lat: -14.9200, lng: 13.4950, ref: 'Largo Agostinho Neto' },
  // Novas Províncias: Icolo Bengo, Kuando, Moxico Leste
  { nome: 'Icolo Bengo - Catete (Centro)', municipio: 'Icolo e Bengo', provincia: 'Icolo Bengo', lat: -9.1300, lng: 13.6800, ref: 'Estrada Nacional 230 / Catete' },
  { nome: 'Kuando - Mavinga (Centro)', municipio: 'Mavinga', provincia: 'Kuando', lat: -15.7900, lng: 20.3600, ref: 'Avenida da Paz' },
  { nome: 'Moxico Leste - Luau (Estação CFB)', municipio: 'Luau', provincia: 'Moxico Leste', lat: -10.7070, lng: 22.2240, ref: 'Rua do Caminho de Ferro / Fronteira' },
];

/**
 * Robust, multi-tier user location acquisition:
 * 1. High-accuracy GPS (Hardware GPS satellite fix)
 * 2. Standard-accuracy fallback (Cellular tower & Wi-Fi triangulation)
 * 3. IP-based location fallback (Network ISP resolution)
 */
export async function acquirePreciseUserLocation(): Promise<PreciseLocationResult> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return tryIpGeolocation('Navegador sem suporte a GPS nativo');
  }

  const getPos = (options: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  };

  // Attempt 1: High accuracy GPS
  try {
    const pos = await getPos({
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 10000,
    });

    const lat = parseFloat(pos.coords.latitude.toFixed(6));
    const lng = parseFloat(pos.coords.longitude.toFixed(6));
    const accuracy = Math.round(pos.coords.accuracy);

    const geo = await reverseGeocodeCoordinates(lat, lng, accuracy);
    saveUserGpsLocation(geo);

    return {
      success: true,
      location: geo,
      sourceType: 'device_high_accuracy',
    };
  } catch (err: any) {
    console.warn('High-accuracy GPS fix failed or timed out. Retrying with network triangulation:', err);

    // Attempt 2: Standard accuracy (faster, works reliably indoors and on Wi-Fi)
    try {
      const pos = await getPos({
        enableHighAccuracy: false,
        timeout: 7000,
        maximumAge: 120000,
      });

      const lat = parseFloat(pos.coords.latitude.toFixed(6));
      const lng = parseFloat(pos.coords.longitude.toFixed(6));
      const accuracy = Math.round(pos.coords.accuracy);

      const geo = await reverseGeocodeCoordinates(lat, lng, accuracy);
      saveUserGpsLocation(geo);

      return {
        success: true,
        location: geo,
        sourceType: 'device_network',
      };
    } catch (err2: any) {
      console.warn('Network geolocation unavailable, attempting IP fallback:', err2);
      return tryIpGeolocation(err2?.message || 'Permissão de GPS indisponível no dispositivo');
    }
  }
}

async function tryIpGeolocation(errorMessage?: string): Promise<PreciseLocationResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        const geo = await reverseGeocodeCoordinates(data.latitude, data.longitude, 5000);
        saveUserGpsLocation(geo);
        return {
          success: true,
          location: geo,
          sourceType: 'ip_lookup',
        };
      }
    }
  } catch (ipErr) {
    console.warn('IP-based geolocation failed:', ipErr);
  }

  return {
    success: false,
    error: errorMessage || 'Não foi possível detectar a localização GPS precisa do dispositivo.',
    sourceType: 'offline_manual',
  };
}

