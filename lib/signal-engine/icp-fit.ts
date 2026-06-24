import type { IcpTier } from './types'

// Kronos target sectors: private appointment-based and lead-dependent businesses.
// Tier 1: highest ROI potential for Kronos's automation/conversion/digital services.
// Tier 2: compatible but lower priority.

const TIER_1_KEYWORDS = [
  'dental', 'odontolog', 'clinic', 'clínic', 'salud', 'health', 'médic', 'medic',
  'beauty', 'estétic', 'estetica', 'aesthetic', 'cosmetic', 'spa', 'wellness', 'bienestar',
  'legal', 'abogad', 'law', 'notaria', 'bufete', 'estudio jurídico',
  'inmobili', 'real estate', 'bienes raices', 'propiedad', 'property', 'agencia inmobiliaria',
  'construc', 'construct', 'contratis', 'contractor', 'architect', 'arquitec',
  'consultor', 'consulting', 'asesor', 'advisory',
  'fisioterapi', 'physiotherapy', 'nutrici', 'nutrition', 'psicolog', 'psychology',
  'veterinari', 'veterinary',
]

const TIER_2_KEYWORDS = [
  'educaci', 'education', 'colegio', 'instituto', 'academia', 'school', 'universidad privada',
  'logistic', 'distribu', 'transporte', 'transport', 'courier',
  'contabilid', 'accounting', 'finanzas', 'finance',
  'restaurant', 'food', 'cafe', 'catering', 'gastronomia',
  'hotel', 'hostal', 'turismo', 'tourism', 'agencia de viajes',
  'tecnología', 'technology', 'software', 'desarrollo',
  'marketing', 'publicidad', 'advertising', 'agencia creativa',
  'seguro', 'insurance',
  'taller', 'automotive', 'mecánic',
]

const DISQUALIFIED_KEYWORDS = [
  'municipalidad', 'gobierno', 'ministerio', 'estado', 'publico', 'nacional',
  'hospital publico', 'banco del estado',
  'multinacional', 'corporacion', 'corporation s.a.',
  'marketplace', 'directorio', 'directory',
  'ong', 'fundacion', 'asociacion sin fines',
]

// LATAM countries Kronos operates in
const PRIMARY_COUNTRIES = ['peru', 'colombia', 'chile', 'mexico', 'argentina', 'ecuador', 'bolivia', 'panama', 'costa rica']
const SECONDARY_COUNTRIES = ['espana', 'spain', 'latin', 'america']

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function matchesAny(text: string, keywords: string[]): boolean {
  const norm = normalizeText(text)
  return keywords.some((kw) => norm.includes(normalizeText(kw)))
}

export interface IcpFitInput {
  industry: string
  name: string
  country: string
  isCommercial: boolean
  entityType?: string | null
  website?: string | null
}

export interface IcpFitResult {
  score: number
  tier: IcpTier
  reasons: string[]
}

export function computeIcpFit(input: IcpFitInput): IcpFitResult {
  const reasons: string[] = []

  if (!input.isCommercial) {
    return { score: 0, tier: 'NONE', reasons: ['Entidad no comercial'] }
  }

  let score = 0
  const searchText = `${input.industry} ${input.name}`

  // Industry match (50 pts max)
  if (matchesAny(searchText, TIER_1_KEYWORDS)) {
    score += 50
    reasons.push('Sector prioritario para Kronos')
  } else if (matchesAny(searchText, TIER_2_KEYWORDS)) {
    score += 30
    reasons.push('Sector compatible con Kronos')
  } else if (!matchesAny(searchText, DISQUALIFIED_KEYWORDS)) {
    score += 15
    reasons.push('Sector comercial — encaje moderado')
  } else {
    reasons.push('Sector fuera del ICP de Kronos')
  }

  // Country / region (30 pts max)
  const countryNorm = normalizeText(input.country)
  if (PRIMARY_COUNTRIES.some((c) => countryNorm.includes(normalizeText(c)))) {
    score += 30
    reasons.push('País objetivo de Kronos')
  } else if (SECONDARY_COUNTRIES.some((c) => countryNorm.includes(normalizeText(c)))) {
    score += 20
    reasons.push('Mercado potencial')
  } else {
    score += 10
    reasons.push('País no prioritario')
  }

  // Website (10 pts) — more likely to value digital improvement
  if (input.website) {
    score += 10
    reasons.push('Tiene presencia web — candidata a mejora digital')
  }

  score = Math.min(100, score)
  const tier: IcpTier =
    score >= 70 ? 'STRONG' : score >= 50 ? 'GOOD' : score >= 30 ? 'MARGINAL' : 'NONE'

  return { score, tier, reasons }
}
