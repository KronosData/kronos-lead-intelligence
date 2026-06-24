import type { AuditQuestion, VisibleSymptom } from './types'

// Maps visible symptoms to audit questions for the 15-minute free audit.
// Goal: understand current state BEFORE recommending anything.

const SYMPTOM_QUESTIONS: Record<string, AuditQuestion> = {
  websiteUnreachable: {
    symptomKey: 'websiteUnreachable',
    question: '¿Están al tanto de que su sitio web no está disponible actualmente? ¿Cómo llegan los clientes a ustedes?',
    area: 'Presencia digital',
  },
  websiteMismatch: {
    symptomKey: 'websiteMismatch',
    question: '¿Cuál es la URL oficial del sitio web de la empresa?',
    area: 'Identidad digital',
  },
  signalHasWebsite: {
    symptomKey: 'signalHasWebsite',
    question: '¿Cómo consiguen actualmente sus clientes nuevos si no tienen sitio web?',
    area: 'Canales de adquisición',
  },
  signalHasWhatsapp: {
    symptomKey: 'signalHasWhatsapp',
    question: '¿Tienen un canal de mensajería directo con los clientes? ¿Cómo prefieren que los contacten?',
    area: 'Contactabilidad',
  },
  signalHasBookingSystem: {
    symptomKey: 'signalHasBookingSystem',
    question: '¿Cómo gestionan actualmente sus reservas o citas? ¿El proceso es manual o automatizado?',
    area: 'Gestión de agenda y conversión',
  },
  signalHasClearCta: {
    symptomKey: 'signalHasClearCta',
    question: '¿Cómo convierte actualmente una visita a su sitio web en una consulta, cita o venta?',
    area: 'Conversión web',
  },
  signalHasLeadCapture: {
    symptomKey: 'signalHasLeadCapture',
    question: '¿Tienen algún mecanismo para capturar datos de clientes potenciales que visitan su web pero no contactan?',
    area: 'Captación de leads',
  },
  signalHasGoogleBusiness: {
    symptomKey: 'signalHasGoogleBusiness',
    question: '¿Han reclamado y configurado su perfil de Google Business? ¿Qué tan importante es la búsqueda local para ustedes?',
    area: 'Visibilidad local',
  },
  signalHasReviews: {
    symptomKey: 'signalHasReviews',
    question: '¿Qué tan importante es la reputación en línea para el negocio? ¿Piden reseñas activamente a sus clientes?',
    area: 'Reputación digital',
  },
  signalHasUnansweredReviews: {
    symptomKey: 'signalHasUnansweredReviews',
    question: '¿Cómo gestionan actualmente las reseñas y quejas de clientes en plataformas online?',
    area: 'Gestión reputacional',
  },
  signalHasContactForm: {
    symptomKey: 'signalHasContactForm',
    question: '¿Por qué canales reciben actualmente las consultas de nuevos clientes potenciales?',
    area: 'Canales de contacto',
  },
  signalSlowResponse: {
    symptomKey: 'signalSlowResponse',
    question: '¿Cuánto tiempo tarda típicamente el equipo en responder a una consulta nueva que llega por digital?',
    area: 'Velocidad de respuesta',
  },
  signalWeakFollowup: {
    symptomKey: 'signalWeakFollowup',
    question: '¿Tienen un proceso definido para dar seguimiento a prospectos que mostraron interés pero no compraron?',
    area: 'Seguimiento comercial',
  },
  signalWeakOnlinePresence: {
    symptomKey: 'signalWeakOnlinePresence',
    question: '¿Invierten actualmente en presencia digital, o la mayoría del negocio viene por referidos y boca a boca?',
    area: 'Estrategia de captación',
  },
  signalManualWork: {
    symptomKey: 'signalManualWork',
    question: '¿Cuáles son los procesos internos que más tiempo consumen al equipo actualmente?',
    area: 'Eficiencia operativa',
  },
}

const DEFAULT_QUESTION: AuditQuestion = {
  symptomKey: 'general',
  question: '¿Cuál es el principal desafío que enfrenta el negocio para atraer o retener clientes actualmente?',
  area: 'Diagnóstico general',
}

const MAX_QUESTIONS = 4

export function generateAuditQuestions(symptoms: VisibleSymptom[]): AuditQuestion[] {
  const questions: AuditQuestion[] = []
  const seenAreas = new Set<string>()

  // Sort: high confidence first
  const sorted = [...symptoms].sort((a, b) => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
    return (order[a.confidence] ?? 2) - (order[b.confidence] ?? 2)
  })

  for (const symptom of sorted) {
    if (questions.length >= MAX_QUESTIONS) break
    const q = SYMPTOM_QUESTIONS[symptom.key]
    if (q && !seenAreas.has(q.area)) {
      questions.push(q)
      seenAreas.add(q.area)
    }
  }

  if (questions.length === 0) {
    questions.push(DEFAULT_QUESTION)
  }

  return questions
}
