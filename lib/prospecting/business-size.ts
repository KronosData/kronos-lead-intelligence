// Business size estimation from discovery-stage data (no web analysis yet).
// Heuristic-based; confidence reflects certainty level.

import { CHAIN_NAME_KEYWORDS, EXCLUSION_KEYWORDS, type BusinessSize } from './config'

export interface BusinessSizeResult {
  size: BusinessSize
  confidence: 'high' | 'medium' | 'low'
  chainDetected: boolean
  chainEvidence: string[]
  isExcluded: boolean
  exclusionReason: string | null
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function estimateBusinessSizeFromDiscovery(
  name: string,
  website: string | null,
  industry: string,
  sameDomainCount: number,    // how many other candidates share the same normalized website domain
  sameNameCount: number,      // how many candidates have a very similar name
): BusinessSizeResult {
  const nameLower = slugifyName(name)
  const industryLower = industry.toLowerCase()
  const chainEvidence: string[] = []

  // ── Exclusion check (public / non-commercial entities) ─────────────────────

  for (const kw of EXCLUSION_KEYWORDS) {
    if (nameLower.includes(slugifyName(kw)) || industryLower.includes(slugifyName(kw))) {
      return {
        size: 'large', confidence: 'high',
        chainDetected: false, chainEvidence: [],
        isExcluded: true,
        exclusionReason: `Organismo público o no comercial detectado: "${name}"`,
      }
    }
  }

  // ── Chain detection ────────────────────────────────────────────────────────

  let chainScore = 0

  for (const kw of CHAIN_NAME_KEYWORDS) {
    const kwNorm = slugifyName(kw.trim())
    if (nameLower.includes(kwNorm)) {
      chainScore += 2
      chainEvidence.push(`Nombre contiene "${kw.trim()}"`)
      break // one keyword match is enough signal from the name
    }
  }

  if (sameDomainCount >= 3) {
    chainScore += 3
    chainEvidence.push(`Mismo dominio web en ${sameDomainCount} candidatos`)
  } else if (sameDomainCount === 2) {
    chainScore += 1
    chainEvidence.push(`Dominio web compartido con otro candidato`)
  }

  if (sameNameCount >= 4) {
    chainScore += 3
    chainEvidence.push(`Nombre similar en ${sameNameCount} candidatos (posible franquicia)`)
  } else if (sameNameCount >= 2) {
    chainScore += 1
    chainEvidence.push(`Nombre similar en ${sameNameCount} candidatos`)
  }

  const chainDetected = chainScore >= 2

  // ── Size estimation ────────────────────────────────────────────────────────

  let size: BusinessSize
  let confidence: 'high' | 'medium' | 'low'

  if (chainDetected) {
    size = 'large'
    confidence = 'medium'
  } else if (sameDomainCount >= 2 || sameNameCount >= 2) {
    size = 'medium'
    confidence = 'low'
  } else if (!website) {
    // No website is a strong signal for micro/small in most LATAM markets
    size = 'micro'
    confidence = 'low'
  } else {
    // Has website, no chain signals → most likely small
    size = 'small'
    confidence = 'low'
  }

  return {
    size, confidence, chainDetected, chainEvidence,
    isExcluded: false, exclusionReason: null,
  }
}
