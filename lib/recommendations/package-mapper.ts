// @legacy — v2 does NOT pre-assign packages before an audit.
// Package selection belongs in the Audit model (post-meeting, human-validated).
// Archived: do not import in new routes or UI primary views.
// Package recommendation engine.
// Maps confirmed signals + coverage + evidence to official Kronos packages.
// Output is separate from individual service recommendations (service-match.ts).

import type { SignalFlags } from '../types'
import type { SignalEvidenceMap } from '../evidence'
import { KRONOS_PACKAGES, OFFICIAL_URL, CATALOG_VERSION, type PackageSlug } from '../catalog/kronos-offers'

export interface PackageRecommendation {
  recommendedPackageSlug: PackageSlug
  recommendedPackageName: string
  alternativePackageSlug: PackageSlug | null
  alternativePackageName: string | null
  packageReason: string
  packageEvidence: string[]
  packageConfidence: 'high' | 'medium' | 'low'
  packageCoverage: number
  packagePriceMin: number
  packagePriceMax: number
  packageTimelineMin: number
  packageTimelineMax: number
  officialSourceUrl: string
  catalogVersion: string
}

// ─── Signal scoring per package domain ───────────────────────────────────────

function countOperationsSignals(s: SignalFlags): number {
  let n = 0
  if (s.signalWeakFollowup)       n++
  if (s.signalManualWork)         n++
  if (s.signalSlowResponse)       n++
  if (!s.signalHasWhatsapp)       n++
  if (!s.signalHasBookingSystem)  n++
  return n
}

function countConversionSignals(s: SignalFlags): number {
  let n = 0
  if (!s.signalHasClearCta)          n++
  if (!s.signalHasLeadCapture)       n++
  if (!s.signalHasContactForm)       n++
  if (!s.signalHasWebsite)           n++
  if (!s.signalHasGoogleBusiness)    n++
  if (s.signalWeakOnlinePresence)    n++
  if (s.signalHasUnansweredReviews)  n++
  if (!s.signalHasInstagram)         n++
  return n
}

function operationsEvidence(s: SignalFlags): string[] {
  const ev: string[] = []
  if (s.signalWeakFollowup)      ev.push('Seguimiento débil a prospectos')
  if (s.signalManualWork)        ev.push('Procesos manuales repetitivos detectados')
  if (s.signalSlowResponse)      ev.push('Señales de respuesta lenta a consultas')
  if (!s.signalHasWhatsapp)      ev.push('Sin WhatsApp como canal comercial')
  if (!s.signalHasBookingSystem) ev.push('Sin sistema de reservas o citas')
  return ev
}

function conversionEvidence(s: SignalFlags): string[] {
  const ev: string[] = []
  if (!s.signalHasClearCta)         ev.push('Sin llamada a la acción clara')
  if (!s.signalHasLeadCapture)      ev.push('Sin captura de leads en el sitio')
  if (!s.signalHasContactForm)      ev.push('Sin formulario de contacto')
  if (!s.signalHasWebsite)          ev.push('Sin sitio web activo')
  if (!s.signalHasGoogleBusiness)   ev.push('Sin Google Business Profile')
  if (s.signalWeakOnlinePresence)   ev.push('Presencia online débil o desactualizada')
  if (s.signalHasUnansweredReviews) ev.push('Reseñas sin responder detectadas')
  if (!s.signalHasInstagram)        ev.push('Sin presencia en Instagram')
  return ev
}

// ─── Confidence from coverage + signal count ─────────────────────────────────

function packageConfidence(
  coverage: number,
  domainSignalCount: number,
): 'high' | 'medium' | 'low' {
  if (coverage >= 65 && domainSignalCount >= 3) return 'high'
  if (coverage >= 40 && domainSignalCount >= 2) return 'medium'
  return 'low'
}

// ─── Main recommendation function ────────────────────────────────────────────

