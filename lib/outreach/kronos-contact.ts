export const KRONOS_CONTACT = {
  brand: 'Kronos Data',
  senderFirstName: 'Alejandro',
  senderName: 'Alejandro Briceño',
  officialUrl: 'https://www.kronosdata.tech/',
  calendlyUrl: 'https://calendly.com/alejandro-kronosdata',
  linkedinUrl: 'https://www.linkedin.com/in/alejandro-brice%C3%B1o-25363a40b/',
  whatsapp: '+51937613194',
} as const

type SignatureChannel = 'email' | 'whatsapp' | 'linkedin' | 'default'

export function calendarCta(minutes = 15): string {
  return `Si prefieres, puedes tomar un espacio de ${minutes} min aquí:\n${KRONOS_CONTACT.calendlyUrl}`
}

export function senderSignature(channel: SignatureChannel = 'default'): string {
  if (channel === 'whatsapp') {
    return `${KRONOS_CONTACT.brand}\n${KRONOS_CONTACT.officialUrl}`
  }

  if (channel === 'linkedin') {
    return `${KRONOS_CONTACT.brand}\nAgenda: ${KRONOS_CONTACT.calendlyUrl}\nWeb: ${KRONOS_CONTACT.officialUrl}`
  }

  if (channel === 'email') {
    return `${KRONOS_CONTACT.senderName}\n${KRONOS_CONTACT.brand}\nAgenda: ${KRONOS_CONTACT.calendlyUrl}\nWeb: ${KRONOS_CONTACT.officialUrl}\nLinkedIn: ${KRONOS_CONTACT.linkedinUrl}`
  }

  return `${KRONOS_CONTACT.senderFirstName} | ${KRONOS_CONTACT.brand}\nAgenda: ${KRONOS_CONTACT.calendlyUrl}\n${KRONOS_CONTACT.officialUrl}`
}
