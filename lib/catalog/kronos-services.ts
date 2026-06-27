// Canonical individual services catalog for Kronos Lead Intelligence.
// These are components offered within or independently of official packages.
// Technologies (n8n, Python, SQL, etc.) are implementation details — never product names.

import type { SignalFlags } from '../types'

export type ServiceCategory =
  | 'operaciones'
  | 'conversion_digital'
  | 'datos'
  | 'inteligencia_competitiva'
  | 'transversal'

export interface IndividualService {
  slug: string
  name: string
  category: ServiceCategory
  description: string
  difficulty: 'low' | 'medium' | 'high'
  timeEstimate: string
  priceMin: number
  priceMax: number
  parentPackageSlugs: string[]
  signalTriggers?: (keyof SignalFlags)[]
}

export const INDIVIDUAL_SERVICES: Record<string, IndividualService> = {
  // ─── OPERACIONES Y AUTOMATIZACIÓN ────────────────────────────────────────────
  whatsapp_automation: {
    slug: 'whatsapp_automation',
    name: 'Automatización de WhatsApp',
    category: 'operaciones',
    description:
      'Respuestas automáticas, calificación de leads y secuencias de seguimiento por WhatsApp. El negocio responde al instante, 24/7.',
    difficulty: 'low',
    timeEstimate: '1–2 semanas',
    priceMin: 350,
    priceMax: 900,
    parentPackageSlugs: ['sistemas_operaciones_autonomas'],
    signalTriggers: ['signalWeakFollowup', 'signalSlowResponse'],
  },
  crm_followup_automation: {
    slug: 'crm_followup_automation',
    name: 'CRM y Automatización de Seguimiento',
    category: 'operaciones',
    description:
      'Implementación de CRM con flujos automáticos de seguimiento. Ningún lead se pierde por falta de contacto oportuno.',
    difficulty: 'medium',
    timeEstimate: '3–5 semanas',
    priceMin: 500,
    priceMax: 1400,
    parentPackageSlugs: ['sistemas_operaciones_autonomas'],
    signalTriggers: ['signalWeakFollowup', 'signalManualWork'],
  },
  appointment_booking: {
    slug: 'appointment_booking',
    name: 'Sistema de Reservas y Citas',
    category: 'operaciones',
    description:
      'Sistema online de reservas con confirmación automática, recordatorios y sincronización de agenda. Elimina la gestión manual de citas.',
    difficulty: 'medium',
    timeEstimate: '2–3 semanas',
    priceMin: 350,
    priceMax: 900,
    parentPackageSlugs: ['sistemas_operaciones_autonomas'],
    signalTriggers: ['signalManualWork'],
  },
  sales_process_automation: {
    slug: 'sales_process_automation',
    name: 'Automatización de Procesos Comerciales',
    category: 'operaciones',
    description:
      'Automatización del proceso de ventas completo: calificación, propuestas, seguimiento y cierre. El equipo comercial enfocado en cerrar, no en administrar.',
    difficulty: 'high',
    timeEstimate: '4–8 semanas',
    priceMin: 900,
    priceMax: 2500,
    parentPackageSlugs: ['sistemas_operaciones_autonomas'],
    signalTriggers: ['signalSlowResponse', 'signalWeakFollowup', 'signalManualWork'],
  },
  integrations_flows: {
    slug: 'integrations_flows',
    name: 'Integraciones y Flujos Automatizados',
    category: 'operaciones',
    description:
      'Conexión entre herramientas y sistemas del negocio para que la información fluya automáticamente sin intervención manual.',
    difficulty: 'medium',
    timeEstimate: '2–4 semanas',
    priceMin: 400,
    priceMax: 1200,
    parentPackageSlugs: ['sistemas_operaciones_autonomas'],
    signalTriggers: ['signalManualWork'],
  },

  // ─── CONVERSIÓN DIGITAL ──────────────────────────────────────────────────────
  digital_presence_audit: {
    slug: 'digital_presence_audit',
    name: 'Diagnóstico de Presencia Digital',
    category: 'conversion_digital',
    description:
      'Revisión del estado actual de la presencia digital del negocio: sitio web, perfiles, visibilidad en buscadores y canales de contacto. Identifica las prioridades de mejora con datos concretos.',
    difficulty: 'low',
    timeEstimate: '1 semana',
    priceMin: 150,
    priceMax: 350,
    parentPackageSlugs: ['auditoria_gratuita', 'auditoria_conversion_digital'],
    signalTriggers: ['signalWeakOnlinePresence'],
  },
  lead_capture_funnel: {
    slug: 'lead_capture_funnel',
    name: 'Funnel de Captura de Leads',
    category: 'conversion_digital',
    description:
      'Diseño e implementación de un funnel de captación: landing page, formularios, CTA optimizados y flujo de bienvenida automático para convertir visitas en contactos calificados.',
    difficulty: 'medium',
    timeEstimate: '2–3 semanas',
    priceMin: 450,
    priceMax: 1100,
    parentPackageSlugs: ['auditoria_conversion_digital'],
    signalTriggers: ['signalHasLeadCapture', 'signalHasClearCta', 'signalHasContactForm'],
  },
  website_development: {
    slug: 'website_development',
    name: 'Desarrollo u Optimización de Sitio Web',
    category: 'conversion_digital',
    description:
      'Desarrollo o mejora del sitio web del negocio con foco en conversión: velocidad, SEO técnico, CTAs claros y captura de leads integrada.',
    difficulty: 'high',
    timeEstimate: '6–10 semanas',
    priceMin: 650,
    priceMax: 1800,
    parentPackageSlugs: ['auditoria_conversion_digital'],
    signalTriggers: ['signalHasWebsite'],
  },
  google_business_setup: {
    slug: 'google_business_setup',
    name: 'Configuración y Optimización de Google Business',
    category: 'conversion_digital',
    description:
      'Configuración completa y optimización del perfil de Google Business: información actualizada, fotos, categorías correctas, publicaciones y estrategia para aparecer en las búsquedas locales relevantes.',
    difficulty: 'low',
    timeEstimate: '1 semana',
    priceMin: 120,
    priceMax: 300,
    parentPackageSlugs: ['auditoria_conversion_digital'],
    signalTriggers: ['signalHasGoogleBusiness'],
  },
  review_management: {
    slug: 'review_management',
    name: 'Gestión de Reseñas',
    category: 'conversion_digital',
    description:
      'Sistema de monitoreo y respuesta a reseñas en Google y otras plataformas. Estrategia para generar reseñas positivas y gestionar las negativas profesionalmente.',
    difficulty: 'low',
    timeEstimate: '1–2 semanas',
    priceMin: 150,
    priceMax: 350,
    parentPackageSlugs: ['auditoria_conversion_digital'],
    signalTriggers: ['signalHasUnansweredReviews'],
  },
  social_media_presence: {
    slug: 'social_media_presence',
    name: 'Optimización de Presencia en Redes Sociales',
    category: 'conversion_digital',
    description:
      'Optimización del perfil, estrategia de contenido y consistencia de marca en redes sociales relevantes para el negocio y su sector.',
    difficulty: 'medium',
    timeEstimate: '3–4 semanas',
    priceMin: 300,
    priceMax: 800,
    parentPackageSlugs: ['auditoria_conversion_digital'],
    signalTriggers: ['signalHasInstagram', 'signalWeakOnlinePresence'],
  },

  // ─── DATOS ───────────────────────────────────────────────────────────────────
  data_architecture: {
    slug: 'data_architecture',
    name: 'Arquitectura de Datos',
    category: 'datos',
    description:
      'Diseño e implementación de la infraestructura de datos del negocio: modelado, pipelines de datos y bases de datos estructuradas para soportar el crecimiento.',
    difficulty: 'high',
    timeEstimate: '4–8 semanas',
    priceMin: 900,
    priceMax: 2500,
    parentPackageSlugs: ['arquitectura_datos_dashboards'],
  },
  dashboards_kpi: {
    slug: 'dashboards_kpi',
    name: 'Dashboards e Indicadores de Gestión',
    category: 'datos',
    description:
      'Construcción de dashboards interactivos con los KPIs clave del negocio. Información actualizada en tiempo real para que la dirección tome decisiones con datos.',
    difficulty: 'medium',
    timeEstimate: '3–6 semanas',
    priceMin: 650,
    priceMax: 1800,
    parentPackageSlugs: ['arquitectura_datos_dashboards'],
  },
  data_consolidation: {
    slug: 'data_consolidation',
    name: 'Consolidación y Limpieza de Datos',
    category: 'datos',
    description:
      'Unificación de fuentes de datos dispersas (Excel, hojas, sistemas) en una única fuente de verdad limpia y estructurada.',
    difficulty: 'medium',
    timeEstimate: '2–4 semanas',
    priceMin: 500,
    priceMax: 1500,
    parentPackageSlugs: ['arquitectura_datos_dashboards'],
  },
  report_automation: {
    slug: 'report_automation',
    name: 'Automatización de Reportes',
    category: 'datos',
    description:
      'Automatización de reportes periódicos (diarios, semanales, mensuales) que se generan y distribuyen automáticamente sin intervención manual.',
    difficulty: 'medium',
    timeEstimate: '2–3 semanas',
    priceMin: 400,
    priceMax: 1200,
    parentPackageSlugs: ['arquitectura_datos_dashboards'],
  },

  // ─── INTELIGENCIA COMPETITIVA ─────────────────────────────────────────────────
  competitive_scraping: {
    slug: 'competitive_scraping',
    name: 'Scraping y Extracción de Datos',
    category: 'inteligencia_competitiva',
    description:
      'Extracción automatizada de datos públicos de mercado: competidores, precios, ofertas, reseñas y tendencias del sector.',
    difficulty: 'high',
    timeEstimate: '3–6 semanas',
    priceMin: 600,
    priceMax: 1800,
    parentPackageSlugs: ['inteligencia_competitiva_scraping'],
  },
  competitor_monitoring: {
    slug: 'competitor_monitoring',
    name: 'Monitoreo de Competidores',
    category: 'inteligencia_competitiva',
    description:
      'Sistema automatizado de seguimiento de competidores: cambios en precios, ofertas, presencia digital y movimientos estratégicos.',
    difficulty: 'medium',
    timeEstimate: '2–4 semanas',
    priceMin: 400,
    priceMax: 1200,
    parentPackageSlugs: ['inteligencia_competitiva_scraping'],
  },
  price_monitoring: {
    slug: 'price_monitoring',
    name: 'Monitoreo de Precios y Oferta',
    category: 'inteligencia_competitiva',
    description:
      'Seguimiento automático de precios del mercado y variaciones de oferta para mantener una estrategia de pricing competitiva.',
    difficulty: 'medium',
    timeEstimate: '2–3 semanas',
    priceMin: 350,
    priceMax: 1000,
    parentPackageSlugs: ['inteligencia_competitiva_scraping'],
  },
  structured_dataset: {
    slug: 'structured_dataset',
    name: 'Dataset Estructurado',
    category: 'inteligencia_competitiva',
    description:
      'Generación de datasets limpios y estructurados con información del mercado, sector o competencia para análisis estratégico.',
    difficulty: 'high',
    timeEstimate: '3–5 semanas',
    priceMin: 500,
    priceMax: 1600,
    parentPackageSlugs: ['inteligencia_competitiva_scraping'],
  },
  competitive_dashboard: {
    slug: 'competitive_dashboard',
    name: 'Dashboard Competitivo',
    category: 'inteligencia_competitiva',
    description:
      'Dashboard de inteligencia de mercado con información de competidores, precios y tendencias actualizado automáticamente.',
    difficulty: 'medium',
    timeEstimate: '2–4 semanas',
    priceMin: 500,
    priceMax: 1500,
    parentPackageSlugs: ['inteligencia_competitiva_scraping'],
  },

  // ─── TRANSVERSALES ────────────────────────────────────────────────────────────
  diagnosis_free: {
    slug: 'diagnosis_free',
    name: 'Diagnóstico Gratuito',
    category: 'transversal',
    description:
      'Reunión inicial para entender los procesos y objetivos del negocio. Identificamos las oportunidades más relevantes sin compromiso.',
    difficulty: 'low',
    timeEstimate: '1 semana',
    priceMin: 0,
    priceMax: 0,
    parentPackageSlugs: ['auditoria_gratuita'],
  },
  solution_architecture: {
    slug: 'solution_architecture',
    name: 'Arquitectura de Solución',
    category: 'transversal',
    description:
      'Diseño técnico detallado de la solución: componentes, flujos, integraciones y plan de implementación personalizado.',
    difficulty: 'medium',
    timeEstimate: '1–2 semanas',
    priceMin: 250,
    priceMax: 650,
    parentPackageSlugs: [
      'sistemas_operaciones_autonomas',
      'arquitectura_datos_dashboards',
      'inteligencia_competitiva_scraping',
      'auditoria_conversion_digital',
    ],
  },
  implementation_deployment: {
    slug: 'implementation_deployment',
    name: 'Implementación y Despliegue',
    category: 'transversal',
    description:
      'Implementación técnica completa de la solución diseñada, pruebas y despliegue en el entorno productivo del cliente.',
    difficulty: 'high',
    timeEstimate: 'Según alcance',
    priceMin: 0,
    priceMax: 0,
    parentPackageSlugs: [
      'sistemas_operaciones_autonomas',
      'arquitectura_datos_dashboards',
      'inteligencia_competitiva_scraping',
      'auditoria_conversion_digital',
    ],
  },
  training: {
    slug: 'training',
    name: 'Capacitación',
    category: 'transversal',
    description:
      'Sesiones de capacitación para el equipo del cliente sobre las herramientas y procesos implementados. Incluido en todos los paquetes.',
    difficulty: 'low',
    timeEstimate: '1 semana',
    priceMin: 0,
    priceMax: 0,
    parentPackageSlugs: [
      'sistemas_operaciones_autonomas',
      'arquitectura_datos_dashboards',
      'inteligencia_competitiva_scraping',
      'auditoria_conversion_digital',
    ],
  },
  post_impl_support: {
    slug: 'post_impl_support',
    name: 'Soporte Post-implementación',
    category: 'transversal',
    description:
      'Monitoreo continuo, ajustes y soporte técnico tras la implementación. Garantía de Optimización Operativa en los primeros 30 días.',
    difficulty: 'low',
    timeEstimate: 'Continuo',
    priceMin: 0,
    priceMax: 0,
    parentPackageSlugs: [
      'sistemas_operaciones_autonomas',
      'arquitectura_datos_dashboards',
      'inteligencia_competitiva_scraping',
      'auditoria_conversion_digital',
    ],
  },
  roi_tracking: {
    slug: 'roi_tracking',
    name: 'Seguimiento de ROI',
    category: 'transversal',
    description:
      'Monitoreo y reportes de retorno sobre la inversión de las soluciones implementadas. Métricas de impacto y mejora continua.',
    difficulty: 'low',
    timeEstimate: 'Continuo',
    priceMin: 0,
    priceMax: 0,
    parentPackageSlugs: [
      'sistemas_operaciones_autonomas',
      'arquitectura_datos_dashboards',
      'inteligencia_competitiva_scraping',
      'auditoria_conversion_digital',
    ],
  },
}

export function getService(slug: string): IndividualService | undefined {
  return INDIVIDUAL_SERVICES[slug]
}

export function getServicesByCategory(category: ServiceCategory): IndividualService[] {
  return Object.values(INDIVIDUAL_SERVICES).filter((s) => s.category === category)
}

export function getServicesByPackage(packageSlug: string): IndividualService[] {
  return Object.values(INDIVIDUAL_SERVICES).filter((s) =>
    s.parentPackageSlugs.includes(packageSlug),
  )
}
