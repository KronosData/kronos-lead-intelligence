// Classifies a discovered candidate as a commercial entity or non-commercial entity.
// This is the first filter: non-commercial entities are disqualified before scoring.

export type EntityType =
  | 'private_business'          // default viable commercial entity
  | 'public_company'            // large publicly traded company
  | 'government_entity'         // municipalidades, ministerios, gobernación
  | 'public_project'            // public sector projects
  | 'infrastructure_project'    // metro, carreteras, puentes, obras viales
  | 'nonprofit'                 // NGO, fundaciones, entidades sin fines de lucro
  | 'educational_public'        // universidades nacionales, colegios nacionales
  | 'healthcare_public'         // hospitales nacionales, ESSALUD, MINSA
  | 'association'               // gremios, cámaras, sindicatos
  | 'place_landmark'            // parques, plazas, estadios, mercados públicos
  | 'branch_large_chain'        // sucursal de cadena multinacional
  | 'unknown_entity'

// Entity types that can be Kronos commercial prospects
export const COMMERCIAL_ENTITY_TYPES: EntityType[] = ['private_business', 'public_company']

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  private_business:       'Empresa privada',
  public_company:         'Empresa pública/listada',
  government_entity:      'Entidad gubernamental',
  public_project:         'Proyecto público',
  infrastructure_project: 'Proyecto de infraestructura',
  nonprofit:              'Sin fines de lucro',
  educational_public:     'Institución educativa pública',
  healthcare_public:      'Salud pública',
  association:            'Asociación / Gremio',
  place_landmark:         'Lugar / Punto de referencia',
  branch_large_chain:     'Sucursal de cadena grande',
  unknown_entity:         'Entidad desconocida',
}

