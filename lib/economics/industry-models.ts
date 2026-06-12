// Industry economic models: per-industry profiles used to estimate ROI Fit and Budget Capacity.
// All values are conservative mid-market estimates for Latin American SMBs.
// Data available at discovery time: name, industry, address, website Y/N, phone Y/N.

export type EconomicModelType =
  | 'appointment_based'    // dentists, clinics, mechanics, beauty salons, vet
  | 'quote_based'          // real estate, lawyers, construction, consulting
  | 'recurring_revenue'    // gyms, academies, SaaS-like
  | 'ecommerce_transactional' // retail, online stores
  | 'data_efficiency'      // logistics, data-heavy operations
  | 'competitive_intel'    // competitive price tracking, research
  | 'unknown'

export interface IndustryProfile {
  modelType:               EconomicModelType
  // Annual benefit potential range (USD) from Kronos services
  annualBenefitLow:        number   // conservative (bad scenario)
  annualBenefitMid:        number   // typical scenario
  annualBenefitHigh:       number   // optimistic scenario
  // Budget capacity base score (0-100) before size/signal adjustments
  budgetCapacityBase:      number
  // Primary problem Kronos can solve for this industry
  primaryProblem:          string
  // Qualifying questions to ask (for sales call prep)
  qualificationQuestions:  string[]
}

// ── Industry keyword → profile mapping ────────────────────────────────────────
// Checked in order; first match wins.

export interface IndustryModelEntry {
  keywords:   string[]
  profile:    IndustryProfile
}

