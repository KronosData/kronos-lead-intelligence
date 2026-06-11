'use client'
import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Edit, Trash2, RefreshCw, AlertCircle, Loader2,
  TrendingDown, DollarSign, Zap, Clock, CheckCircle2, XCircle,
  MessageSquare, Phone, Mail, Calendar, ChevronDown, ChevronUp, Send
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
  evaluateCompany, deleteCompany,
  type CompanyDetail, type Evaluation, type OutreachRecord, type SalesNote,
} from '@/lib/api-client'
import { SIGNAL_DEFINITIONS, OUTREACH_CHANNELS, RESPONSE_TYPES, CONTACT_STATUSES, MEETING_STATUSES } from '@/lib/constants'
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

  const categoryScores = [
    { label: 'Generación de Leads', value: ev.scoreLeadGeneration },
    { label: 'Seguimiento', value: ev.scoreFollowUp },
    { label: 'Conversión', value: ev.scoreConversionProcess },
    { label: 'Automatización', value: ev.scoreAutomationOpportunity },
    { label: 'Presencia Online', value: ev.scoreOnlinePresence },
    { label: 'Reputación', value: ev.scoreReputation },
  ]

  return (
    <div className="flex flex-col gap-6">
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
          <p className="text-xs text-slate-400 mt-1">ROI estimado: {ev.estimatedRoiPotential}×</p>
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
            <CardTitle className="text-sm text-slate-700">Dolor Probable</CardTitle>
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

      {/* Recommended services */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-700">Servicios Recomendados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ev.recommendedServices.map((s) => (
              <span key={s} className="inline-flex items-center rounded-md border bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
                {s}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

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
        </button>
        {showProblems && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ev.detectedProblems.map((p) => (
              <div key={p} className="flex items-start gap-2 rounded-md bg-red-50 border border-red-100 px-3 py-2">
                <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                <span className="text-xs text-red-700">{p}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Signal summary */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Señales evaluadas</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {SIGNAL_DEFINITIONS.map((s) => {
            const val = (ev as unknown as Record<string, boolean>)[s.key]
            const isGood = s.problemWhen ? !val : val
            return (
              <div
                key={s.key}
                className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${
                  isGood ? 'text-slate-500' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {isGood
                  ? <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
                  : <XCircle className="h-3 w-3 text-amber-500 shrink-0" />
                }
                {s.label}
              </div>
            )
          })}
        </div>
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

function OutreachPanel({ companyId }: { companyId: string }) {
  const [records, setRecords] = useState<OutreachRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [channel, setChannel] = useState('')
  const [message, setMessage] = useState('')
  const [responseReceived, setResponseReceived] = useState(false)
  const [responseType, setResponseType] = useState('')
  const [responseNotes, setResponseNotes] = useState('')

  useEffect(() => {
    listOutreach(companyId).then((r) => { setRecords(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [companyId])

  async function handleAdd() {
    if (!channel) return
    setSaving(true)
    try {
      const rec = await createOutreach(companyId, {
        channel,
        messageSent: message.trim() || undefined,
        sentBy: 'alejandro@kronosdata.com',
        responseReceived,
        responseType: responseType || undefined,
        responseNotes: responseNotes.trim() || undefined,
        sequenceNumber: records.length + 1,
      })
      setRecords([rec, ...records])
      setAdding(false)
      setChannel(''); setMessage(''); setResponseReceived(false); setResponseType(''); setResponseNotes('')
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const channelIcon: Record<string, string> = {
    linkedin: '💼', email: '📧', whatsapp: '💬', instagram: '📷', call: '📞', other: '🔗',
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{records.length} contacto{records.length !== 1 ? 's' : ''} registrado{records.length !== 1 ? 's' : ''}</p>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
          <Send className="h-3 w-3" /> {adding ? 'Cancelar' : 'Registrar Contacto'}
        </Button>
      </div>

      {adding && (
        <Card>
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Canal *</Label>
                <Select value={channel} onValueChange={setChannel}>
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
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={responseReceived} onChange={(e) => setResponseReceived(e.target.checked)} className="rounded" />
                  Recibió respuesta
                </label>
              </div>
            </div>
            <div>
              <Label className="text-xs">Mensaje enviado</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Resumen o copia del mensaje..."
                className="mt-1 min-h-[60px]"
              />
            </div>
            {responseReceived && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tipo de respuesta</Label>
                  <Select value={responseType} onValueChange={setResponseType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Respuesta" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESPONSE_TYPES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Notas de respuesta</Label>
                  <Input
                    value={responseNotes}
                    onChange={(e) => setResponseNotes(e.target.value)}
                    placeholder="¿Qué dijo?"
                    className="mt-1"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button size="sm" onClick={handleAdd} disabled={!channel || saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
      ) : records.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-200" />
          Sin contactos registrados. Registra tu primer intento arriba.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {records.map((r) => (
            <div key={r.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>{channelIcon[r.channel] ?? '🔗'}</span>
                  <span className="font-medium text-sm capitalize">{r.channel}</span>
                  <span className="text-xs text-slate-400">· Intento #{r.sequenceNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  {r.responseReceived ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs text-green-700">
                      <CheckCircle2 className="h-3 w-3" /> Respondió
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs text-slate-500">
                      Sin respuesta
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {new Date(r.sentAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </span>
                </div>
              </div>
              {r.messageSent && <p className="text-sm text-slate-600 bg-slate-50 rounded px-3 py-2 mb-2">{r.messageSent}</p>}
              {r.responseType && <p className="text-xs text-slate-500">Respuesta: {r.responseType.replace(/_/g, ' ')}</p>}
              {r.responseNotes && <p className="text-xs text-slate-500 mt-1">{r.responseNotes}</p>}
            </div>
          ))}
        </div>
      )}
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

      <div className="grid grid-cols-3 gap-4">
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
      const newEv = await evaluateCompany(id, { evaluatedBy: 'alejandro@kronosdata.com', ...signals })
      setCompany((prev) => prev ? { ...prev, latestEvaluation: newEv, latestOpportunityScore: newEv.opportunityScore, latestPriorityLevel: newEv.priorityLevel } : prev)
    } catch { /* ignore */ }
    finally { setRevaluating(false) }
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

      {/* Main content */}
      <Tabs defaultValue="evaluation">
        <TabsList className="mb-4">
          <TabsTrigger value="evaluation">Evaluación</TabsTrigger>
          <TabsTrigger value="outreach">Outreach</TabsTrigger>
          <TabsTrigger value="sales">Notas de Venta</TabsTrigger>
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

        <TabsContent value="outreach">
          <OutreachPanel companyId={id} />
        </TabsContent>

        <TabsContent value="sales">
          <SalesNotePanel companyId={id} initial={company.salesNote} />
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
