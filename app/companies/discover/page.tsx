'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Search, Loader2, AlertCircle, CheckCircle2,
  Globe, Phone, MapPin, ExternalLink, Compass,
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
import { COUNTRIES, INDUSTRY_SUGGESTIONS } from '@/lib/constants'
import type { DiscoveryCandidate, ImportedCompanyResult } from '@/lib/discovery/types'

// ── Types ──────────────────────────────────────────────────────────────────

interface SearchResponse {
  candidates: DiscoveryCandidate[]
  sources: { here: boolean; osm: boolean; hereCount: number; osmCount: number }
}

type ImportStatus = 'idle' | 'importing' | 'done'

interface CandidateImportState {
  status: 'pending' | 'importing' | 'imported' | 'duplicate' | 'failed'
  result: ImportedCompanyResult | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

function confidenceBadge(confidence: number) {
  if (confidence >= 75) return <Badge className="bg-green-100 text-green-700 border-green-200">{confidence}%</Badge>
  if (confidence >= 50) return <Badge className="bg-amber-100 text-amber-700 border-amber-200">{confidence}%</Badge>
  return <Badge className="bg-slate-100 text-slate-600 border-slate-200">{confidence}%</Badge>
}

function statusBadge(c: DiscoveryCandidate, imp: CandidateImportState | undefined) {
  if (imp?.status === 'imported') return <Badge className="bg-green-100 text-green-700 border-green-200">Importada</Badge>
  if (imp?.status === 'importing') return <Badge className="bg-blue-100 text-blue-700 border-blue-200"><Loader2 className="h-3 w-3 animate-spin mr-1" />Importando</Badge>
  if (imp?.status === 'duplicate') return <Badge className="bg-slate-100 text-slate-500 border-slate-200">Ya existe</Badge>
  if (imp?.status === 'failed')   return <Badge className="bg-red-100 text-red-600 border-red-200">Error</Badge>
  if (c.alreadyExists) return <Badge className="bg-slate-100 text-slate-500 border-slate-200">Ya existe</Badge>
  if (!c.website)      return <Badge className="bg-amber-100 text-amber-600 border-amber-200">Sin web</Badge>
  return <Badge className="bg-blue-100 text-blue-600 border-blue-200">Nueva</Badge>
}

function sourceBadge(source: 'here' | 'osm') {
  return source === 'here'
    ? <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">HERE</span>
    : <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">OSM</span>
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  // Search form
  const [query,   setQuery]   = useState('')
  const [city,    setCity]    = useState('')
  const [country, setCountry] = useState('')
  const [limit,   setLimit]   = useState('20')

  // Results
  const [searching,  setSearching]  = useState(false)
  const [searchError, setSearchError] = useState('')
  const [candidates, setCandidates] = useState<DiscoveryCandidate[]>([])
  const [sourceInfo, setSourceInfo] = useState<SearchResponse['sources'] | null>(null)

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Import
  const [importStatus,  setImportStatus]  = useState<ImportStatus>('idle')
  const [importStates,  setImportStates]  = useState<Record<string, CandidateImportState>>({})
  const [importError,   setImportError]   = useState('')
  const [importSummary, setImportSummary] = useState<{ imported: number; duplicate: number; failed: number } | null>(null)

  // ── Search ──────────────────────────────────────────────────────────────

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
    setSourceInfo(null)

    try {
      const res = await fetch('/api/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), city: city.trim(), country, limit: Number(limit) }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as SearchResponse
      setCandidates(data.candidates)
      setSourceInfo(data.sources)
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Error al buscar empresas')
    } finally {
      setSearching(false)
    }
  }

  // ── Selection ───────────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const importable = candidates.filter(c => !c.alreadyExists && isImportable(c))
    if (selected.size === importable.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(importable.map(c => c.externalId)))
    }
  }

  function isImportable(c: DiscoveryCandidate): boolean {
    const s = importStates[c.externalId]
    return !s || s.status === 'pending' || s.status === 'failed'
  }

  // ── Import ──────────────────────────────────────────────────────────────

  async function handleImport() {
    if (selected.size === 0) return
    setImportError('')
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
            externalId:       c.externalId,
            name:             c.name,
            industry:         c.industry,
            country:          c.country,
            city:             c.city,
            address:          c.address,
            website:          c.website,
            phone:            c.phone,
            googleBusinessUrl: c.googleBusinessUrl,
            source:           c.source,
          }),
        })
        const result = await res.json() as ImportedCompanyResult
        if (result.status === 'imported')   imported++
        else if (result.status === 'duplicate') duplicate++
        else failed++

        setImportStates(prev => ({
          ...prev,
          [c.externalId]: { status: result.status, result },
        }))
      } catch (e) {
        failed++
        setImportStates(prev => ({
          ...prev,
          [c.externalId]: {
            status: 'failed',
            result: {
              candidateExternalId: c.externalId,
              status: 'failed',
              companyId: null,
              companyName: c.name,
              opportunityScore: null,
              priorityLevel: null,
              hasWebsite: !!c.website,
              webAnalyzed: false,
              detectedPhone: null,
              error: e instanceof Error ? e.message : 'Unknown error',
            },
          },
        }))
      }
    }

    setImportStatus('done')
    setImportSummary({ imported, duplicate, failed })
    setSelected(new Set()) // clear selection after import
  }

  // ── Derived state ───────────────────────────────────────────────────────

  const importableCount = candidates.filter(c => !c.alreadyExists && isImportable(c)).length
  const allImportableSelected =
    importableCount > 0 &&
    candidates.filter(c => !c.alreadyExists && isImportable(c)).every(c => selected.has(c.externalId))

  // ── Render ──────────────────────────────────────────────────────────────

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
            Descubrir Empresas
          </h1>
          <p className="text-sm text-slate-500">
            Búsqueda automática de prospectos via HERE Places y OpenStreetMap
          </p>
        </div>
      </div>

      {/* Search form */}
      <Card className="mb-6 max-w-4xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Parámetros de búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
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
              <Label htmlFor="city">Ciudad *</Label>
              <Input
                id="city"
                value={city}
                onChange={e => setCity(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleSearch() } }}
                placeholder="Lima, Ciudad de México..."
                className="mt-1"
                disabled={searching}
              />
            </div>

            <div>
              <Label>País *</Label>
              <Select value={country} onValueChange={setCountry} disabled={searching}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="País" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-end gap-4 mt-4">
            <div className="w-36">
              <Label>Límite de resultados</Label>
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
          </div>

          {searchError && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" /> {searchError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Source info */}
      {sourceInfo && (
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-slate-500 max-w-4xl">
          <span className="flex items-center gap-1">
            <span className="font-semibold text-purple-600">HERE</span>
            {sourceInfo.here ? `${sourceInfo.hereCount} resultados` : 'no disponible (sin API key)'}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <span className="font-semibold text-sky-600">OSM</span>
            {sourceInfo.osmCount} resultados
          </span>
          <span>·</span>
          <span>{candidates.length} candidatos únicos después de deduplicación</span>
        </div>
      )}

      {/* Results */}
      {candidates.length > 0 && (
        <div className="max-w-5xl">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                <Checkbox
                  checked={allImportableSelected}
                  onCheckedChange={toggleSelectAll}
                  disabled={importStatus === 'importing'}
                />
                Seleccionar todas las nuevas ({importableCount})
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

          {importError && (
            <div className="mb-4 flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" /> {importError}
            </div>
          )}

          {/* Table */}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="w-10 px-3 py-2" />
                  <th className="px-3 py-2 text-left">Empresa</th>
                  <th className="px-3 py-2 text-left hidden md:table-cell">Contacto</th>
                  <th className="px-3 py-2 text-left hidden lg:table-cell">Dirección</th>
                  <th className="px-3 py-2 text-center">Conf.</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                  <th className="px-3 py-2 text-center hidden xl:table-cell">Fuente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map(c => {
                  const impState = importStates[c.externalId]
                  const isSelected = selected.has(c.externalId)
                  const canSelect = !c.alreadyExists && isImportable(c) && importStatus !== 'importing'
                  const result = impState?.result

                  return (
                    <tr
                      key={c.externalId}
                      className={`transition-colors ${
                        isSelected ? 'bg-orange-50' :
                        c.alreadyExists || impState?.status === 'imported' || impState?.status === 'duplicate'
                          ? 'bg-slate-50 opacity-60'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3 text-center">
                        {canSelect ? (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(c.externalId)}
                          />
                        ) : (
                          <span className="block h-4 w-4" />
                        )}
                      </td>

                      {/* Name + industry */}
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-900 leading-tight">{c.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]">{c.industry}</p>
                        {result?.status === 'imported' && result.opportunityScore !== null && (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700">Score {result.opportunityScore}</span>
                            {result.priorityLevel && (
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                result.priorityLevel === 'hot'  ? 'bg-red-100 text-red-700' :
                                result.priorityLevel === 'high' ? 'bg-orange-100 text-orange-700' :
                                result.priorityLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>{result.priorityLevel}</span>
                            )}
                          </div>
                        )}
                        {result?.status === 'imported' && result.companyId && (
                          <Link
                            href={`/companies/${result.companyId}`}
                            className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-orange-600 hover:underline"
                          >
                            Ver ficha <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        )}
                        {result?.error && (
                          <p className="mt-0.5 text-[10px] text-red-500">{result.error}</p>
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
                              {c.website.replace(/^https?:\/\/(www\.)?/, '').slice(0, 30)}
                            </a>
                          )}
                          {!c.website && !c.phone && (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </div>
                      </td>

                      {/* Address */}
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <span className="flex items-start gap-1 text-xs text-slate-500 max-w-[180px]">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="truncate">{c.address}</span>
                        </span>
                      </td>

                      {/* Confidence */}
                      <td className="px-3 py-3 text-center">
                        {confidenceBadge(c.confidence)}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center">
                        {statusBadge(c, impState)}
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
            Las empresas importadas se crean con evaluación automática basada en análisis del sitio web.
            Puedes editar sus datos y señales desde la ficha de empresa.
          </p>
        </div>
      )}

      {/* Empty state after search */}
      {!searching && sourceInfo && candidates.length === 0 && (
        <div className="max-w-md text-center py-16">
          <Search className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Sin resultados</p>
          <p className="text-sm text-slate-400 mt-1">
            Intenta con otra industria, ciudad o amplía el límite de resultados.
            {!sourceInfo.here && ' Añadir HERE_API_KEY mejorará la cobertura significativamente.'}
          </p>
        </div>
      )}
    </div>
  )
}
