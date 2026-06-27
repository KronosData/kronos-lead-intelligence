'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Search, Loader2, AlertCircle, CheckCircle2,
  Globe, Phone, MapPin, ExternalLink, Compass,
  ChevronDown, ChevronUp, TrendingUp, ShieldAlert, Users,
  ShieldX, DollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { INDUSTRY_SUGGESTIONS } from '@/lib/constants'
import { COUNTRY_CONFIGS } from '@/lib/locations/countries'
import { SEARCH_MODE_CONFIGS } from '@/lib/prospecting/config'
import type { DiscoveryCandidate, ImportedCompanyResult, SearchMode } from '@/lib/discovery/types'

// ── Types ──────────────────────────────────────────────────────────────────────

interface SearchMeta {
  city: string
  state: string | null
  country: string
  countryCode: string
  latitude: number
  longitude: number
  gridPoints: number
  radiusKm: number
  mode: SearchMode
  overFetched: number
  afterFilters: number
  sources: { here: boolean; osm: boolean; hereRaw: number; osmRaw: number }
  queries?: string[]
  locations?: string[]
}

interface SearchResponse {
  candidates: DiscoveryCandidate[]
  meta: SearchMeta
}

type ImportStatus = 'idle' | 'importing' | 'done'

interface CandidateImportState {
  status: 'pending' | 'importing' | 'imported' | 'duplicate' | 'failed'
  result: ImportedCompanyResult | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function commercialStateBadge(state: string | undefined) {
  switch (state) {
    case 'OFFER_AUDIT':
    case 'READY_TO_CONTACT':
      return <Badge className="bg-blue-500/100/10 text-blue-400 border-blue-500/30 text-[10px]">Auditoría</Badge>
    case 'CONTACT_READY':
      return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">Contactar</Badge>
    case 'RESEARCH_REQUIRED':
      return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">Investigar</Badge>
    case 'NURTURE':
      return <Badge className="bg-muted text-muted-foreground border-border text-[10px]">Monitorear</Badge>
    case 'DISQUALIFIED':
      return <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">Descartada</Badge>
    default:
      return null
  }
}

function icpFitBadge(score: number) {
  if (score >= 70) return <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">ICP {score}</span>
  if (score >= 50) return <span className="text-[10px] font-semibold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded">ICP {score}</span>
  if (score >= 30) return <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">ICP {score}</span>
  return <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">ICP {score}</span>
}

function contactabilityBadge(score: number) {
  if (score >= 70) return <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">📞 Contactable</span>
  if (score >= 40) return <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">📞 Parcial</span>
  return <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">📞 Difícil</span>
}

function entityBadge(entityType: string | undefined, isCommercial: boolean) {
  if (!entityType) return null
  if (!isCommercial) {
    const labels: Record<string, string> = {
      infrastructure_project: '🚧 Infraestructura pública',
      government_entity:      '🏛 Entidad gubernamental',
      healthcare_public:      '🏥 Salud pública',
      educational_public:     '🎓 Educación pública',
      nonprofit:              '📋 Sin fines de lucro',
      association:            '🤝 Asociación / Gremio',
      place_landmark:         '📍 Lugar público',
      branch_large_chain:     '🏢 Cadena multinacional',
    }
    const label = labels[entityType] ?? `⚠ ${entityType}`
    return <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">{label}</span>
  }
  return null
}

function sizeBadge(size: string | undefined) {
  switch (size) {
    case 'micro':   return <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">Micro</span>
    case 'small':   return <span className="text-[10px] font-semibold text-green-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">Pequeña</span>
    case 'medium':  return <span className="text-[10px] font-semibold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded">Mediana</span>
    case 'large':   return <span className="text-[10px] font-semibold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">Grande</span>
    default:        return null
  }
}

function importStatusBadge(c: DiscoveryCandidate, imp: CandidateImportState | undefined) {
  if (imp?.status === 'imported')   return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Importada</Badge>
  if (imp?.status === 'importing')  return <Badge className="bg-blue-500/100/10 text-blue-400 border-blue-500/30"><Loader2 className="h-3 w-3 animate-spin mr-1" />Importando</Badge>
  if (imp?.status === 'duplicate')  return <Badge className="bg-muted text-muted-foreground border-border">Ya existe</Badge>
  if (imp?.status === 'failed')     return <Badge className="bg-red-500/10 text-red-400 border-red-500/30">Error</Badge>
  if (c.alreadyExists)              return <Badge className="bg-muted text-muted-foreground border-border">Ya existe</Badge>
  if (!c.website && !c.phone)       return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/30">Sin contacto</Badge>
  if (!c.website)                   return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Sin web</Badge>
  return <Badge className="bg-blue-500/100/10 text-blue-600 border-blue-500/30">Nueva</Badge>
}

function sourceBadge(source: 'here' | 'osm') {
  return source === 'here'
    ? <span className="text-[10px] font-semibold text-purple-600 bg-purple-500/10 px-1.5 py-0.5 rounded">HERE</span>
    : <span className="text-[10px] font-semibold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">OSM</span>
}

const AUTO_DISCOVERY_QUERIES = [
  'clinicas dentales',
  'clinicas esteticas',
  'abogados',
  'inmobiliarias',
  'veterinarias',
  'spa',
  'fisioterapia',
  'taller mecanico',
]

interface DiscoverySearchTarget {
  query: string
  country: string
  city: string
  label: string
}

const SMART_DISCOVERY_PLAN: DiscoverySearchTarget[] = [
  { country: 'peru', city: 'Lima', query: 'clinicas dentales', label: 'Clínicas dentales · Lima' },
  { country: 'peru', city: 'Lima', query: 'clinicas esteticas', label: 'Clínicas estéticas · Lima' },
  { country: 'peru', city: 'Lima', query: 'inmobiliarias', label: 'Inmobiliarias · Lima' },
  { country: 'colombia', city: 'Bogotá', query: 'clinicas dentales', label: 'Clínicas dentales · Bogotá' },
  { country: 'colombia', city: 'Medellín', query: 'spa', label: 'Spa y estética · Medellín' },
  { country: 'mexico', city: 'Ciudad de México', query: 'clinicas esteticas', label: 'Clínicas estéticas · CDMX' },
  { country: 'mexico', city: 'Guadalajara', query: 'abogados', label: 'Abogados · Guadalajara' },
  { country: 'chile', city: 'Santiago', query: 'veterinarias', label: 'Veterinarias · Santiago' },
  { country: 'ecuador', city: 'Quito', query: 'fisioterapia', label: 'Fisioterapia · Quito' },
  { country: 'spain', city: 'Madrid', query: 'inmobiliarias', label: 'Inmobiliarias · Madrid' },
]

function normalizeCandidateKey(c: DiscoveryCandidate): string {
  if (c.website) {
    try {
      return new URL(c.website).hostname.replace(/^www\./, '').toLowerCase()
    } catch {
      return c.website.toLowerCase().replace(/^https?:\/\/(www\.)?/, '')
    }
  }

  return `${c.name}|${c.country}|${c.city}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function mergeCandidates(groups: DiscoveryCandidate[][], limit: number): DiscoveryCandidate[] {
  const byKey = new Map<string, DiscoveryCandidate>()

  for (const group of groups) {
    for (const candidate of group) {
      const key = normalizeCandidateKey(candidate)
      const previous = byKey.get(key)
      if (
        !previous ||
        candidate.salesQualificationScore > previous.salesQualificationScore ||
        (
          candidate.salesQualificationScore === previous.salesQualificationScore &&
          candidate.prospectFitScore > previous.prospectFitScore
        )
      ) {
        byKey.set(key, candidate)
      }
    }
  }

  return [...byKey.values()]
    .sort((a, b) =>
      b.salesQualificationScore - a.salesQualificationScore ||
      b.prospectFitScore - a.prospectFitScore ||
      b.contactabilityScore - a.contactabilityScore
    )
    .slice(0, limit)
    .map((candidate, i) => ({ ...candidate, rankAfterReranking: i + 1 }))
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  // Core form
  const [query,    setQuery]    = useState('')
  const [city,     setCity]     = useState('')
  const [country,  setCountry]  = useState('')
  const [district, setDistrict] = useState('')
  const [limit,    setLimit]    = useState('20')
  const [mode,     setMode]     = useState<SearchMode>('sellable')

  // Advanced filters
  const [showFilters,            setShowFilters]            = useState(false)
  const [radiusKm,               setRadiusKm]               = useState('5')
  const [excludeChains,          setExcludeChains]          = useState<boolean | undefined>(undefined)
  const [excludeLarge,           setExcludeLarge]           = useState<boolean | undefined>(undefined)
  const [requireContact,         setRequireContact]         = useState<boolean | undefined>(undefined)
  const [minProspectFitScore,    setMinProspectFitScore]    = useState('')
  // Phase 3.9 filters (active by default)
  const [privateBusiness,        setPrivateBusiness]        = useState(true)
  const [excludePublicProjects,  setExcludePublicProjects]  = useState(true)
  const [minSalesQualScore,      setMinSalesQualScore]      = useState('')

  // Results
  const [searching,   setSearching]   = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchProgress, setSearchProgress] = useState('')
  const [candidates,  setCandidates]  = useState<DiscoveryCandidate[]>([])
  const [meta,        setMeta]        = useState<SearchMeta | null>(null)

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Import
  const [importStatus,  setImportStatus]  = useState<ImportStatus>('idle')
  const [importStates,  setImportStates]  = useState<Record<string, CandidateImportState>>({})
  const [importSummary, setImportSummary] = useState<{ imported: number; duplicate: number; failed: number } | null>(null)

  // Resolve selected country config for city datalist
  const selectedCountryConfig = COUNTRY_CONFIGS.find(c => c.value === country)

  // ── Search ──────────────────────────────────────────────────────────────────

  function buildSearchTargets(): DiscoverySearchTarget[] {
    const trimmedQuery = query.trim()
    const selectedCity = city.trim()
    const fallbackCity = selectedCountryConfig?.cities[0] ?? ''
    const effectiveCity = selectedCity || fallbackCity

    if (country && effectiveCity) {
      const terms = trimmedQuery ? [trimmedQuery] : AUTO_DISCOVERY_QUERIES
      return terms.map(term => ({
        query: term,
        country,
        city: effectiveCity,
        label: `${term} · ${effectiveCity}`,
      }))
    }

    if (trimmedQuery) {
      return SMART_DISCOVERY_PLAN.map(target => ({
        ...target,
        query: trimmedQuery,
        label: `${trimmedQuery} · ${target.city}`,
      }))
    }

    return SMART_DISCOVERY_PLAN
  }

  function buildPayload(target: DiscoverySearchTarget, resultLimit: number): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      query:   target.query,
      city:    target.city,
      country: target.country,
      limit:   resultLimit,
      mode,
      radiusKm: Number(radiusKm),
      privateBusiness,
      excludePublicProjects,
    }
    if (district.trim() && country && city.trim()) payload.district = district.trim()
    if (excludeChains !== undefined)  payload.excludeChains        = excludeChains
    if (excludeLarge  !== undefined)  payload.excludeLarge         = excludeLarge
    if (requireContact !== undefined) payload.requireContact       = requireContact
    if (minProspectFitScore !== '')   payload.minProspectFitScore  = Number(minProspectFitScore)
    if (minSalesQualScore   !== '')   payload.minSalesQualScore    = Number(minSalesQualScore)
    return payload
  }

  async function runDiscovery(target: DiscoverySearchTarget, resultLimit: number): Promise<SearchResponse> {
    const res = await fetch('/api/discovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(target, resultLimit)),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(data.error ?? `HTTP ${res.status}`)
    }
    return res.json() as Promise<SearchResponse>
  }

  async function handleSearch() {
    setSearchError('')
    setSearchProgress('')
    setSearching(true)
    setCandidates([])
    setSelected(new Set())
    setImportStates({})
    setImportSummary(null)
    setMeta(null)

    const requestedLimit = Number(limit)
    const targets = buildSearchTargets()
    const perTargetLimit = targets.length > 1 ? 8 : requestedLimit

    try {
      const responses: SearchResponse[] = []
      const errors: string[] = []

      for (let i = 0; i < targets.length; i++) {
        const target = targets[i]
        setSearchProgress(targets.length > 1 ? `Buscando ${i + 1}/${targets.length}: ${target.label}` : '')
        try {
          responses.push(await runDiscovery(target, perTargetLimit))
        } catch (e) {
          errors.push(`${target.label}: ${e instanceof Error ? e.message : 'error'}`)
        }
      }

      if (responses.length === 0) throw new Error(errors[0] ?? 'No se pudo buscar empresas')

      const merged = mergeCandidates(responses.map(r => r.candidates), requestedLimit)
      const firstMeta = responses[0].meta
      setCandidates(merged)
      setMeta({
        ...firstMeta,
        city: targets.length > 1 && !country ? 'Varias ciudades' : firstMeta.city,
        state: targets.length > 1 && !country ? null : firstMeta.state,
        country: targets.length > 1 && !country ? 'LATAM / España' : firstMeta.country,
        countryCode: targets.length > 1 && !country ? 'MIX' : firstMeta.countryCode,
        overFetched: responses.reduce((sum, r) => sum + r.meta.overFetched, 0),
        afterFilters: merged.length,
        sources: {
          here: responses.some(r => r.meta.sources.here),
          osm: true,
          hereRaw: responses.reduce((sum, r) => sum + r.meta.sources.hereRaw, 0),
          osmRaw: responses.reduce((sum, r) => sum + r.meta.sources.osmRaw, 0),
        },
        queries: [...new Set(targets.map(target => target.query))],
        locations: [...new Set(targets.map(target => `${target.city}, ${target.country}`))],
      })
      if (errors.length > 0) {
        setSearchError(`Algunas búsquedas no respondieron (${errors.length}). Se muestran los resultados disponibles.`)
      }
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Error al buscar empresas')
    } finally {
      setSearchProgress('')
      setSearching(false)
    }
  }

  // ── Selection ───────────────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function isImportable(c: DiscoveryCandidate): boolean {
    const s = importStates[c.externalId]
    return !s || s.status === 'pending' || s.status === 'failed'
  }

  function toggleSelectAll() {
    const importable = candidates.filter(c => !c.alreadyExists && isImportable(c))
    if (selected.size === importable.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(importable.map(c => c.externalId)))
    }
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async function handleImport() {
    if (selected.size === 0) return
    setImportStatus('importing')
    setImportSummary(null)

    const toImport = candidates.filter(c => selected.has(c.externalId))
    let imported = 0, duplicate = 0, failed = 0

    for (const c of toImport) {
      setImportStates(prev => ({ ...prev, [c.externalId]: { status: 'importing', result: null } }))
      try {
        const res = await fetch('/api/discovery/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            externalId:             c.externalId,
            name:                   c.name,
            industry:               c.industry,
            country:                c.country,
            city:                   c.city,
            address:                c.address,
            website:                c.website,
            phone:                  c.phone,
            googleBusinessUrl:      c.googleBusinessUrl,
            source:                 c.source,
            // Phase 3.8 — prospect fields
            prospectFitScore:       c.prospectFitScore,
            estimatedBusinessSize:  c.estimatedBusinessSize,
            businessSizeConfidence: c.businessSizeConfidence,
            chainDetected:          c.chainDetected,
            prospectProfile:        c.prospectProfile,
            contactabilityScore:    c.contactabilityScore,
            opportunityReasons:     c.opportunityReasons,
            prospectRisks:          c.prospectRisks,
            discoverySearchCountry: meta?.countryCode === 'MIX' ? c.country : meta?.countryCode ?? c.country,
            discoverySearchCity:    meta?.city === 'Varias ciudades' ? c.city : meta?.city ?? c.city,
            discoveryMode:          meta?.mode ?? mode,
            discoveryRankBefore:    c.rankBeforeReranking,
            discoveryRankAfter:     c.rankAfterReranking,
            // Phase 3.9 — commercial qualification
            entityType:             c.entityType,
            entityIsCommercial:     c.entityIsCommercial,
            entityExclusionReason:  c.entityExclusionReason,
            commercialQualification: c.commercialQualification,
            salesQualificationScore: c.salesQualificationScore,
            sellabilityClass:       c.sellabilityClass,
            roiFitScore:            c.roiFitScore,
            roiFitLabel:            c.roiFitLabel,
            roiMultiple:            c.roiMultiple,
            paybackMonths:          c.paybackMonths,
            budgetCapacityScore:    c.budgetCapacityScore,
            budgetCapacityLabel:    c.budgetCapacityLabel,
            economicModelType:      c.economicModelType,
            primaryProblem:         c.primaryProblem,
            whyContact:             c.whyContact,
            whyNotContact:          c.whyNotContact,
            qualificationQuestions: c.qualificationQuestions,
          }),
        })
        const result = await res.json() as ImportedCompanyResult
        if (result.status === 'imported')   imported++
        else if (result.status === 'duplicate') duplicate++
        else failed++
        setImportStates(prev => ({ ...prev, [c.externalId]: { status: result.status, result } }))
      } catch (e) {
        failed++
        setImportStates(prev => ({
          ...prev,
          [c.externalId]: {
            status: 'failed',
            result: {
              candidateExternalId: c.externalId, status: 'failed',
              companyId: null, companyName: c.name,
              opportunityScore: null, priorityLevel: null,
              hasWebsite: !!c.website, webAnalyzed: false,
              detectedPhone: null,
              error: e instanceof Error ? e.message : 'Unknown error',
            },
          },
        }))
      }
    }

    setImportStatus('done')
    setImportSummary({ imported, duplicate, failed })
    setSelected(new Set())
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const importable = candidates.filter(c => !c.alreadyExists && isImportable(c))
  const allImportableSelected = importable.length > 0 && importable.every(c => selected.has(c.externalId))
  const modeConfig = SEARCH_MODE_CONFIGS[mode]

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Compass className="h-6 w-6 text-orange-500" />
            Descubrir Prospectos Rentables
          </h1>
          <p className="text-sm text-muted-foreground">
            Empresas privadas con síntomas visibles de mejora — candidatas a Auditoría Gratuita de 15 min
          </p>
        </div>
      </div>

      {/* Search form */}
      <Card className="mb-6 max-w-5xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Radar comercial KRONOS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: optional query + location refinements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="query">Rubro específico (opcional)</Label>
              <Input
                id="query"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleSearch() } }}
                placeholder="Opcional: dental, inmobiliarias, estética..."
                className="mt-1"
                disabled={searching}
                list="query-suggestions"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Déjalo vacío para que KRONOS busque oportunidades vendibles en rubros y mercados prioritarios.
              </p>
              <datalist id="query-suggestions">
                {INDUSTRY_SUGGESTIONS.filter(s => s !== 'Otro').map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <Label>País (opcional)</Label>
              <Select
                value={country}
                onValueChange={v => {
                  const nextCountry = COUNTRY_CONFIGS.find(c => c.value === v)
                  setCountry(v)
                  setCity(nextCountry?.cities[0] ?? '')
                }}
                disabled={searching}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="País" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CONFIGS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="city">Ciudad (opcional)</Label>
              <div className="relative mt-1">
                <Input
                  id="city"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleSearch() } }}
                  placeholder={selectedCountryConfig?.cities[0] ?? 'Ciudad...'}
                  className="pr-14"
                  disabled={searching}
                  list="city-suggestions"
                />
                {city && !searching && (
                  <button
                    type="button"
                    onClick={() => setCity('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              {selectedCountryConfig && (
                <datalist id="city-suggestions">
                  {selectedCountryConfig.cities.map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              )}
            </div>
          </div>

          {selectedCountryConfig && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Ciudades rápidas:</span>
              {selectedCountryConfig.cities.slice(0, 10).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCity(c)}
                  disabled={searching}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    city === c
                      ? 'border-orange-500/40 bg-orange-500/10 text-orange-600'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Row 2: mode + limit + search button */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-64">
              <Label>Modo de búsqueda</Label>
              <Select value={mode} onValueChange={v => setMode(v as SearchMode)} disabled={searching}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(SEARCH_MODE_CONFIGS) as [SearchMode, typeof SEARCH_MODE_CONFIGS[SearchMode]][]).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{modeConfig.description}</p>
            </div>

            <div className="w-36">
              <Label>Resultados</Label>
              <Select value={limit} onValueChange={setLimit} disabled={searching}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['10', '20', '30', '50'].map(v => (
                    <SelectItem key={v} value={v}>{v} empresas</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => void handleSearch()}
              disabled={searching}
              className="gap-2"
            >
              {searching
                ? <><Loader2 className="h-4 w-4 animate-spin" />Buscando...</>
                : <><Search className="h-4 w-4" />Buscar mejores oportunidades</>}
            </Button>

            <button
              type="button"
              onClick={() => setShowFilters(f => !f)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto"
            >
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Filtros avanzados
            </button>
          </div>

          {/* Advanced filters (collapsible) */}
          {showFilters && (
            <div className="border-t pt-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="district">Distrito / Zona</Label>
                  <Input
                    id="district"
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                    placeholder="Miraflores, Polanco..."
                    className="mt-1"
                    disabled={searching}
                  />
                </div>
                <div>
                  <Label>Radio (km)</Label>
                  <Select value={radiusKm} onValueChange={setRadiusKm} disabled={searching}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['2', '5', '10', '15', '20'].map(v => (
                        <SelectItem key={v} value={v}>{v} km</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fit mínimo (pre-filtro)</Label>
                  <Input
                    value={minSalesQualScore}
                    onChange={e => setMinSalesQualScore(e.target.value)}
                    placeholder="0–100"
                    type="number"
                    min="0"
                    max="100"
                    className="mt-1"
                    disabled={searching}
                  />
                </div>
                <div>
                  <Label>PFS mínimo</Label>
                  <Input
                    value={minProspectFitScore}
                    onChange={e => setMinProspectFitScore(e.target.value)}
                    placeholder="0–100"
                    type="number"
                    min="0"
                    max="100"
                    className="mt-1"
                    disabled={searching}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-5 pt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={privateBusiness}
                    onCheckedChange={v => setPrivateBusiness(v === true)}
                  />
                  Solo empresas privadas
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={excludePublicProjects}
                    onCheckedChange={v => setExcludePublicProjects(v === true)}
                  />
                  Excluir entidades públicas
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={excludeChains === true}
                    onCheckedChange={v => setExcludeChains(v === true ? true : undefined)}
                  />
                  Excluir cadenas
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={excludeLarge === true}
                    onCheckedChange={v => setExcludeLarge(v === true ? true : undefined)}
                  />
                  Excluir grandes
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={requireContact === true}
                    onCheckedChange={v => setRequireContact(v === true ? true : undefined)}
                  />
                  Solo con contacto
                </label>
              </div>
            </div>
          )}

          {searchError && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" /> {searchError}
            </div>
          )}

          {searchProgress && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" /> {searchProgress}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meta info */}
      {meta && (
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground max-w-5xl">
          <span>
            <span className="font-semibold text-foreground">{meta.city}</span>
            {meta.state ? `, ${meta.state}` : ''}
            {' · '}{meta.country}
          </span>
          <span>· {meta.gridPoints} puntos · radio {meta.radiusKm} km</span>
          <span>· {meta.overFetched} candidatos analizados → {meta.afterFilters} calificados</span>
          {meta.queries && meta.queries.length > 1 && (
            <span>· {meta.queries.length} rubros priorizados</span>
          )}
          {meta.locations && meta.locations.length > 1 && (
            <span>· {meta.locations.length} zonas exploradas</span>
          )}
          <span>·
            <span className="font-semibold text-purple-600"> HERE</span>
            {meta.sources.here ? ` ${meta.sources.hereRaw}` : ' no disponible'}
            <span className="font-semibold text-sky-600"> · OSM</span>
            {` ${meta.sources.osmRaw}`}
          </span>
        </div>
      )}

      {/* Results */}
      {candidates.length > 0 && (
        <div className="max-w-7xl">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                <Checkbox
                  checked={allImportableSelected}
                  onCheckedChange={toggleSelectAll}
                  disabled={importStatus === 'importing'}
                />
                Seleccionar nuevas ({importable.length})
              </label>
              {selected.size > 0 && (
                <span className="text-xs text-muted-foreground">{selected.size} seleccionadas</span>
              )}
            </div>

            <Button
              onClick={() => void handleImport()}
              disabled={selected.size === 0 || importStatus === 'importing'}
              className="gap-2"
              variant={importStatus === 'done' ? 'outline' : 'default'}
            >
              {importStatus === 'importing'
                ? <><Loader2 className="h-4 w-4 animate-spin" />Importando...</>
                : importStatus === 'done'
                  ? <><CheckCircle2 className="h-4 w-4" />Importar más ({selected.size})</>
                  : <>Importar seleccionadas ({selected.size})</>}
            </Button>
          </div>

          {/* Import summary */}
          {importSummary && (
            <div className="mb-4 rounded-lg border bg-muted px-4 py-3 flex flex-wrap gap-4 text-sm">
              {importSummary.imported > 0 && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> {importSummary.imported} importadas
                </span>
              )}
              {importSummary.duplicate > 0 && (
                <span className="text-muted-foreground">{importSummary.duplicate} ya existían</span>
              )}
              {importSummary.failed > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="h-4 w-4" /> {importSummary.failed} fallidas
                </span>
              )}
              {importSummary.imported > 0 && (
                <Link href="/" className="ml-auto text-sm font-medium text-orange-600 hover:underline">
                  Ver en dashboard →
                </Link>
              )}
            </div>
          )}

          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="w-8 px-2 py-2" />
                  <th className="px-3 py-2 text-center w-20">Estado</th>
                  <th className="px-3 py-2 text-left">Empresa</th>
                  <th className="px-3 py-2 text-left hidden lg:table-cell">Señales visibles</th>
                  <th className="px-3 py-2 text-left hidden md:table-cell">Contacto</th>
                  <th className="px-3 py-2 text-left hidden xl:table-cell">Dirección</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                  <th className="px-3 py-2 text-center hidden xl:table-cell">Fuente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {candidates.map(c => {
                  const impState    = importStates[c.externalId]
                  const isSelected  = selected.has(c.externalId)
                  const canSelect   = !c.alreadyExists && isImportable(c) && importStatus !== 'importing'
                  const result      = impState?.result
                  const isDiscard   = c.sellabilityClass === 'discard' || !c.entityIsCommercial

                  return (
                    <tr
                      key={c.externalId}
                      className={`transition-colors ${
                        isSelected ? 'bg-orange-500/10' :
                        isDiscard  ? 'bg-muted opacity-40' :
                        c.alreadyExists || impState?.status === 'imported' || impState?.status === 'duplicate'
                          ? 'bg-muted opacity-60'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-2 py-3 text-center">
                        {canSelect ? (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(c.externalId)}
                          />
                        ) : (
                          <span className="block h-4 w-4" />
                        )}
                      </td>

                      {/* Commercial state + rank */}
                      <td className="px-2 py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          {commercialStateBadge(c.commercialState)}
                          <span className="text-[10px] text-muted-foreground">#{c.rankAfterReranking}</span>
                        </div>
                      </td>

                      {/* Name + entity + size */}
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground leading-tight">{c.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{c.industry}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {!c.entityIsCommercial
                            ? entityBadge(c.entityType, c.entityIsCommercial)
                            : sizeBadge(c.estimatedBusinessSize)
                          }
                          {c.chainDetected && (
                            <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">Cadena</span>
                          )}
                        </div>
                        {result?.status === 'imported' && result.opportunityScore !== null && (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">APS {result.opportunityScore}</span>
                            {result.priorityLevel && commercialStateBadge(result.priorityLevel)}
                          </div>
                        )}
                        {result?.status === 'imported' && result.companyId && (
                          <Link
                            href={`/companies/${result.companyId}`}
                            className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-orange-600 hover:underline"
                          >
                            Ver ficha <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        )}
                        {result?.error && (
                          <p className="mt-0.5 text-[10px] text-red-500">{result.error}</p>
                        )}
                      </td>

