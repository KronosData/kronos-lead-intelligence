import type { SignalEvidenceMap, VisibleSymptom } from './types'

// A symptom is ONLY counted when evidence explicitly confirms it.
// 'unknown' signals are skipped — we do NOT assume absence = problem.
// This prevents inventing problems we cannot see externally.

interface SymptomDef {
  label: string
  points: number
  // problem_if_negative: good to have → its absence is the symptom
  // problem_if_positive: bad to have → its presence is the symptom
  polarity: 'problem_if_negative' | 'problem_if_positive'
}

const SYMPTOM_DEFS: Record<string, SymptomDef> = {
  signalHasWebsite:           { label: 'Sin sitio web',                        points: 15, polarity: 'problem_if_negative' },
  signalHasWhatsapp:          { label: 'Sin WhatsApp visible',                  points: 10, polarity: 'problem_if_negative' },
  signalHasContactForm:       { label: 'Sin formulario de contacto',            points: 7,  polarity: 'problem_if_negative' },
  signalHasBookingSystem:     { label: 'Sin sistema de reservas o citas',       points: 10, polarity: 'problem_if_negative' },
  signalHasInstagram:         { label: 'Sin Instagram vinculado',               points: 5,  polarity: 'problem_if_negative' },
  signalHasLinkedin:          { label: 'Sin LinkedIn vinculado',                points: 3,  polarity: 'problem_if_negative' },
  signalHasGoogleBusiness:    { label: 'Sin Google Business Profile',           points: 8,  polarity: 'problem_if_negative' },
  signalHasReviews:           { label: 'Sin reseñas online',                    points: 7,  polarity: 'problem_if_negative' },
  signalHasUnansweredReviews: { label: 'Reseñas sin responder detectadas',      points: 8,  polarity: 'problem_if_positive' },
  signalHasClearCta:          { label: 'Sin llamada a la acción (CTA) clara',   points: 8,  polarity: 'problem_if_negative' },
  signalHasLeadCapture:       { label: 'Sin captura de leads',                  points: 6,  polarity: 'problem_if_negative' },
  signalSlowResponse:         { label: 'Tiempo de respuesta lento (reseñas)',   points: 5,  polarity: 'problem_if_positive' },
  signalWeakFollowup:         { label: 'Seguimiento post-consulta débil',       points: 4,  polarity: 'problem_if_positive' },
  signalManualWork:           { label: 'Procesos manuales detectados',          points: 3,  polarity: 'problem_if_positive' },
  signalWeakOnlinePresence:   { label: 'Presencia digital débil',               points: 7,  polarity: 'problem_if_positive' },
}

// Sum of all max points: 15+10+7+10+5+3+8+7+8+8+6+5+4+3+7 = 106 base + up to 12 for unreachable = 118
const MAX_RAW = 118

export interface VisibleSymptomsInput {
  evidence: SignalEvidenceMap
  websiteVerificationStatus?: string | null
}

export interface VisibleSymptomsResult {
  score: number
  symptoms: VisibleSymptom[]
  totalRaw: number
}

export function computeVisibleSymptoms(input: VisibleSymptomsInput): VisibleSymptomsResult {
  const symptoms: VisibleSymptom[] = []
  let totalRaw = 0

  // Website-level symptoms (from verification status, not signal evidence)
  if (input.websiteVerificationStatus === 'UNREACHABLE') {
    symptoms.push({ key: 'websiteUnreachable', label: 'Sitio web inaccesible', source: 'web_confirmed', confidence: 'high' })
    totalRaw += 12
  } else if (input.websiteVerificationStatus === 'MISMATCH') {
    symptoms.push({ key: 'websiteMismatch', label: 'Sitio web no corresponde a la empresa', source: 'web_confirmed', confidence: 'medium' })
    totalRaw += 8
  }

  for (const [key, def] of Object.entries(SYMPTOM_DEFS)) {
    const entry = input.evidence[key]
    if (!entry) continue
    if (entry.status === 'unknown') continue  // never assume — only count confirmed

    const isSymptom =
      (def.polarity === 'problem_if_negative' && (entry.status === 'negative' || entry.status === 'inferred')) ||
      (def.polarity === 'problem_if_positive' && entry.status === 'positive')

    if (!isSymptom) continue

    // Don't double-count website absence if we already counted website unreachable
    if (key === 'signalHasWebsite' &&
      (input.websiteVerificationStatus === 'UNREACHABLE' || input.websiteVerificationStatus === 'MISMATCH')) {
      continue
    }

    symptoms.push({
      key,
      label: def.label,
      source: entry.status === 'inferred' ? 'inferred' : 'web_confirmed',
      confidence: entry.confidence === 'none' ? 'low' : entry.confidence,
    })
    totalRaw += def.points
  }

  const score = Math.min(100, Math.round((totalRaw / MAX_RAW) * 100))
  return { score, symptoms, totalRaw }
}
