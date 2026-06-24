'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, Download, Upload, Search, RefreshCw, Building2, AlertCircle, Loader2, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { listCompanies, createCompany, type Company } from '@/lib/api-client'
import { exportCompaniesCSV, importCompaniesCSV, type ParsedCSVRow } from '@/lib/csv'
import { INDUSTRY_SUGGESTIONS } from '@/lib/constants'

type SortKey = 'score_desc' | 'score_asc' | 'created_asc' | 'updated_desc' | 'sales_priority_desc' | 'prospect_fit_desc' | 'sqs_desc'

function priorityVariant(p: string): 'hot' | 'high' | 'medium' | 'low' | 'secondary' {
  if (p === 'hot') return 'hot'
  if (p === 'high') return 'high'
  if (p === 'medium') return 'medium'
  if (p === 'low') return 'low'
  return 'secondary'
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-red-400 font-bold'
  if (score >= 60) return 'text-orange-400 font-bold'
  if (score >= 40) return 'text-yellow-400 font-semibold'
  return 'text-muted-foreground'
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    contacted: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    client: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    archived: 'bg-muted text-muted-foreground border-border',
  }
  const labels: Record<string, string> = {
    active: 'Activo', contacted: 'Contactado', client: 'Cliente', archived: 'Archivado',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[status] ?? ''}`}>
      {labels[status] ?? status}
    </span>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState('')
  const [industry, setIndustry] = useState('')
  const [sort, setSort] = useState<SortKey>('score_desc')

  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listCompanies({
        priority: priority.trim() || undefined,
        sort,
        limit: 200,
      })
      let list = res.data
      if (search.trim()) {
        const q = search.toLowerCase()
        list = list.filter((c) => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q))
      }
      if (industry.trim()) {
        list = list.filter((c) => c.industry.toLowerCase().includes(industry.toLowerCase()))
      }
      setCompanies(list)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading companies')
    } finally {
      setLoading(false)
    }
  }, [priority, sort, search, industry])

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  async function handleImport(file: File) {
    setImporting(true)
    setImportResult(null)
    setImportProgress({ done: 0, total: 0 })
    const result = await importCompaniesCSV(
      file,
      async (row: ParsedCSVRow) => { await createCompany(row as unknown as Record<string, unknown>) },
      (done, total) => setImportProgress({ done, total }),
    )
    setImportResult(result)
    setImporting(false)
    if (result.success > 0) fetchCompanies()
  }

  const hotCount = companies.filter((c) => c.latestPriorityLevel === 'hot').length
  const unevaluated = companies.filter((c) => !c.latestEvaluatedAt).length

  const hasFilters = !!(search || priority || industry)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline de Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {companies.length} empresa{companies.length !== 1 ? 's' : ''} · {hotCount} hot · {unevaluated} sin evaluar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Importar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCompaniesCSV(companies)} disabled={companies.length === 0}>
            <Download className="h-4 w-4" /> Exportar
          </Button>
          <Button size="sm" asChild>
            <Link href="/companies/new"><Plus className="h-4 w-4" /> Nueva Empresa</Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empresa o industria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-36 bg-card">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">Todas</SelectItem>
            <SelectItem value="hot">🔴 Hot</SelectItem>
            <SelectItem value="high">🟠 High</SelectItem>
            <SelectItem value="medium">🟡 Medium</SelectItem>
            <SelectItem value="low">⚫ Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={industry} onValueChange={setIndustry}>
          <SelectTrigger className="w-52 bg-card">
            <SelectValue placeholder="Industria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">Todas las industrias</SelectItem>
            {INDUSTRY_SUGGESTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-52 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score_desc">Mayor score primero</SelectItem>
            <SelectItem value="score_asc">Menor score primero</SelectItem>
            <SelectItem value="updated_desc">Actualizado recientemente</SelectItem>
            <SelectItem value="created_asc">Más antiguo primero</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" onClick={fetchCompanies} title="Refrescar">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {error ? (
          <div className="flex items-center gap-2 p-6 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 p-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
          </div>
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center gap-4 p-16 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">No hay empresas</p>
              <p className="text-sm text-muted-foreground mt-1">
                {hasFilters
                  ? 'Ajusta los filtros para ver más resultados.'
                  : 'Agrega tu primera empresa para empezar.'}
              </p>
            </div>
            {!hasFilters && (
              <Button size="sm" asChild>
                <Link href="/companies/new"><Plus className="h-4 w-4" /> Nueva Empresa</Link>
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead>Empresa</TableHead>
                <TableHead>Industria</TableHead>
                <TableHead>País</TableHead>
                <TableHead className="text-center w-20">Score</TableHead>
                <TableHead className="w-28">Prioridad</TableHead>
                <TableHead className="w-56">Dolor detectado</TableHead>
                <TableHead className="w-32">Estado</TableHead>
                <TableHead className="w-32">Evaluado</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/companies/${c.id}`)}
                >
                  <TableCell className="font-semibold text-foreground">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.industry}</TableCell>
                  <TableCell className="text-muted-foreground text-xs uppercase tracking-wide">{c.country}</TableCell>
                  <TableCell className="text-center">
                    {c.latestEvaluatedAt ? (
                      <span className={`text-lg ${scoreColor(c.latestOpportunityScore)}`}>
                        {c.latestOpportunityScore}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.latestEvaluatedAt ? (
                      <Badge variant={priorityVariant(c.latestPriorityLevel)}>
                        {c.latestPriorityLevel.toUpperCase()}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Sin evaluar</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-56 truncate">
                    {c.whyContact?.[0] ?? c.qualificationReason ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{statusBadge(c.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.latestEvaluatedAt
                      ? new Date(c.latestEvaluatedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
                      : '—'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
                      <Link href={`/companies/${c.id}`}>Ver →</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* CSV Import Dialog */}
      <Dialog
        open={importOpen}
        onOpenChange={(o) => { if (!importing) { setImportOpen(o); if (!o) setImportResult(null) } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar empresas desde CSV</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Columnas requeridas: <code className="bg-muted px-1 rounded">name · industry · country</code>
              <br />Opcionales: <code className="bg-muted px-1 rounded">city · website · whatsapp · leadSource</code>
              <br />País válido: <code className="bg-muted px-1 rounded">peru · mexico · colombia · chile · argentina · ecuador · bolivia · uruguay · paraguay · costa_rica · panama · guatemala · honduras · el_salvador · nicaragua · spain</code>
            </DialogDescription>
          </DialogHeader>

          {!importing && !importResult && (
            <label className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-8 cursor-pointer hover:border-muted-foreground hover:bg-muted transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Haz clic para seleccionar tu archivo CSV</span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f) }}
              />
            </label>
          )}

          {importing && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Importando {importProgress.done} / {importProgress.total} empresas...
              </p>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: importProgress.total ? `${(importProgress.done / importProgress.total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          )}

          {importResult && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-400">{importResult.success}</p>
                  <p className="text-xs text-emerald-400 mt-1">Importadas exitosamente</p>
                </div>
                <div className="flex-1 rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-center">
                  <p className="text-3xl font-bold text-red-400">{importResult.failed}</p>
                  <p className="text-xs text-red-400 mt-1">Fallidas</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 max-h-24 overflow-y-auto">
                  {importResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-400">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {importResult ? (
              <Button onClick={() => { setImportOpen(false); setImportResult(null) }}>Listo</Button>
            ) : (
              <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>Cancelar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