export function recommendPackage(
  signals: SignalFlags,
  coverage: number,
  _evidence?: SignalEvidenceMap,
): PackageRecommendation {
  // Rule 1: insufficient coverage → always recommend free audit
  if (coverage < 50) {
    const pkg = KRONOS_PACKAGES.auditoria_gratuita
    return {
      recommendedPackageSlug: 'auditoria_gratuita',
      recommendedPackageName: pkg.name,
      alternativePackageSlug: null,
      alternativePackageName: null,
      packageReason:
        'Con la información disponible no es posible confirmar el diagnóstico. El primer paso es una Auditoría Gratuita para validar oportunidades reales antes de recomendar una solución.',
      packageEvidence: ['Cobertura de investigación insuficiente (< 50%)'],
      packageConfidence: 'low',
      packageCoverage: coverage,
      packagePriceMin: 0,
      packagePriceMax: 0,
      packageTimelineMin: 1,
      packageTimelineMax: 1,
      officialSourceUrl: OFFICIAL_URL,
      catalogVersion: CATALOG_VERSION,
    }
  }

  const opsCount  = countOperationsSignals(signals)
  const convCount = countConversionSignals(signals)

  // Rule 2: if only isolated problem — don't force a package (handled by individual services)
  // A package needs at least 2 domain signals with medium+ coverage
  const opsQualifies  = opsCount  >= 2
  const convQualifies = convCount >= 2

  // Rule 3: Both packages qualify — pick primary by signal count, secondary as alternative
  if (opsQualifies && convQualifies) {
    const primary   = opsCount >= convCount ? 'sistemas_operaciones_autonomas' : 'auditoria_conversion_digital'
    const secondary = primary === 'sistemas_operaciones_autonomas' ? 'auditoria_conversion_digital' : 'sistemas_operaciones_autonomas'
    const primaryPkg   = KRONOS_PACKAGES[primary]
    const secondaryPkg = KRONOS_PACKAGES[secondary]
    const domainCount  = primary === 'sistemas_operaciones_autonomas' ? opsCount : convCount
    const conf         = packageConfidence(coverage, domainCount)

    const evList = primary === 'sistemas_operaciones_autonomas'
      ? operationsEvidence(signals)
      : conversionEvidence(signals)

    return {
      recommendedPackageSlug: primary,
      recommendedPackageName: primaryPkg.name,
      alternativePackageSlug: secondary,
      alternativePackageName: secondaryPkg.name,
      packageReason: buildReason(primary, domainCount, conf),
      packageEvidence: evList,
      packageConfidence: conf,
      packageCoverage: coverage,
      packagePriceMin: primaryPkg.priceMin,
      packagePriceMax: primaryPkg.priceMax,
      packageTimelineMin: primaryPkg.timelineMinWeeks,
      packageTimelineMax: primaryPkg.timelineMaxWeeks,
      officialSourceUrl: OFFICIAL_URL,
      catalogVersion: CATALOG_VERSION,
    }
  }

  // Rule 4: Only operations package qualifies
  if (opsQualifies) {
    const pkg  = KRONOS_PACKAGES.sistemas_operaciones_autonomas
    const conf = packageConfidence(coverage, opsCount)
    return {
      recommendedPackageSlug: 'sistemas_operaciones_autonomas',
      recommendedPackageName: pkg.name,
      alternativePackageSlug: null,
      alternativePackageName: null,
      packageReason: buildReason('sistemas_operaciones_autonomas', opsCount, conf),
      packageEvidence: operationsEvidence(signals),
      packageConfidence: conf,
      packageCoverage: coverage,
      packagePriceMin: pkg.priceMin,
      packagePriceMax: pkg.priceMax,
      packageTimelineMin: pkg.timelineMinWeeks,
      packageTimelineMax: pkg.timelineMaxWeeks,
      officialSourceUrl: OFFICIAL_URL,
      catalogVersion: CATALOG_VERSION,
    }
  }

  // Rule 5: Only conversion package qualifies
  if (convQualifies) {
    const pkg  = KRONOS_PACKAGES.auditoria_conversion_digital
    const conf = packageConfidence(coverage, convCount)
    return {
      recommendedPackageSlug: 'auditoria_conversion_digital',
      recommendedPackageName: pkg.name,
      alternativePackageSlug: null,
      alternativePackageName: null,
      packageReason: buildReason('auditoria_conversion_digital', convCount, conf),
      packageEvidence: conversionEvidence(signals),
      packageConfidence: conf,
      packageCoverage: coverage,
      packagePriceMin: pkg.priceMin,
      packagePriceMax: pkg.priceMax,
      packageTimelineMin: pkg.timelineMinWeeks,
      packageTimelineMax: pkg.timelineMaxWeeks,
      officialSourceUrl: OFFICIAL_URL,
      catalogVersion: CATALOG_VERSION,
    }
  }

  // Rule 6: Neither package qualifies (< 2 domain signals each) → free audit
  const pkg = KRONOS_PACKAGES.auditoria_gratuita
  return {
    recommendedPackageSlug: 'auditoria_gratuita',
    recommendedPackageName: pkg.name,
    alternativePackageSlug: null,
    alternativePackageName: null,
    packageReason:
      'No se identificaron suficientes necesidades agrupadas para un paquete completo. Se recomienda una Auditoría Gratuita para validar el diagnóstico o considerar un servicio individual puntual.',
    packageEvidence: [],
    packageConfidence: 'low',
    packageCoverage: coverage,
    packagePriceMin: 0,
    packagePriceMax: 0,
    packageTimelineMin: 1,
    packageTimelineMax: 1,
    officialSourceUrl: OFFICIAL_URL,
    catalogVersion: CATALOG_VERSION,
  }
}

function buildReason(
  slug: PackageSlug,
  signalCount: number,
  conf: 'high' | 'medium' | 'low',
): string {
  const confText = conf === 'high' ? 'alta confianza' : conf === 'medium' ? 'confianza media' : 'confianza preliminar'

  if (slug === 'sistemas_operaciones_autonomas') {
    return `Se detectaron ${signalCount} indicadores operativos confirmados (${confText}). El negocio tiene oportunidad clara de eliminar procesos manuales y mejorar la respuesta y seguimiento comercial.`
  }
  if (slug === 'auditoria_conversion_digital') {
    return `Se detectaron ${signalCount} brechas en la presencia y conversión digital (${confText}). El negocio tiene oportunidad de mejorar su visibilidad online y la captación de clientes potenciales.`
  }
  return 'Recomendación basada en señales disponibles.'
}
