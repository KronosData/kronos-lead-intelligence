'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { getCompany, updateCompany, evaluateCompany, type CompanyDetail, type Evaluation } from '@/lib/api-client'
import { SIGNAL_DEFINITIONS, COUNTRIES, LEAD_SOURCES, INDUSTRY_SUGGESTIONS, COMPANY_STATUSES } from '@/lib/constants'

const CATEGORY_LABELS: Record<string, string> = {
  lead_generation: 'Generación de Leads',
  follow_up: 'Seguimiento',
  conversion: 'Conversión',
  automation: 'Automatización',
  online_presence: 'Presencia Online',
  reputation: 'Reputación',
}

const SIGNAL_BY_CATEGORY: Record<string, typeof SIGNAL_DEFINITIONS> = {}
for (const s of SIGNAL_DEFINITIONS) {
  if (!SIGNAL_BY_CATEGORY[s.category]) SIGNAL_BY_CATEGORY[s.category] = []
  SIGNAL_BY_CATEGORY[s.category].push(s)
}

function priorityVariant(p: string): 'hot' | 'high' | 'medium' | 'low' | 'secondary' {
  if (p === 'hot') return 'hot'
  if (p === 'high') return 'high'
  if (p === 'medium') return 'medium'
  if (p === 'low') return 'low'
  return 'secondary'
}

export default function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [latestEvaluation, setLatestEvaluation] = useState<Evaluation | null>(null)
  const [savedOk, setSavedOk] = useState(false)

  // Company fields
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [customIndustry, setCustomIndustry] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [website, setWebsite] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [instagram, setInstagram] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState('')
  const [leadSource, setLeadSource] = useState('')
  const [status, setStatus] = useState('')

  // Signal state
  const [signals, setSignals] = useState<Record<string, boolean>>({})

  useEffect(() => {
    getCompany(id)
      .then((c: CompanyDetail) => {
        setName(c.name)
        const knownIndustry = INDUSTRY_SUGGESTIONS.find((s) => s === c.industry)
        if (knownIndustry) { setIndustry(knownIndustry) }
        else { setIndustry('Otro'); setCustomIndustry(c.industry) }
        setCountry(c.country)
        setCity(c.city ?? '')
        setWebsite(c.website ?? '')
        setWhatsapp(c.whatsapp ?? '')
        setInstagram(c.instagram ?? '')
        setLinkedin(c.linkedin ?? '')
        setGoogleBusinessUrl(c.googleBusinessUrl ?? '')
        setLeadSource(c.leadSource ?? '')
        setStatus(c.status)
        setLatestEvaluation(c.latestEvaluation)

        // Pre-fill signals from latest evaluation
        const init: Record<string, boolean> = {}
        for (const s of SIGNAL_DEFINITIONS) {
          init[s.key] = c.latestEvaluation
            ? (c.latestEvaluation as unknown as Record<string, boolean>)[s.key] ?? false
            : false
        }
        setSignals(init)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const finalIndustry = industry === 'Otro' ? customIndustry : industry

  function toggleSignal(key: string) {
    setSignals((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSave() {
    if (!name.trim() || !finalIndustry.trim() || !country) {
      setError('Nombre, industria y país son requeridos.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateCompany(id, {
        name: name.trim(),
        industry: finalIndustry.trim(),
        country,
        city: city.trim() || undefined,
        website: website.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        instagram: instagram.trim() || undefined,
        linkedin: linkedin.trim() || undefined,
        googleBusinessUrl: googleBusinessUrl.trim() || undefined,
        leadSource: leadSource || undefined,
        status,
      })
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleEvaluate() {
    setEvaluating(true)
    setError('')
    try {
      const ev = await evaluateCompany(id, {
        evaluatedBy: 'alejandro@kronosdata.tech',
        ...signals,
      })
      setLatestEvaluation(ev)
      router.push(`/companies/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al evaluar')
    } finally {
      setEvaluating(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center p-16 text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  )

  if (error && !name) return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-red-600 text-sm mb-4">
        <AlertCircle className="h-4 w-4" /> {error}
      </div>
      <Button variant="outline" size="sm" asChild><Link href="/">← Volver</Link></Button>
    </div>
  )

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/companies/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Editar Empresa</h1>
          <p className="text-sm text-slate-500">{name || 'Cargando...'}</p>
        </div>
        {latestEvaluation && latestEvaluation.priorityLevel && (
          <Badge variant={priorityVariant(latestEvaluation.priorityLevel)} className="ml-2">
            {latestEvaluation.priorityLevel.toUpperCase()} · {latestEvaluation.opportunityScore ?? '—'}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
        {/* Left: Company Info */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Información de la Empresa</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
              </div>

              <div>
                <Label>Industria *</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_SUGGESTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {industry === 'Otro' && (
                  <Input
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    placeholder="Especifica la industria..."
                    className="mt-2"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>País *</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="city">Ciudad</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Estado</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMPANY_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fuente del Lead</Label>
                  <Select value={leadSource} onValueChange={setLeadSource}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Fuente" /></SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Presencia Digital</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div>
                <Label htmlFor="website">Sitio Web</Label>
                <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input id="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input id="linkedin" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="gbusiness">Google Business</Label>
                  <Input id="gbusiness" value={googleBusinessUrl} onChange={(e) => setGoogleBusinessUrl(e.target.value)} className="mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save button */}
          <div className="flex items-center gap-3">
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <Button onClick={handleSave} disabled={saving} className="ml-auto" variant="outline">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : savedOk ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : null}
              {savedOk ? 'Guardado' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>

        {/* Right: Signal Checklist + Re-evaluate */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Señales Actualizadas</CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Actualiza las señales y haz clic en "Re-evaluar" para obtener un nuevo score.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {Object.entries(SIGNAL_BY_CATEGORY).map(([cat, sigs]) => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </p>
                  <div className="flex flex-col gap-2">
                    {sigs.map((s) => (
                      <label
                        key={s.key}
                        className={`flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors ${
                          signals[s.key]
                            ? s.problemWhen ? 'bg-red-50' : 'bg-green-50'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <Checkbox
                          checked={!!signals[s.key]}
                          onCheckedChange={() => toggleSignal(s.key)}
                        />
                        <span className="text-sm text-slate-700">{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <Separator />

              <Button onClick={handleEvaluate} disabled={evaluating} className="w-full">
                {evaluating
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Evaluando...</>
                  : <><RefreshCw className="h-4 w-4" /> Re-evaluar con estas señales</>
                }
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
