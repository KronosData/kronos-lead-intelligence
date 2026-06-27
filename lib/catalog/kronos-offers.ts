// Official Kronos Data package catalog.
// Source of truth: https://www.kronosdata.tech/
// Do NOT modify package names or descriptions without aligning to the web first.
// Catalog version must be bumped when packages change.

export const CATALOG_VERSION = '2026-06-kronos-web-v1'
export const OFFICIAL_URL = 'https://www.kronosdata.tech/'

export type PackageSlug =
  | 'auditoria_gratuita'
  | 'sistemas_operaciones_autonomas'
  | 'arquitectura_datos_dashboards'
  | 'inteligencia_competitiva_scraping'
  | 'auditoria_conversion_digital'

export type MethodologyPhase = 'diagnosis' | 'architecture' | 'deployment'

export interface KronosPackage {
  slug: PackageSlug
  name: string
  subtitle: string
  description: string
  problemSolved: string
  methodology: MethodologyPhase[]
  includedServiceSlugs: string[]
  minCoverageForConfidence: number
  priceMin: number
  priceMax: number
  timelineMinWeeks: number
  timelineMaxWeeks: number
  supportIncluded: string
  guarantee: string
  officialUrl: string
  catalogVersion: string
}

export const KRONOS_PACKAGES: Record<PackageSlug, KronosPackage> = {
  auditoria_gratuita: {
    slug: 'auditoria_gratuita',
    name: 'Auditoría Gratuita / Diagnóstico',
    subtitle: 'El primer paso: identificar oportunidades reales antes de proponer cualquier solución',
    description:
      'Revisión inicial del estado digital y operativo del negocio. Identificamos las principales fugas de eficiencia y oportunidades de automatización sin compromiso. El diagnóstico gratuito es el punto de entrada al ecosistema Kronos Data.',
    problemSolved:
      'Falta de claridad sobre qué mejorar primero. Permite validar oportunidades reales antes de invertir en una solución.',
    methodology: ['diagnosis'],
    includedServiceSlugs: ['diagnosis_free'],
    minCoverageForConfidence: 0,
    priceMin: 0,
    priceMax: 0,
    timelineMinWeeks: 1,
    timelineMaxWeeks: 1,
    supportIncluded: 'Reunión de diagnóstico + informe de hallazgos',
    guarantee: 'Sin compromiso',
    officialUrl: OFFICIAL_URL,
    catalogVersion: CATALOG_VERSION,
  },

  sistemas_operaciones_autonomas: {
    slug: 'sistemas_operaciones_autonomas',
    name: 'Sistemas de Operaciones Autónomas',
    subtitle:
      'Ingeniería de flujos de trabajo para la eliminación de procesos manuales y escalabilidad operativa',
    description:
      'Automatizamos los procesos repetitivos y manuales del negocio: seguimiento de leads, respuesta por WhatsApp, gestión de citas y flujos comerciales. El equipo deja de hacer trabajo operativo para enfocarse en ventas y atención de calidad.',
    problemSolved:
      'Procesos manuales que consumen tiempo del equipo, respuesta lenta a prospectos, ausencia de seguimiento sistemático y cuellos de botella operativos que limitan el crecimiento.',
    methodology: ['diagnosis', 'architecture', 'deployment'],
    includedServiceSlugs: [
      'whatsapp_automation',
      'crm_followup_automation',
      'appointment_booking',
      'sales_process_automation',
      'integrations_flows',
    ],
    minCoverageForConfidence: 40,
    priceMin: 900,
    priceMax: 3000,
    timelineMinWeeks: 3,
    timelineMaxWeeks: 8,
    supportIncluded:
      'Monitoreo post-implementación continuo + soporte técnico + ajustes en los primeros 30 días',
    guarantee: 'Garantía de Optimización Operativa 30 días',
    officialUrl: OFFICIAL_URL,
    catalogVersion: CATALOG_VERSION,
  },

  arquitectura_datos_dashboards: {
    slug: 'arquitectura_datos_dashboards',
    name: 'Arquitectura de Datos y Dashboards',
    subtitle:
      'Limpieza, procesamiento y visualización estratégica de datos para decisiones de negocio en tiempo real',
    description:
      'Consolidamos las fuentes de datos del negocio, limpiamos y estructuramos la información y construimos dashboards con los KPIs que importan. El equipo directivo toma decisiones basadas en datos actualizados en tiempo real.',
    problemSolved:
      'Información dispersa en múltiples fuentes, reportes manuales en Excel, ausencia de KPIs claros, dificultad para medir rendimiento y tomar decisiones con datos confiables.',
    methodology: ['diagnosis', 'architecture', 'deployment'],
    includedServiceSlugs: [
      'data_architecture',
      'dashboards_kpi',
      'data_consolidation',
      'report_automation',
    ],
    minCoverageForConfidence: 40,
    priceMin: 1200,
    priceMax: 3500,
    timelineMinWeeks: 4,
    timelineMaxWeeks: 8,
    supportIncluded:
      'Monitoreo post-implementación continuo + soporte técnico + ajustes en los primeros 30 días',
    guarantee: 'Garantía de Optimización Operativa 30 días',
    officialUrl: OFFICIAL_URL,
    catalogVersion: CATALOG_VERSION,
  },

  inteligencia_competitiva_scraping: {
    slug: 'inteligencia_competitiva_scraping',
    name: 'Inteligencia Competitiva & Scraping',
    subtitle:
      'Extracción automatizada de datos de mercado y análisis de competencia para posicionamiento estratégico',
    description:
      'Automatizamos la recolección de datos de mercado, precios, competidores y tendencias del sector. Generamos datasets estructurados y dashboards de inteligencia competitiva para tomar decisiones de posicionamiento con información actualizada.',
    problemSolved:
      'Desconocimiento de los movimientos de la competencia, dificultad para monitorear precios del mercado, necesidad de datasets estructurados del sector y falta de información para decisiones estratégicas.',
    methodology: ['diagnosis', 'architecture', 'deployment'],
    includedServiceSlugs: [
      'competitive_scraping',
      'competitor_monitoring',
      'price_monitoring',
      'structured_dataset',
      'competitive_dashboard',
    ],
    minCoverageForConfidence: 40,
    priceMin: 800,
    priceMax: 2800,
    timelineMinWeeks: 3,
    timelineMaxWeeks: 8,
    supportIncluded:
      'Monitoreo post-implementación continuo + actualización periódica de datos',
    guarantee: 'Garantía de Optimización Operativa 30 días',
    officialUrl: OFFICIAL_URL,
    catalogVersion: CATALOG_VERSION,
  },

  auditoria_conversion_digital: {
    slug: 'auditoria_conversion_digital',
    name: 'Auditoría de Conversión Digital',
    subtitle:
      'Optimización técnica de activos digitales para maximizar la captación y conversión de clientes',
    description:
      'Auditamos y mejoramos todos los activos digitales del negocio: sitio web, Google Business, redes sociales, formularios y funnels de captación. El objetivo es que cada canal digital trabaje activamente para atraer y convertir clientes potenciales.',
    problemSolved:
      'Presencia digital débil, baja visibilidad en Google, sitio web sin capacidad de conversión, ausencia de captura de leads, gestión deficiente de reseñas y funnels digitales que no convierten.',
    methodology: ['diagnosis', 'architecture', 'deployment'],
    includedServiceSlugs: [
      'digital_presence_audit',
      'lead_capture_funnel',
      'website_development',
      'google_business_setup',
      'review_management',
      'social_media_presence',
    ],
    minCoverageForConfidence: 40,
    priceMin: 650,
    priceMax: 2500,
    timelineMinWeeks: 3,
    timelineMaxWeeks: 8,
    supportIncluded:
      'Monitoreo post-implementación continuo + soporte técnico + ajustes en los primeros 30 días',
    guarantee: 'Garantía de Optimización Operativa 30 días',
    officialUrl: OFFICIAL_URL,
    catalogVersion: CATALOG_VERSION,
  },
}

export function getPackage(slug: PackageSlug): KronosPackage {
  return KRONOS_PACKAGES[slug]
}

export function formatPackagePrice(pkg: KronosPackage): string {
  if (pkg.priceMin === 0 && pkg.priceMax === 0) return 'Gratuito'
  return `$${pkg.priceMin.toLocaleString()} – $${pkg.priceMax.toLocaleString()} USD`
}

export function formatPackageTimeline(pkg: KronosPackage): string {
  if (pkg.timelineMinWeeks === pkg.timelineMaxWeeks) {
    return `${pkg.timelineMinWeeks} semana${pkg.timelineMinWeeks > 1 ? 's' : ''}`
  }
  return `${pkg.timelineMinWeeks}–${pkg.timelineMaxWeeks} semanas`
}
