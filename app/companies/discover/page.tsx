'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Search, Loader2, AlertCircle, CheckCircle2,
  Globe, Phone, MapPin, ExternalLink, Compass,
  ChevronDown, ChevronUp, TrendingUp, ShieldAlert, Users,
  ShieldX, DollarSign, Zap,
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

function sqsBadge(score: number) {
  if (score >= 70) return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold text-xs">SQS {score}</Badge>
  if (score >= 55) return <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-bold text-xs">SQS {score}</Badge>
  if (score >= 35) return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">SQS {score}</Badge>
  return <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-xs">SQS {score}</Badge>
}

function sellabilityBadge(cls: string | undefined) {
  switch (cls) {
    case 'sell_now':          return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">Contactar ahora</Badge>
    case 'contact_diagnosis': return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">Diagnóstico</Badge>
    case 'investigate':       return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">Investigar</Badge>
    case 'nurture':           return <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]">Monitorear</Badge>
    case 'discard':           return <Badge className="bg-red-50 text-red-400 border-red-100 text-[10px]">Descartar</Badge>
    default:                  return null
  }
}

function roiBadge(label: string | undefined) {
  switch (label) {
    case 'excellent':       return <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">ROI Excelente</span>
    case 'good':            return <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">ROI Bueno</span>
    case 'limited':         return <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">ROI Limitado</span>
    case 'not_defensible':  return <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">ROI No defendible</span>
    default:                return null
  }
}

function budgetBadge(label: string | undefined) {
  switch (label) {
    case 'high':    return <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">💰 Alta capacidad</span>
    case 'medium':  return <span className="text-[10px] font-semibold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded">💰 Capacidad media</span>
    case 'low':     return <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">💰 Baja capacidad</span>
    default:        return null
  }
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
    return <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{label}</span>
  }
  return null
}

function sizeBadge(size: string | undefined) {
  switch (size) {
    case 'micro':   return <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">Micro</span>
    case 'small':   return <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Pequeña</span>
    case 'medium':  return <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Mediana</span>
    case 'large':   return <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Grande</span>
    default:        return null
  }
}

function importStatusBadge(c: DiscoveryCandidate, imp: CandidateImportState | undefined) {
  if (imp?.status === 'imported')   return <Badge className="bg-green-100 text-green-700 border-green-200">Importada</Badge>
  if (imp?.status === 'importing')  return <Badge className="bg-blue-100 text-blue-700 border-blue-200"><Loader2 className="h-3 w-3 animate-spin mr-1" />Importando</Badge>
  if (imp?.status === 'duplicate')  return <Badge className="bg-slate-100 text-slate-500 border-slate-200">Ya existe</Badge>
  if (imp?.status === 'failed')     return <Badge className="bg-red-100 text-red-600 border-red-200">Error</Badge>
  if (c.alreadyExists)              return <Badge className="bg-slate-100 text-slate-500 border-slate-200">Ya existe</Badge>
  if (!c.website && !c.phone)       return <Badge className="bg-rose-100 text-rose-600 border-rose-200">Sin contacto</Badge>
  if (!c.website)                   return <Badge className="bg-amber-100 text-amber-600 border-amber-200">Sin web</Badge>
  return <Badge className="bg-blue-100 text-blue-600 border-blue-200">Nueva</Badge>
}

