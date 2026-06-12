// Centralized configuration for all prospecting logic.
// All weights, thresholds, and mode definitions live here.

export type SearchMode =
  | 'sellable'
  | 'quick_wins'
  | 'automation'
  | 'conversion'
  | 'data'
  | 'competitive'
  | 'contactable'
  | 'broad'

export type BusinessSize = 'micro' | 'small' | 'medium' | 'large' | 'unknown'

export type ProspectProfile =
  | 'ideal'
  | 'good_opportunity'
  | 'investigate'
  | 'low_priority'
  | 'discard'

export interface SearchModeConfig {
  label: string
  description: string
  minPFS: number
  excludeChains: boolean
  excludeLarge: boolean
  requireContact: boolean
}

// ── Scoring weights ────────────────────────────────────────────────────────────

export const PROSPECT_FIT_WEIGHTS = {
  opportunityVisible: 0.35,
  contactability:     0.20,
  kronosFit:          0.20,
  pymeProbability:    0.15,
  evidenceQuality:    0.10,
} as const

export const SALES_PRIORITY_WEIGHTS = {
  opportunityScore:  0.45,
  prospectFitScore:  0.35,
  confidenceScore:   0.20,
} as const

// ── Prospect profile thresholds (PFS score) ───────────────────────────────────

export const PROSPECT_PROFILE_THRESHOLDS = {
  ideal:            70,
  good_opportunity: 50,
  investigate:      30,
  low_priority:     14,
  // < 14 → discard
} as const

// ── Chain / large company detection ──────────────────────────────────────────

// Name keywords that indicate chain or large company (accent-normalized)
export const CHAIN_NAME_KEYWORDS = [
  'grupo', 'grp ', 'corporacion', 'corporación', 'holding',
  'multinacional', 'international', 'internacional', 'global',
  ' network', ' cadena', ' chain', 'franquicia', 'franchise',
  'nationwide',
]

// Keywords indicating public/non-commercial entities to exclude
export const EXCLUSION_KEYWORDS = [
  'ministerio', 'gobierno municipal', 'municipalidad', 'alcaldía', 'alcaldia',
  'municipio de ', 'prefecture', 'embajada', 'consulado',
  'hospital nacional', 'hospital general ', 'hospital regional',
  'essalud', 'seguro social', 'banco central', 'banco de la nacion',
  'universidad nacional', 'universidad publica', 'instituto nacional',
]

// ── Industries with high payment capacity for Kronos ─────────────────────────

export const HIGH_KRONOS_FIT_INDUSTRIES = [
  { keywords: ['dental', 'odontolog'], packageSlug: 'sistemas_operaciones_autonomas', fitScore: 85 },
  { keywords: ['inmobiliaria', 'real estate', 'bienes raices', 'bienes raíces'], packageSlug: 'auditoria_conversion_digital', fitScore: 85 },
  { keywords: ['abogado', 'abogados', 'legal', 'juridico', 'jurídico', 'notaria', 'notaría'], packageSlug: 'sistemas_operaciones_autonomas', fitScore: 80 },
  { keywords: ['constructora', 'construccion', 'construcción'], packageSlug: 'arquitectura_datos_dashboards', fitScore: 75 },
  { keywords: ['clinica', 'clínica', 'medico', 'médico', 'salud', 'healthcare'], packageSlug: 'sistemas_operaciones_autonomas', fitScore: 75 },
  { keywords: ['consultor', 'consultoria', 'consultoría'], packageSlug: 'arquitectura_datos_dashboards', fitScore: 65 },
  { keywords: ['agencia', 'marketing', 'publicidad'], packageSlug: 'arquitectura_datos_dashboards', fitScore: 65 },
  { keywords: ['automotriz', 'taller', 'mecanico', 'mecánico'], packageSlug: 'sistemas_operaciones_autonomas', fitScore: 70 },
  { keywords: ['restaurant', 'restaurante', 'comida', 'gastronomia', 'gastronomía'], packageSlug: 'sistemas_operaciones_autonomas', fitScore: 65 },
  { keywords: ['retail', 'tienda', 'comercio', 'venta'], packageSlug: 'auditoria_conversion_digital', fitScore: 60 },
  { keywords: ['logistica', 'logística', 'transporte', 'envios', 'envíos'], packageSlug: 'sistemas_operaciones_autonomas', fitScore: 70 },
  { keywords: ['educacion', 'educación', 'academia', 'instituto', 'colegio privado'], packageSlug: 'auditoria_conversion_digital', fitScore: 60 },
  { keywords: ['estetica', 'estética', 'salon', 'salón', 'spa', 'belleza'], packageSlug: 'sistemas_operaciones_autonomas', fitScore: 65 },
  { keywords: ['veterinaria', 'veterinario'], packageSlug: 'sistemas_operaciones_autonomas', fitScore: 65 },
  { keywords: ['financier', 'fintech', 'seguros', 'seguro'], packageSlug: 'auditoria_conversion_digital', fitScore: 80 },
]

// ── Search mode configs ────────────────────────────────────────────────────────

export const SEARCH_MODE_CONFIGS: Record<SearchMode, SearchModeConfig> = {
  sellable: {
    label: 'Oportunidades vendibles',
    description: 'Pymes con problemas visibles y contacto disponible',
    minPFS: 35, excludeChains: true, excludeLarge: true, requireContact: true,
  },
  quick_wins: {
    label: 'Quick wins',
    description: 'Problema claro y fácil de resolver rápidamente',
    minPFS: 40, excludeChains: true, excludeLarge: true, requireContact: true,
  },
  automation: {
    label: 'Alta necesidad de automatización',
    description: 'Procesos manuales y operaciones ineficientes',
    minPFS: 25, excludeChains: false, excludeLarge: false, requireContact: false,
  },
  conversion: {
    label: 'Conversión digital deficiente',
    description: 'Sin CTA claro, formulario o captura de leads',
    minPFS: 25, excludeChains: true, excludeLarge: false, requireContact: false,
  },
  data: {
    label: 'Datos y dashboards',
    description: 'Empresas con datos desestructurados o sin reporting',
    minPFS: 20, excludeChains: false, excludeLarge: false, requireContact: false,
  },
  competitive: {
    label: 'Inteligencia competitiva',
    description: 'Sectores con precios públicos o competidores monitoreables',
    minPFS: 20, excludeChains: false, excludeLarge: false, requireContact: false,
  },
  contactable: {
    label: 'Contactables ahora',
    description: 'Solo empresas con al menos un contacto real confirmado',
    minPFS: 0, excludeChains: false, excludeLarge: false, requireContact: true,
  },
  broad: {
    label: 'Investigación amplia',
    description: 'Todos los candidatos, incluidos datos incompletos',
    minPFS: 0, excludeChains: false, excludeLarge: false, requireContact: false,
  },
}

export const DEFAULT_SEARCH_MODE: SearchMode = 'sellable'

// ── Discovery tuning ──────────────────────────────────────────────────────────

export const OVERFETCH_MULTIPLIER = 5   // fetch N×5 before filtering to N
export const MAX_OVERFETCH        = 150  // hard cap on total candidates fetched
export const DEFAULT_RADIUS_KM    = 5    // default search grid radius
export const GRID_POINTS          = 5    // center + 4 cardinal directions
