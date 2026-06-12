'use client'
import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Edit, Trash2, RefreshCw, AlertCircle, Loader2,
  TrendingDown, DollarSign, Zap, Clock, CheckCircle2, XCircle,
  MessageSquare, Phone, Mail, Calendar, ChevronDown, ChevronUp, Send,
  Copy, Pencil, Plus, X, BarChart2, Target, ClipboardList,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  getCompany, listEvaluations, listOutreach, createOutreach, upsertSalesNote,
  evaluateCompany, deleteCompany, reprocessCompany,
  listAudits, createAudit, updateAudit,
  type CompanyDetail, type Evaluation, type OutreachRecord, type SalesNote, type Audit,
} from '@/lib/api-client'
import { SIGNAL_DEFINITIONS, OUTREACH_CHANNELS, RESPONSE_TYPES, CONTACT_STATUSES, MEETING_STATUSES, PIPELINE_STAGES } from '@/lib/constants'
import { cn } from '@/lib/utils'

function priorityVariant(p: string): 'hot' | 'high' | 'medium' | 'low' | 'secondary' {
  if (p === 'hot') return 'hot'
  if (p === 'high') return 'high'
  if (p === 'medium') return 'medium'
  if (p === 'low') return 'low'
  return 'secondary'
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-red-600'
  if (score >= 60) return 'text-orange-500'
  if (score >= 40) return 'text-yellow-500'
  return 'text-slate-400'
}