function sourceBadge(source: 'here' | 'osm') {
  return source === 'here'
    ? <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">HERE</span>
    : <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">OSM</span>
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

  async function handleSearch() {
    if (!query.trim() || !city.trim() || !country) {
      setSearchError('Industria/búsqueda, ciudad y país son requeridos.')
      return
    }
    setSearchError('')
    setSearching(true)
    setCandidates([])
    setSelected(new Set())
    setImportStates({})
    setImportSummary(null)
    setMeta(null)

    const payload: Record<string, unknown> = {
      query:   query.trim(),
      city:    city.trim(),
      country,
      limit:   Number(limit),
      mode,
      radiusKm: Number(radiusKm),
      privateBusiness,
      excludePublicProjects,
    }
    if (district.trim())              payload.district             = district.trim()
    if (excludeChains !== undefined)  payload.excludeChains        = excludeChains
    if (excludeLarge  !== undefined)  payload.excludeLarge         = excludeLarge
    if (requireContact !== undefined) payload.requireContact       = requireContact
    if (minProspectFitScore !== '')   payload.minProspectFitScore  = Number(minProspectFitScore)
    if (minSalesQualScore   !== '')   payload.minSalesQualScore    = Number(minSalesQualScore)

    try {
      const res = await fetch('/api/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as SearchResponse
      setCandidates(data.candidates)
      setMeta(data.meta)
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Error al buscar empresas')
    } finally {
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
            discoverySearchCountry: meta?.countryCode ?? c.country,
            discoverySearchCity:    meta?.city ?? c.city,
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
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Compass className="h-6 w-6 text-orange-500" />
            Descubrir Prospectos Rentables
          </h1>
          <p className="text-sm text-slate-500">
            Empresas privadas, contactables, con capacidad de pago y ROI defensible — ordenadas por SQS
          </p>
        </div>
      </div>

      {/* Search form */}
      <Card className="mb-6 max-w-5xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Parámetros de búsqueda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: query + city + country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="query">Industria / Búsqueda *</Label>
              <Input
                id="query"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleSearch() } }}
                placeholder="dental, abogados, inmobiliaria..."
                className="mt-1"
                disabled={searching}
                list="query-suggestions"
              />
              <datalist id="query-suggestions">
                {INDUSTRY_SUGGESTIONS.filter(s => s !== 'Otro').map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <Label>País *</Label>
              <Select
                value={country}
                onValueChange={v => { setCountry(v); setCity('') }}
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
              <Label htmlFor="city">Ciudad *</Label>
              <Input
                id="city"
                value={city}
                onChange={e => setCity(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleSearch() } }}
                placeholder={selectedCountryConfig?.cities[0] ?? 'Ciudad...'}
                className="mt-1"
                disabled={searching || !country}
                list="city-suggestions"
              />
              {selectedCountryConfig && (
                <datalist id="city-suggestions">
                  {selectedCountryConfig.cities.map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              )}
            </div>
          </div>

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
              <p className="mt-0.5 text-[11px] text-slate-400">{modeConfig.description}</p>
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
              disabled={searching || !query.trim() || !city.trim() || !country}
              className="gap-2"
            >
              {searching
                ? <><Loader2 className="h-4 w-4 animate-spin" />Buscando...</>
                : <><Search className="h-4 w-4" />Buscar</>}
            </Button>

            <button
              type="button"
              onClick={() => setShowFilters(f => !f)}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors ml-auto"
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
                  <Label>SQS mínimo</Label>
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
        </CardContent>
      </Card>

      {/* Meta info */}
      {meta && (
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 max-w-5xl">
          <span>
            <span className="font-semibold text-slate-700">{meta.city}</span>
            {meta.state ? `, ${meta.state}` : ''}
            {' · '}{meta.country}
          </span>
          <span>· {meta.gridPoints} puntos · radio {meta.radiusKm} km</span>
          <span>· {meta.overFetched} candidatos analizados → {meta.afterFilters} calificados</span>
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
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                <Checkbox
                  checked={allImportableSelected}
                  onCheckedChange={toggleSelectAll}
                  disabled={importStatus === 'importing'}
                />
                Seleccionar nuevas ({importable.length})
              </label>
              {selected.size > 0 && (
                <span className="text-xs text-slate-500">{selected.size} seleccionadas</span>
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
            <div className="mb-4 rounded-lg border bg-slate-50 px-4 py-3 flex flex-wrap gap-4 text-sm">
              {importSummary.imported > 0 && (
                <span className="flex items-center gap-1 text-green-700">
                  <CheckCircle2 className="h-4 w-4" /> {importSummary.imported} importadas
                </span>
              )}
              {importSummary.duplicate > 0 && (
                <span className="text-slate-500">{importSummary.duplicate} ya existían</span>
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
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="w-8 px-2 py-2" />
                  <th className="px-3 py-2 text-center w-20">SQS</th>
                  <th className="px-3 py-2 text-left">Empresa</th>
                  <th className="px-3 py-2 text-left hidden lg:table-cell">Calificación comercial</th>
                  <th className="px-3 py-2 text-left hidden md:table-cell">Contacto</th>
                  <th className="px-3 py-2 text-left hidden xl:table-cell">Dirección</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                  <th className="px-3 py-2 text-center hidden xl:table-cell">Fuente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
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
                        isSelected ? 'bg-orange-50' :
                        isDiscard  ? 'bg-slate-50 opacity-40' :
                        c.alreadyExists || impState?.status === 'imported' || impState?.status === 'duplicate'
                          ? 'bg-slate-50 opacity-60'
                          : 'hover:bg-slate-50'
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

                      {/* SQS score + rank */}
                      <td className="px-2 py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          {sqsBadge(c.salesQualificationScore)}
                          <span className="text-[10px] text-slate-400">#{c.rankAfterReranking}</span>
                          {sellabilityBadge(c.sellabilityClass)}
                        </div>
                      </td>

                      {/* Name + entity + size */}
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-900 leading-tight">{c.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]">{c.industry}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {!c.entityIsCommercial
                            ? entityBadge(c.entityType, c.entityIsCommercial)
                            : sizeBadge(c.estimatedBusinessSize)
                          }
                          {c.chainDetected && (
                            <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Cadena</span>
                          )}
                        </div>
                        {result?.status === 'imported' && result.opportunityScore !== null && (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700">Score {result.opportunityScore}</span>
                            {result.priorityLevel && (
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                result.priorityLevel === 'hot'    ? 'bg-red-100 text-red-700' :
                                result.priorityLevel === 'high'   ? 'bg-orange-100 text-orange-700' :
                                result.priorityLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>{result.priorityLevel}</span>
                            )}
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

                      {/* Commercial qualification */}
                      <td className="px-3 py-3 hidden lg:table-cell max-w-[230px]">
                        {/* Entity exclusion reason */}
                        {!c.entityIsCommercial && c.entityExclusionReason ? (
                          <div className="flex items-start gap-1">
                            <ShieldX className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-red-500">{c.entityExclusionReason}</p>
                          </div>
                        ) : (
                          <>
                            {/* ROI + Budget */}
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {roiBadge(c.roiFitLabel)}
                              {budgetBadge(c.budgetCapacityLabel)}
                              {c.roiMultiple > 0 && (
                                <span className="text-[10px] text-slate-400">×{c.roiMultiple} ROI</span>
                              )}
                            </div>

                            {/* Why contact */}
                            {c.whyContact.length > 0 && (
                              <div className="mb-1">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <TrendingUp className="h-3 w-3 text-green-500 shrink-0" />
                                  <span className="text-[10px] font-semibold text-green-700 uppercase">Por qué contactar</span>
                                </div>
                                {c.whyContact.slice(0, 2).map((r, i) => (
                                  <p key={i} className="text-[11px] text-slate-600 truncate">{r}</p>
                                ))}
                              </div>
                            )}

                            {/* Why NOT contact */}
                            {c.whyNotContact.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1 mb-0.5">
                                  <ShieldAlert className="h-3 w-3 text-amber-500 shrink-0" />
                                  <span className="text-[10px] font-semibold text-amber-700 uppercase">Precauciones</span>
                                </div>
                                {c.whyNotContact.slice(0, 2).map((r, i) => (
                                  <p key={i} className="text-[11px] text-slate-500 truncate">{r}</p>
                                ))}
                              </div>
                            )}

                            {/* Primary problem */}
                            {c.primaryProblem && c.whyContact.length === 0 && c.whyNotContact.length === 0 && (
                              <div className="flex items-start gap-1">
                                <Zap className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                                <p className="text-[11px] text-slate-500 truncate">{c.primaryProblem}</p>
                              </div>
                            )}
                          </>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-3 py-3 hidden md:table-cell">
                        <div className="flex flex-col gap-1">
                          {(result?.detectedPhone ?? c.phone) && (
                            <span className="flex items-center gap-1 text-xs text-slate-600">
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
                            <span className="text-xs text-slate-300 flex items-center gap-1">
                              <Users className="h-3 w-3" /> Sin contacto
                            </span>
                          )}
                          {/* Qualification questions hint */}
                          {c.qualificationQuestions.length > 0 && (
                            <details className="mt-1">
                              <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-slate-600 flex items-center gap-1">
                                <DollarSign className="h-3 w-3" /> {c.qualificationQuestions.length} pregunta(s)
                              </summary>
                              <div className="mt-1 space-y-0.5">
                                {c.qualificationQuestions.map((q, i) => (
                                  <p key={i} className="text-[10px] text-slate-500 pl-1 border-l border-slate-200">
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
                        <span className="flex items-start gap-1 text-xs text-slate-500 max-w-[180px]">
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

          <p className="mt-3 text-xs text-slate-400">
            Ordenadas por Sales Qualification Score (SQS) — combina fit, ROI, capacidad de pago y contactabilidad.
            Solo empresas privadas con decisor comercial identificable.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!searching && meta && candidates.length === 0 && (
        <div className="max-w-md text-center py-16">
          <Search className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Sin prospectos calificados con los filtros actuales</p>
          <p className="text-sm text-slate-400 mt-1">
            Prueba con modo &quot;broad&quot;, reduce SQS mínimo, o amplía el radio.
            {!meta.sources.here && ' Añadir HERE_API_KEY mejorará la cobertura.'}
          </p>
        </div>
      )}
    </div>
  )
}