export interface EntityClassification {
  entityType:                EntityType
  isCommerciallyViable:      boolean
  exclusionReason:           string | null
  exclusionConfidence:       'high' | 'medium' | 'low'
  commercialBuyerIdentifiable: boolean
  directSalesPotential:      boolean
  detectedSignals:           string[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function matches(text: string, patterns: string[]): string | null {
  const t = norm(text)
  for (const p of patterns) {
    const n = norm(p)
    if (t.includes(n)) return p
  }
  return null
}

// ── Pattern libraries ──────────────────────────────────────────────────────────

const INFRASTRUCTURE_PROJECT_PATTERNS = [
  // Construction + infrastructure noun (high confidence)
  'construccion de metro', 'construccion del metro',
  'linea de metro', 'linea del metro',
  'estacion de metro', 'tren metropolitano',
  'linea de tren', 'ferrocarril nacional',
  'construccion de carretera', 'construccion de autopista',
  'construccion de puente', 'construccion de viaducto',
  'construccion de tunel', 'construccion de presa',
  'construccion de hospital', 'construccion de colegio',
  'proyecto de metro', 'proyecto de transporte',
  'proyecto de infraestructura', 'proyecto minero',
  'proyecto de carretera', 'proyecto de autopista',
  'metro de lima', 'metro de bogota', 'metro de santiago',
  'metro de ciudad de mexico', 'metro de medellin',
  'tramo de la linea', 'concesion vial',
  'obra vial', 'obras viales', 'obra civil',
  'licitacion de', 'concesion de',
  'via expresa', 'corredor vial', 'corredor de bus',
  'linea bus rapid', 'terminal terrestre',
  'aeropuerto nacional', 'aeropuerto de',
  'puerto maritimo', 'puerto de ',
]

const INFRASTRUCTURE_NAME_PREFIXES = [
  'construccion de ',
  'proyecto de ',
  'obra de ',
  'linea ',
]

const INFRASTRUCTURE_NAME_KEYWORDS = [
  ' metro ', ' metros ', 'metro 2', 'metro 1', 'metro de',
  ' carretera ', ' autopista ', ' puente ', ' viaducto ',
  ' tren ', ' ferrocarril ', ' presa ', ' represa ',
  ' hidraulica', 'central electrica', 'planta electrica',
  'refineria ', 'gasoducto', 'oleoducto',
]

const GOVERNMENT_PATTERNS = [
  'municipalidad de ', 'municipalidad provincial',
  'municipalidad distrital', 'municipio de ',
  'gobierno regional', 'gobierno local',
  'gobierno de ', 'ministerio de ',
  'alcaldia de ', 'alcaldia municipal',
  'gobernacion de ', 'subprefectura',
  'prefectura de ', 'prefecture de ',
  'embajada de ', 'consulado de ',
  'superintendencia de ', 'sunat',
  'indecopi', 'sunafil', 'osinergmin',
  'poder judicial', 'tribunal ',
  'congreso de ', 'senado de ',
  'fiscalia de ', 'ministerio publico',
  'procuraduria de ', 'defensoria del pueblo',
  'sede de gobierno', 'palacio de gobierno',
  'banco de la nacion', 'banco central de',
  'banco de la republica',
  'instituto nacional ', 'instituto peruano',
  'inei ', 'inpe ', 'minjus ', 'minsa ',
]

const PUBLIC_HEALTHCARE_PATTERNS = [
  'hospital nacional', 'hospital regional', 'hospital base',
  'hospital general de ', 'hospital central',
  'clinica del estado', 'clinica estatal',
  'essalud ', 'es salud',
  'inmp ', 'insn ', 'inei salud',
  'centro de salud ', 'posta medica',
  'hospital del seguro',
  'inen ', 'instituto de enfermedades',
  'seguro social de ',
]

const PUBLIC_EDUCATION_PATTERNS = [
  'universidad nacional', 'universidad publica',
  'instituto nacional de ', 'escuela nacional de ',
  'colegio nacional de ', 'i.e. nacional',
  'institucion educativa nacional',
  'colegio militar', 'escuela militar',
  'academia nacional', 'escuela de policia',
]

const NONPROFIT_PATTERNS = [
  'ong ', ' ong', 'organizacion no gubernamental',
  'asociacion civil sin fines',
  'fundacion sin fines',
  'beneficencia publica',
  'cruz roja', 'caritas ',
  'hogar de ', 'albergue ',
]

const ASSOCIATION_PATTERNS = [
  'camara de comercio',
  'sindicato de ', 'sindicato del ',
  'gremio de ', 'federacion de ',
  'confederacion de ', 'union de ',
  'colegio de abogados', 'colegio medico',
  'colegio de ingenieros', 'colegio de arquitectos',
  'colegio de contadores',
  'asociacion de propietarios',
  'asociacion de vecinos',
  'junta de propietarios',
]

const PLACE_LANDMARK_PATTERNS = [
  'parque de ', 'parque nacional',
  'plaza de ', 'plaza mayor',
  'estadio de ', 'estadio nacional',
  'coliseo de ', 'coliseo nacional',
  'museo de ', 'museo nacional',
  'biblioteca de ', 'biblioteca nacional',
  'mercado central ', 'mercado de abastos',
  'galeria comercial ',
  'cementerio de ', 'camposanto',
  'catedral de ', 'basilica de ',
  'palacio de ', 'centro civico',
]

const LARGE_CHAIN_KEYWORDS = [
  // Multinational fast food
  'mcdonalds', 'burger king', 'kfc ', 'pizza hut', 'dominos', 'subway ', 'starbucks',
  'dunkin', 'popeyes', 'wendys',
  // Banks
  'banco bbva', 'banco bcp', 'banco interbank', 'banco scotiabank', 'banco pichincha',
  'banco de credito', 'citibank', 'hsbc ', 'santander', 'banco continental',
  // Supermarkets
  'plaza vea', 'vivanda ', 'metro supermercado', 'tottus ', 'wong ', 'la colonia',
  'jumbo ', 'cencosud', 'carrefour', 'walmart', 'costco',
  // Large retailers
  'falabella', 'ripley ', 'oechsle', 'paris ', 'sodimac', 'promart',
  'homecenter', 'home depot', 'ikea ',
  // Gas stations / pharma chains
  'inkafarma', 'mifarma', 'boticas peru', 'farmacia universal', 'boticas arcangel',
  'repsol ', 'primax ', 'petroperu',
  // Telecom
  'movistar ', 'claro ', 'entel ', 'bitel ',
  // Other obvious multinationals
  'toyota ', 'honda dealer', 'chevrolet ', 'nissan dealer', 'ford dealer',
]

// ── Classifier ─────────────────────────────────────────────────────────────────

export function classifyEntity(
  name:     string,
  industry: string,
  address?: string,
  website?: string | null,
): EntityClassification {
  const combined = `${name} ${industry} ${address ?? ''}`.toLowerCase()
  const signals: string[] = []

  // ── 1. Infrastructure project (highest priority) ───────────────────────────

  // Check for construction-prefix + infrastructure keyword pattern
  const nameNorm = norm(name)
  const hasConstructionPrefix = INFRASTRUCTURE_NAME_PREFIXES.some(p => nameNorm.startsWith(norm(p)))
  const hasInfraKeyword = INFRASTRUCTURE_NAME_KEYWORDS.some(kw => nameNorm.includes(norm(kw)))

  const infraFullMatch = INFRASTRUCTURE_PROJECT_PATTERNS.find(p => combined.includes(norm(p)))

  if (infraFullMatch) {
    signals.push(`Patrón de infraestructura: "${infraFullMatch}"`)
    return {
      entityType: 'infrastructure_project',
      isCommerciallyViable: false,
      exclusionReason: 'Proyecto de infraestructura pública — no es empresa privada con decisor comercial identificable',
      exclusionConfidence: 'high',
      commercialBuyerIdentifiable: false,
      directSalesPotential: false,
      detectedSignals: signals,
    }
  }

  if (hasConstructionPrefix && hasInfraKeyword) {
    signals.push(`Nombre empieza con prefijo de construcción + keyword de infraestructura`)
    return {
      entityType: 'infrastructure_project',
      isCommerciallyViable: false,
      exclusionReason: 'Proyecto de infraestructura pública — no es empresa privada con decisor comercial identificable',
      exclusionConfidence: 'high',
      commercialBuyerIdentifiable: false,
      directSalesPotential: false,
      detectedSignals: signals,
    }
  }

  // ── 2. Government entity ───────────────────────────────────────────────────

  const govMatch = matches(combined, GOVERNMENT_PATTERNS)
  if (govMatch) {
    signals.push(`Patrón de entidad gubernamental: "${govMatch}"`)
    return {
      entityType: 'government_entity',
      isCommerciallyViable: false,
      exclusionReason: 'Entidad gubernamental u organismo estatal — sin decisor comercial privado',
      exclusionConfidence: 'high',
      commercialBuyerIdentifiable: false,
      directSalesPotential: false,
      detectedSignals: signals,
    }
  }

  // ── 3. Public healthcare ───────────────────────────────────────────────────

  const pubHealthMatch = matches(combined, PUBLIC_HEALTHCARE_PATTERNS)
  if (pubHealthMatch) {
    signals.push(`Patrón de salud pública: "${pubHealthMatch}"`)
    return {
      entityType: 'healthcare_public',
      isCommerciallyViable: false,
      exclusionReason: 'Hospital o institución de salud pública — sin presupuesto para servicios comerciales privados',
      exclusionConfidence: 'high',
      commercialBuyerIdentifiable: false,
      directSalesPotential: false,
      detectedSignals: signals,
    }
  }

  // ── 4. Public education ────────────────────────────────────────────────────

  const pubEduMatch = matches(combined, PUBLIC_EDUCATION_PATTERNS)
  if (pubEduMatch) {
    signals.push(`Patrón de educación pública: "${pubEduMatch}"`)
    return {
      entityType: 'educational_public',
      isCommerciallyViable: false,
      exclusionReason: 'Institución educativa pública — ciclo de compra gubernamental, no privado',
      exclusionConfidence: 'high',
      commercialBuyerIdentifiable: false,
      directSalesPotential: false,
      detectedSignals: signals,
    }
  }

  // ── 5. Nonprofit ───────────────────────────────────────────────────────────

  const nonprofitMatch = matches(combined, NONPROFIT_PATTERNS)
  if (nonprofitMatch) {
    signals.push(`Patrón de organización sin fines de lucro: "${nonprofitMatch}"`)
    return {
      entityType: 'nonprofit',
      isCommerciallyViable: false,
      exclusionReason: 'Organización sin fines de lucro — sin ROI comercial directo para Kronos',
      exclusionConfidence: 'medium',
      commercialBuyerIdentifiable: false,
      directSalesPotential: false,
      detectedSignals: signals,
    }
  }

  // ── 6. Associations / chambers ────────────────────────────────────────────

  const assocMatch = matches(combined, ASSOCIATION_PATTERNS)
  if (assocMatch) {
    signals.push(`Patrón de asociación/gremio: "${assocMatch}"`)
    return {
      entityType: 'association',
      isCommerciallyViable: false,
      exclusionReason: 'Asociación, gremio o colegio profesional — ciclo de compra colectivo no directo',
      exclusionConfidence: 'medium',
      commercialBuyerIdentifiable: false,
      directSalesPotential: false,
      detectedSignals: signals,
    }
  }

  // ── 7. Place / landmark ────────────────────────────────────────────────────

  const placeMatch = matches(combined, PLACE_LANDMARK_PATTERNS)
  if (placeMatch) {
    signals.push(`Patrón de lugar/referencia: "${placeMatch}"`)
    return {
      entityType: 'place_landmark',
      isCommerciallyViable: false,
      exclusionReason: 'Lugar público o punto de referencia — no es empresa con decisor comercial',
      exclusionConfidence: 'high',
      commercialBuyerIdentifiable: false,
      directSalesPotential: false,
      detectedSignals: signals,
    }
  }

  // ── 8. Large chain ─────────────────────────────────────────────────────────

  const chainMatch = LARGE_CHAIN_KEYWORDS.find(kw => nameNorm.includes(norm(kw)))
  if (chainMatch) {
    signals.push(`Cadena grande conocida: "${chainMatch}"`)
    return {
      entityType: 'branch_large_chain',
      isCommerciallyViable: false,
      exclusionReason: 'Sucursal de cadena multinacional o empresa grande con infraestructura tech propia',
      exclusionConfidence: 'high',
      commercialBuyerIdentifiable: false,
      directSalesPotential: false,
      detectedSignals: signals,
    }
  }

  // ── 9. Default: private business ──────────────────────────────────────────

  const isViable = true
  signals.push('Sin señales de exclusión detectadas — clasificado como empresa privada')

  return {
    entityType: 'private_business',
    isCommerciallyViable: isViable,
    exclusionReason: null,
    exclusionConfidence: 'low',
    commercialBuyerIdentifiable: true,
    directSalesPotential: true,
    detectedSignals: signals,
  }
}
