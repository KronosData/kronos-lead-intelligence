import type { Company } from './api-client'

// ─── Export ───────────────────────────────────────────────────────────────────

export function exportCompaniesCSV(companies: Company[]): void {
  const headers = [
    'name', 'industry', 'country', 'city', 'website', 'whatsapp',
    'instagram', 'linkedin', 'googleBusinessUrl', 'status', 'leadSource',
    'opportunityScore', 'priorityLevel', 'lastEvaluated',
  ]

  const rows = companies.map((c) => [
    c.name,
    c.industry,
    c.country,
    c.city ?? '',
    c.website ?? '',
    c.whatsapp ?? '',
    c.instagram ?? '',
    c.linkedin ?? '',
    c.googleBusinessUrl ?? '',
    c.status,
    c.leadSource ?? '',
    c.latestOpportunityScore,
    c.latestPriorityLevel,
    c.latestEvaluatedAt ? new Date(c.latestEvaluatedAt).toLocaleDateString() : '',
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `kronos-leads-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ─── Import ───────────────────────────────────────────────────────────────────

export interface ParsedCSVRow {
  name: string
  industry: string
  country: string
  city?: string
  website?: string
  whatsapp?: string
  instagram?: string
  linkedin?: string
  googleBusinessUrl?: string
  leadSource?: string
}

export interface CSVImportResult {
  success: number
  failed: number
  errors: string[]
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) =>
    h.trim().replace(/^"|"$/g, '').trim()
  )

  return lines.slice(1).map((line) => {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes }
      else if (char === ',' && !inQuotes) { values.push(current); current = '' }
      else { current += char }
    }
    values.push(current)

    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (values[i] ?? '').trim() })
    return row
  })
}

// Column name aliases for flexible CSV headers
const ALIASES: Record<string, string> = {
  'nombre': 'name', 'empresa': 'name', 'company': 'name',
  'industria': 'industry', 'rubro': 'industry', 'sector': 'industry',
  'pais': 'country', 'país': 'country',
  'ciudad': 'city',
  'sitio_web': 'website', 'web': 'website',
  'whatsapp_number': 'whatsapp', 'telefono': 'whatsapp',
  'fuente': 'leadSource', 'lead_source': 'leadSource', 'source': 'leadSource',
}

const VALID_COUNTRIES = [
  'peru', 'mexico', 'colombia', 'chile', 'spain',
  'argentina', 'ecuador', 'bolivia', 'uruguay', 'paraguay',
  'costa_rica', 'panama', 'guatemala', 'honduras', 'el_salvador', 'nicaragua',
]
const VALID_LEAD_SOURCES = [
  'google_maps', 'linkedin', 'instagram', 'facebook',
  'referral', 'website', 'cold_outreach', 'event', 'other',
]

function normalizeRow(raw: Record<string, string>): ParsedCSVRow | null {
  const row: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    const key = ALIASES[k.toLowerCase()] ?? k
    row[key] = v
  }

  const name = row['name']?.trim()
  const industry = row['industry']?.trim()
  const country = row['country']?.trim().toLowerCase()

  if (!name || !industry || !country) return null
  if (!VALID_COUNTRIES.includes(country)) return null

  const leadSource = row['leadSource']?.trim().toLowerCase()

  return {
    name,
    industry,
    country,
    city: row['city']?.trim() || undefined,
    website: row['website']?.trim() || undefined,
    whatsapp: row['whatsapp']?.trim() || undefined,
    instagram: row['instagram']?.trim() || undefined,
    linkedin: row['linkedin']?.trim() || undefined,
    googleBusinessUrl: row['googleBusinessUrl']?.trim() || undefined,
    leadSource: VALID_LEAD_SOURCES.includes(leadSource ?? '') ? leadSource : undefined,
  }
}

export async function importCompaniesCSV(
  file: File,
  onCreate: (row: ParsedCSVRow) => Promise<void>,
  onProgress: (done: number, total: number) => void,
): Promise<CSVImportResult> {
  const text = await file.text()
  const rawRows = parseCSV(text)
  const rows = rawRows.map(normalizeRow).filter(Boolean) as ParsedCSVRow[]

  let success = 0
  let failed = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    try {
      await onCreate(rows[i])
      success++
    } catch (err) {
      failed++
      errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    onProgress(i + 1, rows.length)
  }

  return { success, failed, errors }
}