                      {/* Visible signals */}
                      <td className="px-3 py-3 hidden lg:table-cell max-w-[230px]">
                        {!c.entityIsCommercial && c.entityExclusionReason ? (
                          <div className="flex items-start gap-1">
                            <ShieldX className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-red-500">{c.entityExclusionReason}</p>
                          </div>
                        ) : (
                          <>
                            {/* ICP Fit + Contactability */}
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {icpFitBadge(c.prospectFitScore)}
                              {contactabilityBadge(c.contactabilityScore)}
                            </div>

                            {/* Visible symptoms / why contact */}
                            {c.whyContact.length > 0 && (
                              <div className="mb-1">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <TrendingUp className="h-3 w-3 text-amber-500 shrink-0" />
                                  <span className="text-[10px] font-semibold text-amber-400 uppercase">Síntomas visibles</span>
                                </div>
                                {c.whyContact.slice(0, 2).map((r, i) => (
                                  <p key={i} className="text-[11px] text-muted-foreground truncate">{r}</p>
                                ))}
                              </div>
                            )}

                            {/* Disqualification / risk signals */}
                            {c.whyNotContact.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1 mb-0.5">
                                  <ShieldAlert className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Señales de riesgo</span>
                                </div>
                                {c.whyNotContact.slice(0, 2).map((r, i) => (
                                  <p key={i} className="text-[11px] text-muted-foreground truncate">{r}</p>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-3 py-3 hidden md:table-cell">
                        <div className="flex flex-col gap-1">
                          {(result?.detectedPhone ?? c.phone) && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 shrink-0" />
                              {result?.detectedPhone ?? c.phone}
                            </span>
                          )}
                          {c.website && (
                            <a
                              href={c.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-blue-600 hover:underline truncate max-w-[160px]"
                            >
                              <Globe className="h-3 w-3 shrink-0" />
                              {c.website.replace(/^https?:\/\/(www\.)?/, '').slice(0, 28)}
                            </a>
                          )}
                          {!c.website && !c.phone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" /> Sin contacto
                            </span>
                          )}
                          {/* Qualification questions hint */}
                          {c.qualificationQuestions.length > 0 && (
                            <details className="mt-1">
                              <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-muted-foreground flex items-center gap-1">
                                <DollarSign className="h-3 w-3" /> {c.qualificationQuestions.length} pregunta(s)
                              </summary>
                              <div className="mt-1 space-y-0.5">
                                {c.qualificationQuestions.map((q, i) => (
                                  <p key={i} className="text-[10px] text-muted-foreground pl-1 border-l border-border">
                                    {q}
                                  </p>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      </td>

                      {/* Address */}
                      <td className="px-3 py-3 hidden xl:table-cell">
                        <span className="flex items-start gap-1 text-xs text-muted-foreground max-w-[180px]">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="truncate">{c.address}</span>
                        </span>
                      </td>

                      {/* Import status */}
                      <td className="px-3 py-3 text-center">
                        {importStatusBadge(c, impState)}
                      </td>

                      {/* Source */}
                      <td className="px-3 py-3 text-center hidden xl:table-cell">
                        {sourceBadge(c.source)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Ordenadas por vendibilidad: encaje KRONOS, tamaño manejable, contacto disponible y señales visibles.
            El primer contacto es diagnóstico gratuito; cualquier propuesta viene después de confirmar el dolor con el cliente.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!searching && meta && candidates.length === 0 && (
        <div className="max-w-md text-center py-16">
          <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Sin prospectos calificados con los filtros actuales</p>
          <p className="text-sm text-muted-foreground mt-1">
            Prueba con modo &quot;broad&quot;, reduce el filtro mínimo, o amplía el radio.
            {!meta.sources.here && ' Añadir HERE_API_KEY mejorará la cobertura.'}
          </p>
        </div>
      )}
    </div>
  )
}
