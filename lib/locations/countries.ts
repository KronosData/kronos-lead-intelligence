// Canonical country catalog with ISO codes and major commercial cities.
// Used for geocoding validation, city autocomplete, and adapter country mapping.

export interface CountryConfig {
  value: string    // DB slug: 'peru', 'mexico', etc.
  label: string    // Display label
  iso2: string     // ISO 3166-1 alpha-2 (uppercase)
  iso3: string     // ISO 3166-1 alpha-3 (uppercase)
  dialCode: string
  cities: string[] // Major commercial cities for autocomplete
}

export const COUNTRY_CONFIGS: CountryConfig[] = [
  {
    value: 'peru', label: 'Perú', iso2: 'PE', iso3: 'PER', dialCode: '+51',
    cities: [
      'Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Piura', 'Cusco',
      'Ica', 'Huancayo', 'Tacna', 'Chimbote', 'Iquitos', 'Puno',
      'Ayacucho', 'Cajamarca', 'Pucallpa', 'Huaraz', 'Sullana', 'Juliaca',
    ],
  },
  {
    value: 'mexico', label: 'México', iso2: 'MX', iso3: 'MEX', dialCode: '+52',
    cities: [
      'Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Querétaro',
      'Mérida', 'Tijuana', 'León', 'Toluca', 'Cancún',
      'San Luis Potosí', 'Aguascalientes', 'Hermosillo', 'Chihuahua', 'Veracruz',
      'Culiacán', 'Acapulco', 'Morelia', 'Saltillo', 'Oaxaca',
    ],
  },
  {
    value: 'colombia', label: 'Colombia', iso2: 'CO', iso3: 'COL', dialCode: '+57',
    cities: [
      'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena',
      'Bucaramanga', 'Pereira', 'Manizales', 'Cúcuta', 'Santa Marta',
      'Ibagué', 'Pasto', 'Villavicencio', 'Armenia', 'Montería',
    ],
  },
  {
    value: 'chile', label: 'Chile', iso2: 'CL', iso3: 'CHL', dialCode: '+56',
    cities: [
      'Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Antofagasta',
      'Temuco', 'Rancagua', 'Talca', 'Arica', 'Iquique',
      'Puerto Montt', 'Chillán', 'Calama',
    ],
  },
  {
    value: 'argentina', label: 'Argentina', iso2: 'AR', iso3: 'ARG', dialCode: '+54',
    cities: [
      'Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'Tucumán',
      'La Plata', 'Mar del Plata', 'Salta', 'Santa Fe', 'San Juan',
      'Resistencia', 'Neuquén', 'Corrientes', 'Bahía Blanca', 'San Miguel de Tucumán',
    ],
  },
  {
    value: 'ecuador', label: 'Ecuador', iso2: 'EC', iso3: 'ECU', dialCode: '+593',
    cities: [
      'Quito', 'Guayaquil', 'Cuenca', 'Ambato', 'Manta',
      'Portoviejo', 'Loja', 'Esmeraldas', 'Machala', 'Riobamba',
    ],
  },
  {
    value: 'bolivia', label: 'Bolivia', iso2: 'BO', iso3: 'BOL', dialCode: '+591',
    cities: [
      'La Paz', 'Santa Cruz de la Sierra', 'Cochabamba', 'Sucre',
      'Oruro', 'Potosí', 'Tarija', 'Trinidad', 'El Alto',
    ],
  },
  {
    value: 'uruguay', label: 'Uruguay', iso2: 'UY', iso3: 'URY', dialCode: '+598',
    cities: ['Montevideo', 'Salto', 'Paysandú', 'Las Piedras', 'Rivera', 'Maldonado'],
  },
  {
    value: 'paraguay', label: 'Paraguay', iso2: 'PY', iso3: 'PRY', dialCode: '+595',
    cities: ['Asunción', 'Ciudad del Este', 'San Lorenzo', 'Luque', 'Capiatá', 'Lambaré'],
  },
  {
    value: 'venezuela', label: 'Venezuela', iso2: 'VE', iso3: 'VEN', dialCode: '+58',
    cities: [
      'Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay',
      'Ciudad Guayana', 'Barcelona', 'Maturín', 'Petare', 'Mérida',
    ],
  },
  {
    value: 'costa_rica', label: 'Costa Rica', iso2: 'CR', iso3: 'CRI', dialCode: '+506',
    cities: ['San José', 'Alajuela', 'Desamparados', 'San Carlos', 'Cartago', 'Heredia'],
  },
  {
    value: 'panama', label: 'Panamá', iso2: 'PA', iso3: 'PAN', dialCode: '+507',
    cities: ['Ciudad de Panamá', 'San Miguelito', 'Colón', 'David', 'La Chorrera', 'Santiago'],
  },
  {
    value: 'guatemala', label: 'Guatemala', iso2: 'GT', iso3: 'GTM', dialCode: '+502',
    cities: ['Ciudad de Guatemala', 'Mixco', 'Villa Nueva', 'Quetzaltenango', 'Escuintla', 'Cobán'],
  },
  {
    value: 'honduras', label: 'Honduras', iso2: 'HN', iso3: 'HND', dialCode: '+504',
    cities: ['Tegucigalpa', 'San Pedro Sula', 'La Ceiba', 'Choloma', 'El Progreso'],
  },
  {
    value: 'el_salvador', label: 'El Salvador', iso2: 'SV', iso3: 'SLV', dialCode: '+503',
    cities: ['San Salvador', 'Santa Ana', 'San Miguel', 'Mejicanos', 'Soyapango'],
  },
  {
    value: 'nicaragua', label: 'Nicaragua', iso2: 'NI', iso3: 'NIC', dialCode: '+505',
    cities: ['Managua', 'León', 'Masaya', 'Matagalpa', 'Chinandega'],
  },
  {
    value: 'dominican_republic', label: 'República Dominicana', iso2: 'DO', iso3: 'DOM', dialCode: '+1',
    cities: ['Santo Domingo', 'Santiago de los Caballeros', 'San Pedro de Macorís', 'La Romana', 'Puerto Plata'],
  },
  {
    value: 'puerto_rico', label: 'Puerto Rico', iso2: 'PR', iso3: 'PRI', dialCode: '+1',
    cities: ['San Juan', 'Bayamón', 'Carolina', 'Ponce', 'Caguas', 'Guaynabo'],
  },
  {
    value: 'spain', label: 'España', iso2: 'ES', iso3: 'ESP', dialCode: '+34',
    cities: [
      'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza',
      'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao',
      'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón',
    ],
  },
]

export function getCountryConfig(value: string): CountryConfig | undefined {
  return COUNTRY_CONFIGS.find(c => c.value === value)
}

export function getCountryByIso2(iso2: string): CountryConfig | undefined {
  return COUNTRY_CONFIGS.find(c => c.iso2 === iso2.toUpperCase())
}

// All valid country slugs (for runtime validation without importing Zod enums)
export const VALID_COUNTRY_SLUGS = COUNTRY_CONFIGS.map(c => c.value)

// ISO3 → country slug (used by HERE adapter)
export const ISO3_TO_SLUG: Record<string, string> = Object.fromEntries(
  COUNTRY_CONFIGS.map(c => [c.iso3, c.value])
)

// ISO2 lowercase → country slug (used by OSM adapter)
export const ISO2_TO_SLUG: Record<string, string> = Object.fromEntries(
  COUNTRY_CONFIGS.map(c => [c.iso2.toLowerCase(), c.value])
)