export const INDUSTRY_MODEL_ENTRIES: IndustryModelEntry[] = [
  // ── Dental / Odontology ────────────────────────────────────────────────────
  {
    keywords: ['dental', 'odontolog', 'dent '],
    profile: {
      modelType:          'appointment_based',
      annualBenefitLow:   2400,    // $200/month saved in no-shows + admin
      annualBenefitMid:   9600,    // $800/month: 15% no-show reduction + automation
      annualBenefitHigh:  24000,   // $2000/month: full system + SEO leads
      budgetCapacityBase: 70,
      primaryProblem:     'Pérdida de pacientes por no-shows, falta de automatización de citas y seguimiento post-consulta',
      qualificationQuestions: [
        '¿Cuántos pacientes no se presentan en promedio por semana?',
        '¿Tienen sistema de confirmación de citas por WhatsApp o email?',
        '¿Cómo reciben pacientes nuevos actualmente?',
        '¿Gestionan reseñas y seguimiento post-cita?',
      ],
    },
  },
  // ── Clinics / Health ──────────────────────────────────────────────────────
  {
    keywords: ['clinica', 'clínica', 'medico', 'médico', 'salud', 'healthcare', 'medicina', 'laboratorio clinico'],
    profile: {
      modelType:          'appointment_based',
      annualBenefitLow:   3600,
      annualBenefitMid:   12000,
      annualBenefitHigh:  30000,
      budgetCapacityBase: 68,
      primaryProblem:     'Gestión manual de citas y resultados, sin seguimiento automatizado de pacientes',
      qualificationQuestions: [
        '¿Cuántas citas manejan por día?',
        '¿Tienen sistema de historial digital del paciente?',
        '¿Cómo notifican resultados o recordatorios?',
      ],
    },
  },
  // ── Real Estate / Inmobiliaria ─────────────────────────────────────────────
  {
    keywords: ['inmobiliaria', 'real estate', 'bienes raices', 'bienes raíces', 'inmueble', 'propiedades'],
    profile: {
      modelType:          'quote_based',
      annualBenefitLow:   4800,    // $400/month: better lead tracking
      annualBenefitMid:   18000,   // $1500/month: CRM + conversion
      annualBenefitHigh:  48000,   // $4000/month: full pipeline + reporting
      budgetCapacityBase: 75,
      primaryProblem:     'Leads perdidos sin seguimiento después del primer contacto — no hay pipeline estructurado',
      qualificationQuestions: [
        '¿Cuántos leads de consulta reciben por mes?',
        '¿Qué porcentaje de leads se convierten en visita?',
        '¿Tienen CRM o usan WhatsApp/hojas de cálculo para hacer seguimiento?',
        '¿Cuántos agentes manejan la cartera actualmente?',
      ],
    },
  },
  // ── Law Firms / Legal ─────────────────────────────────────────────────────
  {
    keywords: ['abogado', 'abogados', 'legal', 'juridico', 'jurídico', 'notaria', 'notaría', 'estudio juridico'],
    profile: {
      modelType:          'quote_based',
      annualBenefitLow:   3600,
      annualBenefitMid:   12000,
      annualBenefitHigh:  30000,
      budgetCapacityBase: 72,
      primaryProblem:     'Sin sistema de intake digital — leads consultados por WhatsApp sin seguimiento formal',
      qualificationQuestions: [
        '¿Cuántas consultas iniciales reciben por semana?',
        '¿Tienen proceso definido de calificación de cliente?',
        '¿Cómo hacen seguimiento a prospectos que no contratan de inmediato?',
      ],
    },
  },
  // ── Private Construction ───────────────────────────────────────────────────
  // (Note: infrastructure/public projects are filtered by entity-classifier before this)
  {
    keywords: ['constructora', 'construccion privada', 'contratista', 'remodelacion', 'remodelación', 'acabados', 'obra privada'],
    profile: {
      modelType:          'quote_based',
      annualBenefitLow:   2400,
      annualBenefitMid:   9600,
      annualBenefitHigh:  24000,
      budgetCapacityBase: 62,
      primaryProblem:     'Sin dashboards de proyectos ni control de costos en tiempo real — gestión por planillas',
      qualificationQuestions: [
        '¿Cuántos proyectos activos manejan simultáneamente?',
        '¿Cómo hacen seguimiento de avance y costos por proyecto?',
        '¿Usan algún software de gestión o todo manual?',
      ],
    },
  },
  // ── Automotive / Auto Repair ──────────────────────────────────────────────
  {
    keywords: ['automotriz', 'taller', 'mecanico', 'mecánico', 'servicio automotriz', 'taller mecanico'],
    profile: {
      modelType:          'appointment_based',
      annualBenefitLow:   1800,
      annualBenefitMid:   7200,
      annualBenefitHigh:  18000,
      budgetCapacityBase: 58,
      primaryProblem:     'Sin sistema de citas ni seguimiento post-servicio — clientes se van al competidor más organizado',
      qualificationQuestions: [
        '¿Cuántos vehículos atienden por semana?',
        '¿Contactan al cliente después del servicio para mantenimiento preventivo?',
        '¿Tienen manera de recordar la próxima cita de mantenimiento?',
      ],
    },
  },
  // ── Restaurant / Food Service ──────────────────────────────────────────────
  {
    keywords: ['restaurant', 'restaurante', 'comida', 'gastronomia', 'gastronomía', 'cafeteria', 'cafetería', 'bar ', 'cantina'],
    profile: {
      modelType:          'appointment_based',
      annualBenefitLow:   1200,
      annualBenefitMid:   4800,
      annualBenefitHigh:  12000,
      budgetCapacityBase: 42,
      primaryProblem:     'Sin reservas online ni sistema de fidelización — dependen de llamadas y walk-ins',
      qualificationQuestions: [
        '¿Manejan reservas? ¿Cómo?',
        '¿Tienen canal de pedidos/delivery propio o solo usan apps externas?',
        '¿Tienen base de datos de clientes frecuentes?',
      ],
    },
  },
  // ── Gym / Sports Academy ──────────────────────────────────────────────────
  {
    keywords: ['gym', 'gimnasio', 'academia de', 'academia deportiva', 'fitness', 'crossfit', 'pilates', 'yoga'],
    profile: {
      modelType:          'recurring_revenue',
      annualBenefitLow:   1800,
      annualBenefitMid:   7200,
      annualBenefitHigh:  18000,
      budgetCapacityBase: 55,
      primaryProblem:     'Alta tasa de abandono de membresías sin sistema de retención ni seguimiento automático',
      qualificationQuestions: [
        '¿Cuántos miembros activos tienen?',
        '¿Cuál es su tasa de churn mensual aproximada?',
        '¿Tienen sistema de cobro y renovación automático?',
      ],
    },
  },
  // ── Beauty / Spa / Salon ──────────────────────────────────────────────────
  {
    keywords: ['estetica', 'estética', 'salon', 'salón', 'spa', 'belleza', 'peluqueria', 'peluquería', 'barberia', 'barbería'],
    profile: {
      modelType:          'appointment_based',
      annualBenefitLow:   1200,
      annualBenefitMid:   4800,
      annualBenefitHigh:  12000,
      budgetCapacityBase: 48,
      primaryProblem:     'Agenda manual con alta tasa de no-shows y sin recordatorios automáticos',
      qualificationQuestions: [
        '¿Cuántas citas al día en promedio?',
        '¿Usan alguna app de reservas o todo por WhatsApp?',
        '¿Cuántos clientes no se presentan sin avisar cada semana?',
      ],
    },
  },
  // ── Veterinary ────────────────────────────────────────────────────────────
  {
    keywords: ['veterinaria', 'veterinario', 'vet '],
    profile: {
      modelType:          'appointment_based',
      annualBenefitLow:   1200,
      annualBenefitMid:   4800,
      annualBenefitHigh:  12000,
      budgetCapacityBase: 55,
      primaryProblem:     'Sin recordatorios de vacunas y desparasitaciones — pierden clientes por falta de seguimiento',
      qualificationQuestions: [
        '¿Cuántos pacientes activos tienen en su base?',
        '¿Envían recordatorios de citas de vacunación?',
        '¿Tienen historial digital por mascota?',
      ],
    },
  },
  // ── Retail / Store ────────────────────────────────────────────────────────
  {
    keywords: ['retail', 'tienda', 'comercio', 'venta', 'ferreteria', 'ferretería', 'ropa', 'moda'],
    profile: {
      modelType:          'ecommerce_transactional',
      annualBenefitLow:   1800,
      annualBenefitMid:   7200,
      annualBenefitHigh:  18000,
      budgetCapacityBase: 48,
      primaryProblem:     'Sin presencia digital ni tienda online — pierden ventas frente a competidores con e-commerce',
      qualificationQuestions: [
        '¿Venden por algún canal digital actualmente?',
        '¿Cuántas ventas por mes hacen en total?',
        '¿Tienen catálogo de productos digitalizado?',
      ],
    },
  },
  // ── Consulting / Agency ───────────────────────────────────────────────────
  {
    keywords: ['consultor', 'consultoria', 'consultoría', 'agencia', 'marketing', 'publicidad'],
    profile: {
      modelType:          'quote_based',
      annualBenefitLow:   3600,
      annualBenefitMid:   12000,
      annualBenefitHigh:  30000,
      budgetCapacityBase: 68,
      primaryProblem:     'Sin pipeline estructurado ni reporting de resultados — pérdida de leads en etapas intermedias',
      qualificationQuestions: [
        '¿Cuántos proyectos nuevos cierran por mes?',
        '¿Tienen proceso formal de propuesta y seguimiento?',
        '¿Usan algún CRM o todo en planillas?',
      ],
    },
  },
  // ── Logistics / Transport ─────────────────────────────────────────────────
  {
    keywords: ['logistica', 'logística', 'transporte', 'envios', 'envíos', 'courier', 'carga'],
    profile: {
      modelType:          'data_efficiency',
      annualBenefitLow:   2400,
      annualBenefitMid:   9600,
      annualBenefitHigh:  24000,
      budgetCapacityBase: 58,
      primaryProblem:     'Sin visibilidad de rutas en tiempo real ni dashboards de eficiencia operativa',
      qualificationQuestions: [
        '¿Cuántos envíos o rutas manejan por día?',
        '¿Cómo hacen el seguimiento de entregas actualmente?',
        '¿Tienen KPIs de eficiencia medidos?',
      ],
    },
  },
  // ── Education / Private Academy ───────────────────────────────────────────
  {
    keywords: ['educacion', 'educación', 'academia', 'instituto privado', 'colegio privado', 'escuela privada'],
    profile: {
      modelType:          'recurring_revenue',
      annualBenefitLow:   1800,
      annualBenefitMid:   6000,
      annualBenefitHigh:  15000,
      budgetCapacityBase: 52,
      primaryProblem:     'Sin sistema de inscripción digital ni comunicación automatizada con padres/alumnos',
      qualificationQuestions: [
        '¿Cuántos alumnos activos tienen?',
        '¿Cómo comunican noticias y eventos a los padres?',
        '¿Tienen proceso digital de inscripción?',
      ],
    },
  },
  // ── Finance / Insurance ───────────────────────────────────────────────────
  {
    keywords: ['financier', 'fintech', 'seguros', 'seguro', 'aseguradora', 'brokerage', 'credito', 'crédito'],
    profile: {
      modelType:          'quote_based',
      annualBenefitLow:   4800,
      annualBenefitMid:   18000,
      annualBenefitHigh:  48000,
      budgetCapacityBase: 78,
      primaryProblem:     'Sin proceso digital de calificación de prospectos ni seguimiento automatizado de cotizaciones',
      qualificationQuestions: [
        '¿Cuántos leads de cotización reciben por semana?',
        '¿Cuánto tarda en promedio cerrar una póliza/crédito?',
        '¿Tienen pipeline de seguimiento o trabajan por referidos únicamente?',
      ],
    },
  },
]

// ── Lookup function ────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

export const DEFAULT_INDUSTRY_PROFILE: IndustryProfile = {
  modelType:          'unknown',
  annualBenefitLow:   1200,
  annualBenefitMid:   4800,
  annualBenefitHigh:  12000,
  budgetCapacityBase: 45,
  primaryProblem:     'Oportunidades de digitalización y automatización de procesos comerciales',
  qualificationQuestions: [
    '¿Cuál es su principal dolor operativo o comercial hoy?',
    '¿Tienen algún sistema digital de gestión de clientes?',
    '¿Qué proceso les consume más tiempo manualmente?',
  ],
}

export function getIndustryProfile(industry: string, name?: string): IndustryProfile {
  const combined = norm(`${industry} ${name ?? ''}`)
  for (const entry of INDUSTRY_MODEL_ENTRIES) {
    if (entry.keywords.some(kw => combined.includes(norm(kw)))) {
      return entry.profile
    }
  }
  return DEFAULT_INDUSTRY_PROFILE
}