function ScoreMeter({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-red-500' : score >= 60 ? 'bg-orange-500' : score >= 40 ? 'bg-yellow-400' : 'bg-slate-300'
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${score}%` }} />
    </div>
  )
}

function EvaluationView({ ev }: { ev: Evaluation }) {
  const [showProblems, setShowProblems] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<Evaluation[]>([])

  async function loadHistory() {
    if (showHistory || history.length > 0) { setShowHistory((v) => !v); return }
    try {
      const res = await listEvaluations(ev.companyId)
      setHistory(res.data)
    } catch { /* ignore */ }
    setShowHistory(true)
  }

  const coverage = ev.researchCoverage ?? null
  const evStatus = ev.evaluationStatus ?? null
  const isLowCoverage = coverage !== null && coverage < 40

  const categoryScores = [
    { label: 'Generación de Leads', value: ev.scoreLeadGeneration },
    { label: 'Seguimiento', value: ev.scoreFollowUp },
    { label: 'Conversión', value: ev.scoreConversionProcess },
    { label: 'Automatización', value: ev.scoreAutomationOpportunity },
    { label: 'Presencia Online', value: ev.scoreOnlinePresence },
    { label: 'Reputación', value: ev.scoreReputation },
  ]

  const statusConfig: Record<string, { label: string; cls: string }> = {
    complete:              { label: 'Completa',          cls: 'bg-green-100 text-green-700 border-green-200' },
    preliminary:           { label: 'Preliminar',        cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    manual_review_required:{ label: 'Revisión manual',   cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Coverage / confidence banner */}
      {coverage !== null && (
        <div className={`rounded-lg border px-4 py-3 flex items-center gap-4 flex-wrap ${
          isLowCoverage ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cobertura</span>
            <span className={`text-sm font-bold ${isLowCoverage ? 'text-amber-700' : 'text-slate-800'}`}>{coverage}%</span>
            <div className="w-20 bg-slate-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${coverage >= 70 ? 'bg-green-500' : coverage >= 40 ? 'bg-yellow-500' : 'bg-amber-500'}`}
                style={{ width: `${coverage}%` }}
              />
            </div>
          </div>
          {evStatus && statusConfig[evStatus] && (
            <span className={`text-xs font-medium border rounded-full px-2 py-0.5 ${statusConfig[evStatus].cls}`}>
              {statusConfig[evStatus].label}
            </span>
          )}
          {isLowCoverage && (
            <p className="text-xs text-amber-700 ml-auto">
              Datos insuficientes para diagnóstico definitivo — score y precio son orientativos.
            </p>
          )}
        </div>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Opportunity Score</span>
          </div>
          <p className={`text-3xl font-bold ${scoreColor(ev.opportunityScore)}`}>{ev.opportunityScore}</p>
          <ScoreMeter score={ev.opportunityScore} />
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Pérdida mensual est.</span>
          </div>
          <p className="text-2xl font-bold text-red-600">${ev.estimatedRevenueLostPerMonth.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{ev.estimatedLeadsLostPerMonth} leads/mes perdidos</p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Valor del Proyecto</span>
          </div>
          <p className="text-lg font-bold text-slate-900">
            ${ev.estimatedProjectPriceMin.toLocaleString()} – ${ev.estimatedProjectPriceMax.toLocaleString()}
          </p>
          {ev.priceLabel && <p className="text-xs text-slate-400 mt-1">{ev.priceLabel} · ROI: {ev.estimatedRoiPotential}×</p>}
          {!ev.priceLabel && <p className="text-xs text-slate-400 mt-1">ROI estimado: {ev.estimatedRoiPotential}×</p>}
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Implementación</span>
          </div>
          <p className="text-sm font-semibold text-slate-900">{ev.implementationTimeEstimate}</p>
          <p className="text-xs text-slate-400 mt-1 capitalize">Dificultad: {ev.implementationDifficulty}</p>
        </div>
      </div>

      {/* Pain + Solution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-700">Diagnóstico</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 leading-relaxed">{ev.probablePainPoint}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-700">Solución Recomendada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 leading-relaxed">{ev.recommendedSolution}</p>
          </CardContent>
        </Card>
      </div>

      {/* SECCIÓN A — Paquetes Kronos Recomendados */}
      {ev.recommendedPackageSlug && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 rounded px-1.5 py-0.5">A</span>
            <span className="text-sm font-semibold text-slate-800">Paquetes Kronos Recomendados</span>
          </div>
          <Card className={`border-2 ${ev.packageConfidence === 'high' ? 'border-orange-200' : ev.packageConfidence === 'medium' ? 'border-yellow-200' : 'border-slate-200'}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base text-slate-900">{ev.recommendedPackageName}</CardTitle>
                  {ev.packageConfidence && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border mt-1 inline-block ${
                      ev.packageConfidence === 'high' ? 'bg-green-50 text-green-700 border-green-200' :
                      ev.packageConfidence === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      Confianza {ev.packageConfidence === 'high' ? 'alta' : ev.packageConfidence === 'medium' ? 'media' : 'baja'}
                    </span>
                  )}
                </div>
                {ev.packagePriceMin !== null && ev.packagePriceMax !== null && (
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">
                      {ev.packagePriceMin === 0 ? 'Gratuito' : `$${ev.packagePriceMin.toLocaleString()} – $${ev.packagePriceMax.toLocaleString()}`}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Rango preliminar sujeto a<br/>validación de alcance</p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              {ev.packageReason && (
                <p className="text-sm text-slate-600 leading-relaxed">{ev.packageReason}</p>
              )}
              {(ev.packageEvidence?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {ev.packageEvidence!.map((e) => (
                    <span key={e} className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5">{e}</span>
                  ))}
                </div>
              )}
              {ev.packageTimelineMin !== null && ev.packageTimelineMax !== null && (
                <p className="text-xs text-slate-500">
                  Plazo preliminar: {ev.packageTimelineMin}–{ev.packageTimelineMax} semanas · Sujeto a validación técnica
                </p>
              )}
              <div className="flex items-center gap-3 flex-wrap pt-1">
                <a
                  href="https://www.kronosdata.tech/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 text-white px-3 py-1.5 text-xs font-medium hover:bg-slate-700 transition-colors"
                >
                  Ver oferta de Kronos Data →
                </a>
                <span className="text-xs text-slate-400">Garantía de Optimización Operativa 30 días</span>
              </div>
            </CardContent>
          </Card>
          {ev.alternativePackageSlug && ev.alternativePackageName && (
            <div className="rounded-lg border bg-slate-50 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Paquete alternativo</p>
                <p className="text-sm font-medium text-slate-700">{ev.alternativePackageName}</p>
              </div>
              <a
                href="https://www.kronosdata.tech/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-600 hover:text-slate-900 hover:underline"
              >
                Ver detalles en kronosdata.tech →
              </a>
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN B — Servicios Individuales Recomendados */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 rounded px-1.5 py-0.5">B</span>
          <span className="text-sm font-semibold text-slate-800">Servicios Individuales Recomendados</span>
          {ev.recommendedPackageSlug && (
            <span className="text-xs text-slate-400">(componente prioritario del paquete)</span>
          )}
        </div>
        <Card>
          <CardContent className="flex flex-col gap-3 pt-4">
            {ev.primaryService ? (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Servicio prioritario</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-800">
                    {ev.primaryService}
                  </span>
                  <span className="text-xs text-slate-400">{ev.implementationTimeEstimate} · {ev.priceLabel ?? ''}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ev.recommendedServices.map((s) => (
                  <span key={s} className="inline-flex items-center rounded-md border bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">{s}</span>
                ))}
              </div>
            )}
            {(ev.complementaryServices?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Complementarios</p>
                <div className="flex flex-wrap gap-2">
                  {ev.complementaryServices!.map((s) => (
                    <span key={s} className="inline-flex items-center rounded-md border bg-slate-50 px-3 py-1 text-sm text-slate-700">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {(ev.futureServices?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Oportunidades futuras</p>
                <div className="flex flex-wrap gap-2">
                  {ev.futureServices!.map((s) => (
                    <span key={s} className="inline-flex items-center rounded-md border border-dashed bg-slate-50 px-3 py-1 text-xs text-slate-500">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category scores */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-700">Scores por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {categoryScores.map((cs) => (
              <div key={cs.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">{cs.label}</span>
                  <span className={`font-semibold ${scoreColor(cs.value)}`}>{cs.value}</span>
                </div>
                <ScoreMeter score={cs.value} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detected problems */}
      <div>
        <button
          onClick={() => setShowProblems((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          {showProblems ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {ev.detectedProblems.length} problemas detectados
          {isLowCoverage && <span className="text-xs text-amber-600">(evidencia limitada)</span>}
        </button>
        {showProblems && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ev.detectedProblems.length === 0 ? (
              <p className="text-sm text-slate-400 col-span-2">Sin problemas confirmados con la evidencia disponible.</p>
            ) : (
              ev.detectedProblems.map((p) => (
                <div key={p} className={`flex items-start gap-2 rounded-md border px-3 py-2 ${
                  p.startsWith('(posible)') ? 'bg-yellow-50 border-yellow-100' : 'bg-red-50 border-red-100'
                }`}>
                  <XCircle className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${p.startsWith('(posible)') ? 'text-yellow-500' : 'text-red-400'}`} />
                  <span className={`text-xs ${p.startsWith('(posible)') ? 'text-yellow-800' : 'text-red-700'}`}>{p}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Signal summary — evidence-aware */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Señales evaluadas</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {SIGNAL_DEFINITIONS.map((s) => {
            const val = (ev as unknown as Record<string, boolean>)[s.key]
            const evidenceEntry = ev.signalEvidence?.[s.key]
            const status = evidenceEntry?.status ?? (val ? 'positive' : 'negative')
            const isGood = s.problemWhen ? !val : val

            if (status === 'unknown') {
              return (
                <div key={s.key} className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-slate-300">
                  <span className="h-3 w-3 shrink-0 rounded-full border border-slate-300 inline-block" />
                  {s.label}
                </div>
              )
            }

            return (
              <div
                key={s.key}
                className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${
                  status === 'inferred'
                    ? 'bg-yellow-50 text-yellow-700'
                    : isGood ? 'text-slate-500' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {status === 'inferred'
                  ? <span className="h-3 w-3 shrink-0 text-yellow-400">~</span>
                  : isGood
                    ? <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
                    : <XCircle className="h-3 w-3 text-amber-500 shrink-0" />
                }
                {status === 'inferred' ? `${s.label} (indicios)` : s.label}
              </div>
            )
          })}
        </div>
        {ev.signalEvidence && (
          <p className="text-xs text-slate-300 mt-2">
            ○ = no investigado · ~ = inferido · ✓ = confirmado positivo · ✗ = confirmado problema
          </p>
        )}
      </div>

      {/* Evaluation history */}
      <div>
        <button
          onClick={loadHistory}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Ver historial de evaluaciones
        </button>
        {showHistory && history.length > 0 && (
          <div className="mt-3 border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Fecha</th>
                  <th className="text-center px-4 py-2 text-xs text-slate-500 font-medium">Score</th>
                  <th className="px-4 py-2 text-xs text-slate-500 font-medium">Prioridad</th>
                  <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Por</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={h.id} className={i % 2 === 0 ? '' : 'bg-slate-50'}>
                    <td className="px-4 py-2 text-slate-600 text-xs">
                      {new Date(h.evaluatedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`font-bold ${scoreColor(h.opportunityScore)}`}>{h.opportunityScore}</span>
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={priorityVariant(h.priorityLevel)} className="text-xs">
                        {h.priorityLevel.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-400">{h.evaluatedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Composite scoring panel ───────────────────────────────────────────────────

const SALES_PRIORITY_CONFIG: Record<string, { label: string; cls: string }> = {
  HOT:     { label: 'HOT 🔥',    cls: 'bg-red-100 text-red-700 border-red-300' },
  HIGH:    { label: 'HIGH',      cls: 'bg-orange-100 text-orange-700 border-orange-300' },
  MEDIUM:  { label: 'MEDIUM',    cls: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  LOW:     { label: 'LOW',       cls: 'bg-slate-100 text-slate-600 border-slate-300' },
  REVIEW:  { label: 'REVIEW',    cls: 'bg-purple-100 text-purple-700 border-purple-300' },
  DISCARD: { label: 'DISCARD',   cls: 'bg-slate-100 text-slate-400 border-slate-200' },
}

const EVIDENCE_TIER_CONFIG: Record<string, { label: string; cls: string }> = {
  HIGH:   { label: 'Evidencia ALTA',   cls: 'bg-green-100 text-green-700 border-green-300' },
  MEDIUM: { label: 'Evidencia MEDIA',  cls: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  LOW:    { label: 'Evidencia BAJA',   cls: 'bg-amber-100 text-amber-700 border-amber-300' },
}

function CompositeMeter({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0
  const color = v >= 75 ? 'bg-green-500' : v >= 55 ? 'bg-blue-500' : v >= 35 ? 'bg-yellow-400' : 'bg-slate-300'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className={`font-semibold ${v >= 60 ? 'text-slate-900' : 'text-slate-400'}`}>{value ?? '—'}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}

function CompositeScorePanel({ company }: { company: CompanyDetail }) {
  const sp = company.salesPriority ? SALES_PRIORITY_CONFIG[company.salesPriority] : null
  const et = company.evidenceTier ? EVIDENCE_TIER_CONFIG[company.evidenceTier] : null

  const hasAny = company.salesOpportunityScore !== null || company.icpFitScore !== null

  if (!hasAny) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-200 px-6 py-8 text-center text-slate-400 text-sm">
        <BarChart2 className="h-8 w-8 mx-auto mb-2 text-slate-200" />
        <p>Scoring compuesto no disponible.</p>
        <p className="text-xs mt-1">Evalúa y reprocesa la empresa para calcularlo.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Priority + tier badges */}
      <div className="flex flex-wrap items-center gap-3">
        {sp && (
          <span className={`text-sm font-bold border rounded-full px-3 py-1 ${sp.cls}`}>{sp.label}</span>
        )}
        {et && (
          <span className={`text-xs font-medium border rounded-full px-3 py-1 ${et.cls}`}>{et.label}</span>
        )}
        {company.salesOpportunityScore !== null && (
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-400">Sales Opp. Score</p>
            <p className={`text-3xl font-bold ${scoreColor(company.salesOpportunityScore)}`}>{company.salesOpportunityScore}</p>
          </div>
        )}
      </div>

      {/* 5 dimension scores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        <CompositeMeter label="ICP Fit"           value={company.icpFitScore} />
        <CompositeMeter label="Pain"              value={company.painScore} />
        <CompositeMeter label="Payment Capacity"  value={company.paymentCapacityScore} />
        <CompositeMeter label="Evidence Coverage" value={company.evidenceCoverageScore} />
        <CompositeMeter label="Commercial Intent" value={company.commercialIntentScore} />
      </div>

      {/* Qualification / disqualification reasons */}
      {company.qualificationReason && (
        <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Por qué califica</p>
          <p className="text-sm text-green-800 leading-relaxed">{company.qualificationReason}</p>
        </div>
      )}
      {company.disqualificationReason && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Por qué no califica / riesgo</p>
          <p className="text-sm text-red-800 leading-relaxed">{company.disqualificationReason}</p>
        </div>
      )}
      {company.recommendedFirstAction && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Primera acción recomendada</p>
          <p className="text-sm text-blue-900 leading-relaxed">{company.recommendedFirstAction}</p>
        </div>
      )}
    </div>
  )
}

// ─── CRM Pipeline panel ────────────────────────────────────────────────────────

function PipelinePanel({
  companyId,
  initialNote,
  company,
}: {
  companyId: string
  initialNote: SalesNote | null
  company: CompanyDetail
}) {
  const currentStage = initialNote?.pipelineStage ?? 'discovered'
  const [stage, setStage] = useState(currentStage)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [potentialValue, setPotentialValue] = useState(initialNote?.potentialValue?.toString() ?? '')
  const [proposedPackage, setProposedPackage] = useState(initialNote?.proposedPackageSlug ?? '')
  const [internalNotes, setInternalNotes] = useState(initialNote?.internalNotes ?? '')

  const currentIdx = PIPELINE_STAGES.findIndex((s) => s.value === stage)

  async function save(newStage?: string) {
    setSaving(true)
    try {
      await upsertSalesNote(companyId, {
        pipelineStage:       newStage ?? stage,
        potentialValue:      potentialValue ? parseFloat(potentialValue) : undefined,
        proposedPackageSlug: proposedPackage || undefined,
        internalNotes:       internalNotes.trim() || undefined,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  async function handleStageClick(val: string) {
    setStage(val)
    await save(val)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stage selector */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Etapa del pipeline</p>
        <div className="flex flex-wrap gap-2">
          {PIPELINE_STAGES.map((s, i) => (
            <button
              key={s.value}
              onClick={() => handleStageClick(s.value)}
              disabled={saving}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                stage === s.value
                  ? s.color + ' border-current ring-2 ring-offset-1 ring-slate-400'
                  : i < currentIdx
                    ? 'bg-slate-50 text-slate-400 border-slate-200'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
            >
              {i < currentIdx && <CheckCircle2 className="h-3 w-3 text-green-400" />}
              {stage === s.value && <span className="h-2 w-2 rounded-full bg-current inline-block" />}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Valor potencial (USD)</Label>
          <Input
            type="number"
            value={potentialValue}
            onChange={(e) => setPotentialValue(e.target.value)}
            placeholder="Ej: 2500"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Paquete propuesto (slug)</Label>
          <Input
            value={proposedPackage}
            onChange={(e) => setProposedPackage(e.target.value)}
            placeholder="ej: starter_autonomy"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Notas internas</Label>
        <Textarea
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          placeholder="Notas del proceso de ventas (no se muestran al cliente)..."
          className="mt-1 min-h-[80px]"
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => save()} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : null}
          {saved ? 'Guardado' : 'Guardar pipeline'}
        </Button>
      </div>

      {/* Composite scores in pipeline context */}
      <Separator />
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Scoring compuesto</p>
        <CompositeScorePanel company={company} />
      </div>
    </div>
  )
}

// ─── Audit panel ───────────────────────────────────────────────────────────────

function AuditPanel({ companyId, industry }: { companyId: string; industry: string }) {
  const [audits, setAudits] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Audit | null>(null)
  const [saving, setSaving] = useState(false)

  // Edit state for the selected audit
  const [checklist, setChecklist] = useState<Audit['checklist']>(null)
  const [findings, setFindings] = useState('')
  const [hypothesis, setHypothesis] = useState('')
  const [validatedDiagnosis, setValidatedDiagnosis] = useState('')
  const [recommendedPkg, setRecommendedPkg] = useState('')
  const [packageReason, setPackageReason] = useState('')
  const [meetingSummary, setMeetingSummary] = useState('')
  const [status, setStatus] = useState('in_progress')

  useEffect(() => {
    listAudits(companyId)
      .then((r) => { setAudits(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [companyId])

  function selectAudit(a: Audit) {
    setSelected(a)
    setChecklist(a.checklist)
    setFindings(a.findings ?? '')
    setHypothesis(a.hypothesis ?? '')
    setValidatedDiagnosis(a.validatedDiagnosis ?? '')
    setRecommendedPkg(a.recommendedPackageSlug ?? '')
    setPackageReason(a.packageReason ?? '')
    setMeetingSummary(a.meetingSummary ?? '')
    setStatus(a.status)
  }

  async function handleCreate() {
    setCreating(true)
    try {
      const a = await createAudit(companyId, { sector: industry })
      setAudits([a, ...audits])
      selectAudit(a)
    } catch { /* ignore */ }
    finally { setCreating(false) }
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    try {
      const updated = await updateAudit(companyId, {
        auditId:               selected.id,
        status,
        checklist:             checklist ?? undefined,
        findings:              findings.trim() || undefined,
        hypothesis:            hypothesis.trim() || undefined,
        validatedDiagnosis:    validatedDiagnosis.trim() || undefined,
        recommendedPackageSlug: recommendedPkg.trim() || undefined,
        packageReason:         packageReason.trim() || undefined,
        meetingSummary:        meetingSummary.trim() || undefined,
      })
      setSelected(updated)
      setAudits((prev) => prev.map((a) => a.id === updated.id ? updated : a))
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  function toggleChecklistItem(id: string, newStatus: 'pending' | 'confirmed' | 'not_applicable' | 'flagged') {
    setChecklist((prev) => (prev ?? []).map((item) => item.id === id ? { ...item, status: newStatus } : item))
  }

  const STATUS_LABEL: Record<string, string> = {
    in_progress: 'En progreso',
    completed: 'Completada',
    converted_to_proposal: 'Convertida a propuesta',
    draft: 'Borrador',
  }

  const CHECKLIST_STATUS_CYCLE: Record<string, 'confirmed' | 'flagged' | 'not_applicable' | 'pending'> = {
    pending: 'confirmed',
    confirmed: 'flagged',
    flagged: 'not_applicable',
    not_applicable: 'pending',
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">
          Auditorías gratuitas
          <span className="ml-2 text-slate-400 font-normal">({audits.length})</span>
        </p>
        <Button size="sm" variant="outline" onClick={handleCreate} disabled={creating}>
          {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Nueva auditoría
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : audits.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm rounded-xl border-2 border-dashed border-slate-200">
          <ClipboardList className="h-8 w-8 mx-auto mb-2 text-slate-200" />
          <p>Sin auditorías todavía.</p>
          <p className="text-xs mt-1">Crea una para iniciar el proceso de diagnóstico estructurado.</p>
        </div>
      ) : (
        <>
          {/* Audit list tabs */}
          <div className="flex flex-wrap gap-2">
            {audits.map((a) => (
              <button
                key={a.id}
                onClick={() => selectAudit(a)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-all ${
                  selected?.id === a.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {new Date(a.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                {' · '}
                <span className={a.status === 'completed' ? 'text-green-400' : 'text-amber-400'}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
              </button>
            ))}
          </div>

          {selected && (
            <div className="flex flex-col gap-5 rounded-xl border bg-white p-5">
              {/* Status selector */}
              <div className="flex items-center gap-3 flex-wrap">
                <Label className="text-xs shrink-0">Estado</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400 ml-auto">Sector: {selected.sector ?? '—'}</p>
              </div>

              {/* Checklist */}
              {checklist && checklist.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Checklist de auditoría</p>
                  <div className="flex flex-col gap-1.5">
                    {checklist.map((item) => {
                      const statusConfig = {
                        pending:        { cls: 'bg-slate-50 border-slate-200 text-slate-500', label: '○' },
                        confirmed:      { cls: 'bg-green-50 border-green-200 text-green-700', label: '✓' },
                        flagged:        { cls: 'bg-red-50 border-red-200 text-red-700',       label: '✗' },
                        not_applicable: { cls: 'bg-slate-50 border-slate-200 text-slate-300', label: 'N/A' },
                      }
                      const cfg = statusConfig[item.status as keyof typeof statusConfig] ?? statusConfig.pending
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleChecklistItem(item.id, CHECKLIST_STATUS_CYCLE[item.status] as 'confirmed' | 'flagged' | 'not_applicable' | 'pending')}
                          className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-all hover:shadow-sm ${cfg.cls}`}
                        >
                          <span className="font-mono text-xs w-6 shrink-0 text-center">{cfg.label}</span>
                          <span>{item.item}</span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-slate-300 mt-1.5">Haz clic para cambiar el estado: ○ → ✓ → ✗ → N/A</p>
                </div>
              )}

              <Separator />

              {/* Findings */}
              <div>
                <Label className="text-xs">Hallazgos principales</Label>
                <Textarea
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  placeholder="¿Qué encontraste durante la auditoría?"
                  className="mt-1 min-h-[80px]"
                />
              </div>

              {/* Hypothesis */}
              <div>
                <Label className="text-xs">Hipótesis de problema central</Label>
                <Textarea
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  placeholder="¿Cuál es el problema principal identificado?"
                  className="mt-1 min-h-[70px]"
                />
              </div>

              {/* Validated diagnosis */}
              <div>
                <Label className="text-xs">Diagnóstico validado</Label>
                <Textarea
                  value={validatedDiagnosis}
                  onChange={(e) => setValidatedDiagnosis(e.target.value)}
                  placeholder="Diagnóstico confirmado después de la reunión..."
                  className="mt-1 min-h-[70px]"
                />
              </div>

              {/* Package recommendation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Paquete recomendado (slug)</Label>
                  <Input
                    value={recommendedPkg}
                    onChange={(e) => setRecommendedPkg(e.target.value)}
                    placeholder="ej: starter_autonomy"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Razón del paquete</Label>
                  <Input
                    value={packageReason}
                    onChange={(e) => setPackageReason(e.target.value)}
                    placeholder="¿Por qué este paquete?"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Meeting summary */}
              <div>
                <Label className="text-xs">Resumen de reunión</Label>
                <Textarea
                  value={meetingSummary}
                  onChange={(e) => setMeetingSummary(e.target.value)}
                  placeholder="Notas de la conversación / reunión de diagnóstico..."
                  className="mt-1 min-h-[70px]"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} size="sm">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  Guardar auditoría
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function buildWhatsAppUrl(number: string, message: string): string {
  const clean = number.replace(/[^0-9]/g, '')
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
}

// Evidence level for outreach tone:
// A = high coverage (≥65%), mention observed specifics + estimates.
// B = medium coverage (40–64%), conditional language.
// C = low coverage (<40%), exploratory — no loss claims, no unconfirmed facts.
function outreachEvidenceLevel(ev: Evaluation): 'A' | 'B' | 'C' {
  const coverage = ev.researchCoverage ?? 100
  if (coverage >= 65) return 'A'
  if (coverage >= 40) return 'B'
  return 'C'
}

const OFFICIAL_URL = 'https://www.kronosdata.tech/'

function generateOutreachTemplate(
  channel: 'whatsapp' | 'email' | 'linkedin',
  version: number,
  companyName: string,
  industry: string,
  ev: Evaluation,
  contactName?: string | null,
  templateType: 'package' | 'individual_service' | 'free_audit' | 'exploratory' = 'individual_service',
): string {
  const nombre = contactName?.trim() || companyName || 'equipo'
  const revenue = `$${ev.estimatedRevenueLostPerMonth.toLocaleString()}`
  const implTime = ev.implementationTimeEstimate ?? '1–2 semanas'
  const primary = (ev.primaryService ?? ev.recommendedServices[0] ?? '').toLowerCase()
  const level = outreachEvidenceLevel(ev)
  const v = version % 2
  const pkgName = ev.recommendedPackageName ?? 'Sistemas de Operaciones Autónomas'

  // Free audit template — always exploratory, no claims
  if (templateType === 'free_audit' || level === 'C') {
    if (channel === 'whatsapp') {
      return v === 0
        ? `Hola ${nombre} 👋\n\nHice una revisión externa de ${companyName}, pero prefiero no asumir procesos internos únicamente con información pública.\n\nEl siguiente paso más útil sería una Auditoría Gratuita para validar oportunidades reales antes de recomendar una solución.\n\nPuedes conocer nuestro enfoque aquí:\n${OFFICIAL_URL}\n\nSi te parece, coordinamos una conversación breve. ¿Tienes 15 min esta semana?\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`
        : `Hola ${nombre},\n\nEncontré ${companyName} en mi investigación de negocios de ${industry} en la región.\n\nEn Kronos Data trabajamos con empresas de ${industry} para identificar oportunidades concretas de eficiencia y captación. El primer paso es siempre una conversación sin compromiso.\n\nTe comparto la web de Kronos Data para que veas cómo trabajamos:\n${OFFICIAL_URL}\n\n¿Podríamos hablar 15 min?\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`
    }
    if (channel === 'email') {
      return `Asunto: ${companyName} — Auditoría Gratuita de oportunidades\n\nHola ${nombre},\n\nSoy Alejandro de Kronos Data. Nos especializamos en ayudar a negocios de ${industry} a identificar y resolver sus principales fricciones operativas y digitales.\n\nMe gustaría explorar si hay oportunidades relevantes para ${companyName}. El primer paso es siempre una Auditoría Gratuita — sin compromiso.\n\nPuedes conocer nuestro enfoque aquí:\n${OFFICIAL_URL}\n\n¿Tienes 20 minutos esta semana?\n\nAlejandro Bri\nKronos Data\nalejandro@kronosdata.tech`
    }
    return `${nombre}, soy Alejandro de Kronos Data — ayudamos a negocios de ${industry} a resolver sus principales fricciones operativas y digitales.\n\nMe gustaría explorar si hay algo relevante para ${companyName}. El primer paso es una Auditoría Gratuita sin compromiso.\n\nPuedes conocer nuestro enfoque aquí:\n${OFFICIAL_URL}\n\n¿Tienes 15 min?\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`
  }

  // Package-focused template
  if (templateType === 'package' && ev.recommendedPackageName) {
    const maybeRevenue = level === 'B' ? `posiblemente ${revenue}/mes` : `${revenue}/mes`
    const implText = level === 'B' ? `En aproximadamente ${implTime}` : `Lo resolvemos en ${implTime}`
    const detected = level === 'B' ? 'encontré indicios de que' : 'detecté'
    if (channel === 'whatsapp') {
      return v === 0
        ? `Hola ${nombre} 👋\n\nRevisé ${companyName} y ${detected} oportunidades claras para el paquete "${pkgName}" de Kronos Data.\n\n${ev.probablePainPoint}\n\nEso puede representar ${maybeRevenue} en impacto potencial.\n\n${implText} lo resolvemos.\n\nPuedes conocer nuestro enfoque aquí:\n${OFFICIAL_URL}\n\nPreparé un diagnóstico inicial. ¿Tienes 15 min esta semana?\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`
        : `Hola ${nombre},\n\nAnalizando ${companyName} identifiqué que "${pkgName}" sería el mejor encaje para las necesidades actuales.\n\n${ev.probablePainPoint}\n\nImpacto estimado: ${maybeRevenue}.\n\nTe comparto cómo trabajamos:\n${OFFICIAL_URL}\n\n¿Podemos revisarlo en una llamada breve?\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`
    }
    if (channel === 'email') {
      const serviceList = [ev.primaryService, ...(ev.complementaryServices ?? [])].filter(Boolean)
      return `Asunto: ${companyName} — ${pkgName}\n\nHola ${nombre},\n\nAnalizamos ${companyName} y encontramos la siguiente oportunidad:\n\n${ev.probablePainPoint}\n\nEn negocios de ${industry}, eso puede representar ${maybeRevenue} al mes.\n\nEl mejor encaje sería nuestro paquete "${pkgName}", comenzando por:\n${serviceList.map((s) => `→ ${s}`).join('\n')}\n\nTiempo estimado de implementación: ${implTime}. ROI estimado: ${ev.estimatedRoiPotential}×.\n\nPuedes conocer nuestro enfoque aquí:\n${OFFICIAL_URL}\n\n¿Tienes 20 minutos esta semana para revisarlo juntos?\n\nAlejandro Bri\nKronos Data\nalejandro@kronosdata.tech`
    }
    // LinkedIn
    return v === 0
      ? `${nombre}, revisé ${companyName} (${industry}) y encontré oportunidades concretas.\n\n${ev.probablePainPoint}\n\nEso puede representar ${maybeRevenue} en impacto potencial.\n\nLa ruta que más probablemente encaja es "${pkgName}", ${implText}.\n\nPuedes conocer nuestro enfoque aquí:\n${OFFICIAL_URL}\n\n¿Tienes 20 min esta semana?\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`
      : `${nombre}, una pregunta directa sobre ${companyName}:\n\n${ev.probablePainPoint}\n\nEn negocios de ${industry} eso es ${maybeRevenue} de impacto estimado. El paquete "${pkgName}" lo resuelve directamente.\n\nTe comparto cómo trabajamos:\n${OFFICIAL_URL}\n\n¿Hablamos 15 min?\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`
  }

  // Individual service template (default for A/B levels)
  let scenario = 'followup'
  if (primary.includes('reserva') || primary.includes('cita')) scenario = 'booking'
  else if (primary.includes('google')) scenario = 'google'
  else if (primary.includes('reseña')) scenario = 'reviews'
  else if (primary.includes('funnel') || primary.includes('captura')) scenario = 'leads'
  else if (primary.includes('sitio web') || primary.includes('presencia') || primary.includes('redes') || primary.includes('diagnóstico') || primary.includes('auditor')) scenario = 'presence'

  const maybeRevenue = level === 'B' ? `posiblemente ${revenue}/mes` : `${revenue}/mes`
  const maybeDetected = level === 'B' ? 'es posible que haya' : 'detecté'
  const implText = level === 'B' ? `En aproximadamente ${implTime}` : `Lo resolvemos en ${implTime}`
  const webLine = `\nPuedes conocer nuestro enfoque aquí:\n${OFFICIAL_URL}\n`

  if (channel === 'whatsapp') {
    const tpl: Record<string, [string, string]> = {
      booking: [
        `Hola ${nombre} 👋\n\nVi que ${companyName} no tiene sistema de reservas online. En ${industry}, el 40% de las citas se intenta agendar fuera de horario — sin sistema, esos clientes eligen a quien responde primero.\n\nEso puede representar ${maybeRevenue} en citas no concretadas.\n${webLine}\n${implText} lo resolvemos. ¿Tienes 15 min esta semana?\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`,
        `Hola ${nombre},\n\n¿Cuántas reservas pierde ${companyName} fuera de horario?\n\nSin sistema automático hay prospectos que no se concretan — ${maybeRevenue} en ingresos que se evaporan.\n${webLine}\n${implText} tenemos el sistema listo. ¿Hablamos?\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`,
      ],
      google: [
        `Hola ${nombre} 👋\n\nBusqué "${companyName}" en Google y el perfil digital tiene margen de mejora importante.\n\nEl 76% de los clientes busca en Google antes de contactar. En ${industry}, la visibilidad local marca la diferencia — ${maybeRevenue} en consultas van a quien aparece primero.\n${webLine}\n${implText} lo optimizamos. ¿Hablamos?\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`,
        `Hola ${nombre},\n\nSi alguien busca "${industry}" en Google, ¿${companyName} aparece entre los primeros resultados?\n\n${maybeRevenue} en visibilidad perdida.\n${webLine}\n15 minutos y te muestro cómo cambiarlo.\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`,
      ],
      reviews: [
        `Hola ${nombre} 👋\n\nVi reseñas de ${companyName} en Google sin responder.\n\nEl 68% de los clientes lee las respuestas antes de decidir. Sin respuesta = señal negativa para los prospectos.\n\n${maybeRevenue} en conversiones en juego.\n${webLine}\nTenemos sistema automático de gestión. ¿Hablamos?\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`,
        `Hola ${nombre},\n\nLas reseñas sin responder de ${companyName} en Google pueden estar frenando a nuevos clientes.\n${webLine}\n${implText} lo resolvemos con gestión automática. ¿15 min esta semana?\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`,
      ],
      presence: [
        `Hola ${nombre} 👋\n\nRevisé la presencia digital de ${companyName} y ${maybeDetected} margen significativo de mejora para un negocio de ${industry}.\n\nCada cliente que no te encuentra online elige a la competencia. Impacto estimado: ${maybeRevenue}.\n${webLine}\n${implText} mejoramos el panorama. ¿Hablamos?\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`,
        `Hola ${nombre},\n\nAnalizamos ${companyName} y hay una brecha entre tu presencia digital actual y lo que los clientes de ${industry} esperan encontrar.\n\nImpacto estimado: ${maybeRevenue}.\n${webLine}\n¿Te muestro el análisis? 15 min.\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`,
      ],
      leads: [
        `Hola ${nombre} 👋\n\nRevisé ${companyName} y ${maybeDetected} oportunidad de capturar mejor los leads que ya llegan.\n\nEl tráfico que ya tienes no siempre se convierte — ${maybeRevenue} en oportunidades que se podrían retener.\n${webLine}\nFunnel optimizado en ${implTime}. ¿Hablamos?\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`,
        `Hola ${nombre},\n\nEn ${companyName} puede no haber un "paso siguiente" claro para los visitantes.\n\nSin CTA ni captura de contacto, el interés se pierde — ${maybeRevenue} en leads.\n${webLine}\n¿15 min para mostrarte la solución?\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`,
      ],
      followup: [
        `Hola ${nombre} 👋\n\nVi ${companyName} en ${industry} y ${maybeDetected} señales de que hay margen de mejora en seguimiento de leads.\n\nEso puede representar ${maybeRevenue} en clientes que eligen a la competencia por responder más rápido.\n${webLine}\n${implText} lo mejoramos. ¿Tienes 15 min?\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`,
        `Hola ${nombre},\n\n¿Los leads que llegan a ${companyName} reciben respuesta el mismo día?\n\nEn negocios de ${industry} esa velocidad marca la diferencia — ${maybeRevenue} de impacto estimado.\n${webLine}\n¿Hablamos 10 min?\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`,
      ],
    }
    const [t0, t1] = tpl[scenario] ?? tpl.followup
    return (v === 0 ? t0 : t1)
  }

  if (channel === 'email') {
    const subjects: Record<string, [string, string]> = {
      booking: [`${companyName}: citas que se pierden fuera de horario`, `Sistema de reservas para ${companyName}`],
      google: [`${companyName} — visibilidad en Google para ${industry}`, `Presencia en Google para ${companyName}`],
      reviews: [`Las reseñas de ${companyName} y su impacto en nuevos clientes`, `Gestión de reputación para ${companyName}`],
      presence: [`Presencia digital de ${companyName} — análisis`, `Análisis de presencia digital — ${companyName}`],
      leads: [`Captación de leads en ${companyName}`, `${companyName}: cómo capturar el tráfico que ya tienes`],
      followup: [`Seguimiento de leads en ${companyName}`, `${companyName}: optimización comercial`],
    }
    const [s0, s1] = subjects[scenario] ?? subjects.followup
    const subject = v === 0 ? s0 : s1
    const serviceList = [ev.primaryService, ...(ev.complementaryServices ?? [])].filter(Boolean)
    return `Asunto: ${subject}\n\nHola ${nombre},\n\nAnalizamos el perfil digital de ${companyName} y encontramos la siguiente oportunidad:\n\n${ev.probablePainPoint}\n\nEn negocios de ${industry}, eso puede representar ${maybeRevenue} al mes.\n\nServicios que resuelven esto directamente:\n${serviceList.map((s) => `→ ${s}`).join('\n')}\n\nTiempo estimado de implementación: ${implTime}. ROI estimado: ${ev.estimatedRoiPotential}×.\n\nPuedes conocer nuestro enfoque aquí:\n${OFFICIAL_URL}\n\n¿Tienes 20 minutos esta semana para revisarlo juntos?\n\nAlejandro Bri\nKronos Data\nalejandro@kronosdata.tech`
  }

  // LinkedIn
  return v === 0
    ? `${nombre}, revisé la presencia digital de ${companyName} (${industry}) y encontré una oportunidad concreta.\n\n${ev.probablePainPoint}\n\nEso puede representar ${maybeRevenue} en clientes que no se convierten.\n\n${implText}.\n\nPuedes conocer nuestro enfoque aquí:\n${OFFICIAL_URL}\n\n¿Tienes 20 min esta semana?\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`
    : `${nombre}, una pregunta directa sobre ${companyName}:\n\n¿Los leads que llegan por digital reciben seguimiento el mismo día?\n\nEn negocios de ${industry} esa velocidad es clave — ${maybeRevenue} de impacto estimado.\n\nTe comparto cómo trabajamos:\n${OFFICIAL_URL}\n\n¿Hablamos 15 min?\n\nAlejandro | Kronos Data\nalejandro@kronosdata.tech`
}

function OutreachPanel({
  companyId,
  evaluation,
  companyName,
  industry,
  contactName,
  whatsapp,
}: {
  companyId: string
  evaluation: Evaluation | null
  companyName: string
  industry: string
  contactName?: string | null
  whatsapp?: string | null
}) {
  const [records, setRecords] = useState<OutreachRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [channel, setChannel] = useState('')
  const [message, setMessage] = useState('')
  const [responseReceived, setResponseReceived] = useState(false)
  const [responseType, setResponseType] = useState('')
  const [responseNotes, setResponseNotes] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const [templateChannel, setTemplateChannel] = useState<'whatsapp' | 'email' | 'linkedin'>('whatsapp')
  const [templateVersion, setTemplateVersion] = useState(0)
  const [editingTemplate, setEditingTemplate] = useState(false)
  const [editedTemplate, setEditedTemplate] = useState('')
  const [copied, setCopied] = useState(false)

  // Default template type based on package confidence and coverage
  const defaultTemplateType = (): 'package' | 'individual_service' | 'free_audit' | 'exploratory' => {
    if (!evaluation) return 'exploratory'
    const level = outreachEvidenceLevel(evaluation)
    if (level === 'C') return 'free_audit'
    if (evaluation.recommendedPackageSlug && evaluation.recommendedPackageSlug !== 'auditoria_gratuita' &&
        (evaluation.packageConfidence === 'high' || evaluation.packageConfidence === 'medium')) return 'package'
    return 'individual_service'
  }
  const [templateType, setTemplateType] = useState<'package' | 'individual_service' | 'free_audit' | 'exploratory'>(defaultTemplateType())

  const liveTemplate = evaluation
    ? generateOutreachTemplate(templateChannel, templateVersion, companyName, industry, evaluation, contactName, templateType)
    : ''
  const templateText = editingTemplate ? editedTemplate : liveTemplate

  useEffect(() => {
    listOutreach(companyId).then((r) => { setRecords(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [companyId])

  function handleCopy() {
    navigator.clipboard.writeText(templateText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleEdit() {
    setEditedTemplate(templateText)
    setEditingTemplate(true)
  }

  function handleNextVersion() {
    setEditingTemplate(false)
    setTemplateVersion((v) => v + 1)
  }

  function openModalFromTemplate() {
    setChannel(templateChannel)
    setMessage(templateText)
    setResponseReceived(false)
    setResponseType('')
    setResponseNotes('')
    setModalOpen(true)
  }

  function openModalBlank() {
    setChannel('')
    setMessage('')
    setResponseReceived(false)
    setResponseType('')
    setResponseNotes('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!channel) return
    setSaving(true)
    try {
      const rec = await createOutreach(companyId, {
        channel,
        messageSent: message.trim() || undefined,
        sentBy: 'alejandro@kronosdata.tech',
        responseReceived,
        responseType: responseType || undefined,
        responseNotes: responseNotes.trim() || undefined,
        sequenceNumber: records.length + 1,
        // Commercial alignment tracking
        packageSlug: evaluation?.recommendedPackageSlug ?? undefined,
        individualService: evaluation?.primaryService ?? undefined,
        evidenceLevel: evaluation ? outreachEvidenceLevel(evaluation) : undefined,
        templateType,
        officialUrlIncluded: true,
        catalogVersion: evaluation?.catalogVersion ?? undefined,
      })
      setRecords([rec, ...records])
      setModalOpen(false)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const channelIcon: Record<string, string> = {
    linkedin: '💼', email: '📧', whatsapp: '💬', instagram: '📷', call: '📞', other: '🔗',
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Suggested Template ── */}
      {evaluation && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50/40">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-amber-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
              <span className="text-sm font-semibold text-amber-900">Plantilla Sugerida</span>
              <span className="text-xs text-slate-500">· Score {evaluation.opportunityScore} · {evaluation.primaryService ?? evaluation.recommendedServices[0]}</span>
              {evaluation.evaluationStatus === 'manual_review_required' && (
                <span className="text-xs rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-amber-700 font-medium">
                  Nivel C — exploratoria (datos insuficientes)
                </span>
              )}
              {evaluation.evaluationStatus === 'preliminary' && (
                <span className="text-xs rounded-full bg-yellow-100 border border-yellow-300 px-2 py-0.5 text-yellow-700 font-medium">
                  Nivel B — lenguaje condicional
                </span>
              )}
            </div>
            <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-xs text-amber-700 font-medium shrink-0">
              No enviada
            </span>
          </div>
          {/* Contact availability */}
          <div className="px-4 pt-3 pb-0 flex flex-wrap gap-3 text-xs">
            <span className="font-semibold text-slate-500">Contactos localizados:</span>
            {whatsapp
              ? <span className="text-green-700 font-medium">💬 WhatsApp {whatsapp}</span>
              : <span className="text-slate-400">💬 Sin WhatsApp</span>
            }
            {contactName
              ? <span className="text-green-700 font-medium">👤 {contactName}</span>
              : <span className="text-slate-400">👤 Sin contacto identificado</span>
            }
          </div>

          {/* Template type selector */}
          <div className="flex flex-wrap gap-1 px-4 pt-3 pb-1 border-b border-amber-100">
            {([
              { value: 'package', label: '📦 Paquete', show: !!(evaluation.recommendedPackageSlug && evaluation.recommendedPackageSlug !== 'auditoria_gratuita') },
              { value: 'individual_service', label: '⚡ Servicio', show: true },
              { value: 'free_audit', label: '🆓 Auditoría Gratuita', show: true },
              { value: 'exploratory', label: '🔍 Exploratorio', show: true },
            ] as const).filter(t => t.show).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setTemplateType(value as typeof templateType); setEditingTemplate(false) }}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  templateType === value ? 'bg-amber-800 text-white' : 'text-amber-700 hover:bg-amber-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-1 px-4 pt-2">
            {(['whatsapp', 'email', 'linkedin'] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => { setTemplateChannel(ch); setEditingTemplate(false) }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  templateChannel === ch ? 'bg-amber-900 text-white' : 'text-amber-800 hover:bg-amber-100'
                }`}
              >
                {ch === 'whatsapp' ? '💬' : ch === 'email' ? '📧' : '💼'}{' '}
                {ch.charAt(0).toUpperCase() + ch.slice(1)}
              </button>
            ))}
          </div>

          <div className="px-4 pt-3 pb-2">
            {editingTemplate ? (
              <Textarea
                value={editedTemplate}
                onChange={(e) => setEditedTemplate(e.target.value)}
                className="min-h-[160px] text-sm bg-white border-amber-200 font-mono"
              />
            ) : (
              <div className="rounded-lg bg-white border border-amber-100 px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {templateText}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
            <Button
              size="sm" variant="outline"
              className="border-amber-200 text-amber-800 hover:bg-amber-100 h-8 text-xs"
              onClick={handleCopy}
            >
              {copied ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            {templateChannel === 'whatsapp' && whatsapp && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs" asChild>
                <a href={buildWhatsAppUrl(whatsapp, templateText)} target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="h-3 w-3" /> Abrir WhatsApp
                </a>
              </Button>
            )}
            {editingTemplate ? (
              <Button
                size="sm" variant="outline"
                className="border-amber-200 text-amber-800 hover:bg-amber-100 h-8 text-xs"
                onClick={() => setEditingTemplate(false)}
              >
                <X className="h-3 w-3" /> Cancelar
              </Button>
            ) : (
              <Button
                size="sm" variant="outline"
                className="border-amber-200 text-amber-800 hover:bg-amber-100 h-8 text-xs"
                onClick={handleEdit}
              >
                <Pencil className="h-3 w-3" /> Editar
              </Button>
            )}
            <Button
              size="sm" variant="outline"
              className="border-amber-200 text-amber-800 hover:bg-amber-100 h-8 text-xs"
              onClick={handleNextVersion}
            >
              <RefreshCw className="h-3 w-3" /> Nueva versión
            </Button>
            <Button
              size="sm"
              className="ml-auto bg-amber-900 hover:bg-amber-800 text-white h-8 text-xs"
              onClick={openModalFromTemplate}
            >
              <Send className="h-3 w-3" /> Registrar como enviado
            </Button>
          </div>
        </div>
      )}

      {/* ── History header ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">
          Historial de contactos
          <span className="ml-2 text-slate-400 font-normal">({records.length})</span>
        </p>
        <Button size="sm" variant="outline" onClick={openModalBlank}>
          <Plus className="h-3 w-3" /> Registrar contacto
        </Button>
      </div>

      {/* ── History list ── */}
      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm rounded-xl border-2 border-dashed border-slate-200">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-200" />
          Sin contactos registrados todavía.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {records.map((r) => {
            const isExpanded = expandedIds.has(r.id)
            const PREVIEW = 120
            const needsTrunc = (r.messageSent?.length ?? 0) > PREVIEW
            return (
              <div key={r.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="flex">
                  <div className={`w-1 shrink-0 ${r.responseReceived ? 'bg-blue-400' : 'bg-green-400'}`} />
                  <div className="flex-1 p-4">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base">{channelIcon[r.channel] ?? '🔗'}</span>
                        <span className="font-semibold text-sm capitalize text-slate-800">{r.channel}</span>
                        <span className="text-xs text-slate-400">· #{r.sequenceNumber}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs text-green-700 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Enviado
                        </span>
                        {r.responseReceived ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> Respondió
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs text-slate-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Sin respuesta
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">
                        {new Date(r.sentAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </span>
                    </div>

                    {r.messageSent && (
                      <div className="mb-2">
                        <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap">
                          {isExpanded || !needsTrunc
                            ? r.messageSent
                            : `${r.messageSent.slice(0, PREVIEW)}…`}
                        </p>
                        {needsTrunc && (
                          <button
                            onClick={() => toggleExpand(r.id)}
                            className="flex items-center gap-1 mt-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {isExpanded
                              ? <><ChevronUp className="h-3 w-3" /> Ocultar mensaje</>
                              : <><ChevronDown className="h-3 w-3" /> Ver mensaje completo</>}
                          </button>
                        )}
                      </div>
                    )}

                    {r.responseType && (
                      <p className="text-xs text-slate-500">
                        Respuesta: <span className="font-medium capitalize">{r.responseType.replace(/_/g, ' ')}</span>
                      </p>
                    )}
                    {r.responseNotes && (
                      <p className="text-xs text-slate-400 mt-0.5 italic">"{r.responseNotes}"</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal: Register outreach ── */}
      <Dialog open={modalOpen} onOpenChange={(o) => { if (!saving) setModalOpen(o) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar contacto</DialogTitle>
            <DialogDescription className="text-xs">
              Guarda el mensaje enviado y el resultado del contacto.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Canal *</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Canal" /></SelectTrigger>
                  <SelectContent>
                    {OUTREACH_CHANNELS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={responseReceived}
                    onChange={(e) => setResponseReceived(e.target.checked)}
                    className="rounded"
                  />
                  Recibió respuesta
                </label>
              </div>
            </div>
            <div>
              <Label className="text-xs">Mensaje enviado</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Pega o escribe el mensaje aquí..."
                className="mt-1 min-h-[120px] text-xs font-mono"
              />
            </div>
            {responseReceived && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tipo de respuesta</Label>
                  <Select value={responseType} onValueChange={setResponseType}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Respuesta" /></SelectTrigger>
                    <SelectContent>
                      {RESPONSE_TYPES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Notas de la respuesta</Label>
                  <Input
                    value={responseNotes}
                    onChange={(e) => setResponseNotes(e.target.value)}
                    placeholder="¿Qué dijo?"
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!channel || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Guardar contacto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SalesNotePanel({ companyId, initial }: { companyId: string; initial: SalesNote | null }) {
  const [note, setNote] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [contactName, setContactName] = useState(initial?.contactName ?? '')
  const [contactRole, setContactRole] = useState(initial?.contactRole ?? '')
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? '')
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? '')
  const [contactStatus, setContactStatus] = useState(initial?.contactStatus ?? '')
  const [meetingStatus, setMeetingStatus] = useState(initial?.meetingStatus ?? '')
  const [objections, setObjections] = useState(initial?.objections ?? '')
  const [nextAction, setNextAction] = useState(initial?.nextAction ?? '')
  const [closeProbability, setCloseProbability] = useState(initial?.closeProbability?.toString() ?? '')
  const [assignedTo, setAssignedTo] = useState(initial?.assignedTo ?? '')
  const [salesObservations, setSalesObservations] = useState(initial?.salesObservations ?? '')
  // Phase 4 CRM fields
  const [preferredChannel, setPreferredChannel] = useState(initial?.preferredChannel ?? '')
  const [potentialValue, setPotentialValue] = useState(initial?.potentialValue?.toString() ?? '')
  const [proposedPackageSlug, setProposedPackageSlug] = useState(initial?.proposedPackageSlug ?? '')
  const [internalNotes, setInternalNotes] = useState(initial?.internalNotes ?? '')

  async function save() {
    setSaving(true)
    try {
      const updated = await upsertSalesNote(companyId, {
        contactName: contactName.trim() || undefined,
        contactRole: contactRole.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactStatus: contactStatus || undefined,
        meetingStatus: meetingStatus || undefined,
        objections: objections.trim() || undefined,
        nextAction: nextAction.trim() || undefined,
        closeProbability: closeProbability ? parseInt(closeProbability) : undefined,
        assignedTo: assignedTo.trim() || undefined,
        salesObservations: salesObservations.trim() || undefined,
        preferredChannel: preferredChannel || undefined,
        potentialValue: potentialValue ? parseFloat(potentialValue) : undefined,
        proposedPackageSlug: proposedPackageSlug.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
      })
      setNote(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Contacto principal</Label>
          <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nombre" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Cargo</Label>
          <Input value={contactRole} onChange={(e) => setContactRole(e.target.value)} placeholder="Gerente General" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Teléfono / WhatsApp</Label>
          <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+51..." className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@empresa.com" className="mt-1" />
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <Label className="text-xs">Estado de contacto</Label>
          <Select value={contactStatus} onValueChange={setContactStatus}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {CONTACT_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Estado de reunión</Label>
          <Select value={meetingStatus} onValueChange={setMeetingStatus}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Reunión" />
            </SelectTrigger>
            <SelectContent>
              {MEETING_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Canal preferido</Label>
          <Select value={preferredChannel} onValueChange={setPreferredChannel}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              {OUTREACH_CHANNELS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">% de cierre estimado</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={closeProbability}
            onChange={(e) => setCloseProbability(e.target.value)}
            placeholder="0–100"
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Valor potencial (USD)</Label>
          <Input
            type="number"
            value={potentialValue}
            onChange={(e) => setPotentialValue(e.target.value)}
            placeholder="Ej: 2500"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Paquete propuesto (slug)</Label>
          <Input
            value={proposedPackageSlug}
            onChange={(e) => setProposedPackageSlug(e.target.value)}
            placeholder="ej: starter_autonomy"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Objeciones detectadas</Label>
        <Textarea value={objections} onChange={(e) => setObjections(e.target.value)} placeholder="¿Qué frena al prospecto?" className="mt-1 min-h-[60px]" />
      </div>

      <div>
        <Label className="text-xs">Próxima acción</Label>
        <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Ej: Enviar propuesta el viernes" className="mt-1" />
      </div>

      <div>
        <Label className="text-xs">Observaciones de ventas</Label>
        <Textarea value={salesObservations} onChange={(e) => setSalesObservations(e.target.value)} placeholder="Notas internas del vendedor..." className="mt-1 min-h-[80px]" />
      </div>

      <div>
        <Label className="text-xs">Notas internas (solo equipo)</Label>
        <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Contexto interno, alertas, recordatorios..." className="mt-1 min-h-[60px]" />
      </div>

      <div>
        <Label className="text-xs">Asignado a</Label>
        <Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Nombre o email del vendedor" className="mt-1" />
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : null}
          {saved ? 'Guardado' : 'Guardar Nota'}
        </Button>
      </div>
    </div>
  )
}

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [revaluating, setRevaluating] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)

  useEffect(() => {
    getCompany(id)
      .then(setCompany)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    setDeleting(true)
    try { await deleteCompany(id); router.push('/') }
    catch { setDeleting(false); setDeleteOpen(false) }
  }

  async function handleRevaluate() {
    if (!company?.latestEvaluation) return
    setRevaluating(true)
    const ev = company.latestEvaluation
    const signals: Record<string, boolean> = {}
    for (const s of SIGNAL_DEFINITIONS) signals[s.key] = (ev as unknown as Record<string, boolean>)[s.key]
    try {
      const newEv = await evaluateCompany(id, { evaluatedBy: 'alejandro@kronosdata.tech', ...signals })
      setCompany((prev) => prev ? { ...prev, latestEvaluation: newEv, latestOpportunityScore: newEv.opportunityScore, latestPriorityLevel: newEv.priorityLevel } : prev)
    } catch { /* ignore */ }
    finally { setRevaluating(false) }
  }

  async function handleReprocess() {
    setReprocessing(true)
    try {
      await reprocessCompany(id)
      const updated = await getCompany(id)
      setCompany(updated)
    } catch { /* ignore */ }
    finally { setReprocessing(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center p-16 text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  )

  if (error || !company) return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-red-600 text-sm">
        <AlertCircle className="h-4 w-4" />
        {error || 'Empresa no encontrada'}
      </div>
      <Button variant="outline" size="sm" className="mt-4" asChild>
        <Link href="/">← Volver</Link>
      </Button>
    </div>
  )

  const statusLabels: Record<string, string> = {
    active: 'Activo', contacted: 'Contactado', client: 'Cliente', archived: 'Archivado',
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-0.5" asChild>
            <Link href="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
              {company.latestEvaluatedAt && (
                <Badge variant={priorityVariant(company.latestPriorityLevel)}>
                  {company.latestPriorityLevel.toUpperCase()}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {company.industry} · {company.city ? `${company.city}, ` : ''}{company.country.toUpperCase()}
              {company.leadSource && ` · Fuente: ${company.leadSource.replace(/_/g, ' ')}`}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              {company.website && <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 underline truncate max-w-[200px]">{company.website}</a>}
              {company.whatsapp && <span>📱 {company.whatsapp}</span>}
              {company.instagram && <span>📷 {company.instagram}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {company.latestEvaluation && (
            <Button variant="outline" size="sm" onClick={handleReprocess} disabled={reprocessing}
              title="Recalcula con el modelo de evidencia (corrige señales sin datos)">
              <RefreshCw className={`h-4 w-4 ${reprocessing ? 'animate-spin' : ''}`} /> Reprocesar
            </Button>
          )}
          {company.latestEvaluation && (
            <Button variant="outline" size="sm" onClick={handleRevaluate} disabled={revaluating}>
              <RefreshCw className={`h-4 w-4 ${revaluating ? 'animate-spin' : ''}`} /> Re-evaluar
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/companies/${id}/edit`}><Edit className="h-4 w-4" /> Editar</Link>
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Composite score summary bar */}
      {(company.salesPriority || company.evidenceTier || company.salesOpportunityScore !== null) && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border bg-slate-50 px-4 py-3">
          <Target className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Scoring compuesto</span>
          {company.salesPriority && (
            <span className={`text-xs font-bold border rounded-full px-2.5 py-0.5 ${SALES_PRIORITY_CONFIG[company.salesPriority]?.cls ?? 'bg-slate-100 text-slate-500'}`}>
              {SALES_PRIORITY_CONFIG[company.salesPriority]?.label ?? company.salesPriority}
            </span>
          )}
          {company.evidenceTier && (
            <span className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${EVIDENCE_TIER_CONFIG[company.evidenceTier]?.cls ?? 'bg-slate-100 text-slate-500'}`}>
              {EVIDENCE_TIER_CONFIG[company.evidenceTier]?.label ?? company.evidenceTier}
            </span>
          )}
          {company.salesOpportunityScore !== null && (
            <span className="text-xs text-slate-400 ml-auto">Sales Opp: <strong className="text-slate-700">{company.salesOpportunityScore}</strong></span>
          )}
        </div>
      )}

      {/* Main content */}
      <Tabs defaultValue="evaluation">
        <TabsList className="mb-4">
          <TabsTrigger value="evaluation">Evaluación</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="outreach">Outreach</TabsTrigger>
          <TabsTrigger value="sales">Notas de Venta</TabsTrigger>
          <TabsTrigger value="audit">Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="evaluation">
          {company.latestEvaluation ? (
            <EvaluationView ev={company.latestEvaluation} />
          ) : (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Zap className="h-10 w-10 text-slate-200" />
              <div>
                <p className="font-medium text-slate-700">Sin evaluación</p>
                <p className="text-sm text-slate-400 mt-1">Esta empresa aún no ha sido evaluada.</p>
              </div>
              <Button size="sm" asChild>
                <Link href={`/companies/${id}/edit`}>Ir a Editar y Evaluar</Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pipeline">
          <PipelinePanel
            companyId={id}
            initialNote={company.salesNote}
            company={company}
          />
        </TabsContent>

        <TabsContent value="outreach">
          <OutreachPanel
            companyId={id}
            evaluation={company.latestEvaluation}
            companyName={company.name}
            industry={company.industry}
            contactName={company.salesNote?.contactName}
            whatsapp={company.whatsapp}
          />
        </TabsContent>

        <TabsContent value="sales">
          <SalesNotePanel companyId={id} initial={company.salesNote} />
        </TabsContent>

        <TabsContent value="audit">
          <AuditPanel companyId={id} industry={company.industry} />
        </TabsContent>
      </Tabs>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar empresa</DialogTitle>
            <DialogDescription>
              ¿Seguro que deseas eliminar <strong>{company.name}</strong>? Se eliminarán también todas sus evaluaciones, contactos y notas. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
