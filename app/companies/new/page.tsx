'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle, ChevronRight } from 'lucide-react'
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
import { createCompany, evaluateCompany, type Evaluation } from '@/lib/api-client'
import { SIGNAL_DEFINITIONS, COUNTRIES, LEAD_SOURCES, INDUSTRY_SUGGESTIONS } from '@/lib/constants'

const SIGNAL_BY_CATEGORY: Record<string, typeof SIGNAL_DEFINITIONS> = {}
for (const s of SIGNAL_DEFINITIONS) {
  if (!SIGNAL_BY_CATEGORY[s.category]) SIGNAL_BY_CATEGORY[s.category] = []
  SIGNAL_BY_CATEGORY[s.category].push(s)
}

const CATEGORY_LABELS: Record<string, string> = {
  lead_generation: 'Generación de Leads',
  follow_up: 'Seguimiento',
  conversion: 'Conversión',
  automation: 'Automatización',
  online_presence: 'Presencia Online',
  reputation: 'Reputación',
}

function priorityVariant(p: string): 'hot' | 'high' | 'medium' | 'low' | 'secondary' {
  if (p === 'hot') return 'hot'
  if (p === 'high') return 'high'
  if (p === 'medium') return 'medium'
  if (p === 'low') return 'low'
  return 'secondary'
}

const INITIAL_SIGNALS: Record<string, boolean> = {}
for (const s of SIGNAL_DEFINITIONS) INITIAL_SIGNALS[s.key] = false

export default function NewCompanyPage() {
  const router = useRouter()

  // Company form state
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

  // Signal checklist state
  const [signals, setSignals] = useState<Record<string, boolean>>(INITIAL_SIGNALS)

  // Submission state
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)

  const finalIndustry = industry === 'Otro' ? customIndustry : industry

  function toggleSignal(key: string) {
    setSignals((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSubmit() {
    if (!name.trim() || !finalIndustry.trim() || !country) {
      setError('Nombre, industria y país son requeridos.')
      return
    }
    setError('')
    setSaving(true)

    try {
      // 1. Create company
      const company = await createCompany({
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
      })
      setCompanyId(company.id)

      // 2. Auto-evaluate
      const ev = await evaluateCompany(company.id, {
        evaluatedBy: 'alejandro@kronosdata.tech',
        ...signals,
      })
      setEvaluation(ev)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear la empresa')
    } finally {
      setSaving(false)
    }
  }

  if (evaluation && companyId) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Empresa creada y evaluada</h1>
              <p className="text-sm text-slate-500">{name}</p>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="text-center">
                  <p className="text-4xl font-bold text-slate-900">{evaluation.opportunityScore}</p>
                  <p className="text-xs text-slate-500 mt-1">Opportunity Score</p>
                </div>
                <div className="text-center">
                  <Badge variant={priorityVariant(evaluation.priorityLevel)} className="text-sm px-3 py-1">
                    {evaluation.priorityLevel.toUpperCase()}
                  </Badge>
                  <p className="text-xs text-slate-500 mt-1">Prioridad</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-600">
                    ${evaluation.estimatedRevenueLostPerMonth.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Pérdida mensual est.</p>
                </div>
              </div>

              <Separator className="mb-4" />

              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Dolor Principal</p>
                <p className="text-sm text-slate-700">{evaluation.probablePainPoint}</p>
              </div>

              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Servicios Recomendados</p>
                <div className="flex flex-wrap gap-2">
                  {evaluation.recommendedServices.map((s) => (
                    <span key={s} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Valor del Proyecto</p>
                <p className="text-sm font-semibold text-slate-900">
                  ${evaluation.estimatedProjectPriceMin.toLocaleString()} – ${evaluation.estimatedProjectPriceMax.toLocaleString()} USD
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={() => router.push(`/companies/${companyId}`)}>
              Ver ficha completa <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => router.push('/')}>
              Volver al dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nueva Empresa</h1>
          <p className="text-sm text-slate-500">Completa la información y el checklist de señales para evaluar automáticamente</p>
        </div>
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
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Clínica Dental Lima" className="mt-1" />
              </div>

              <div>
                <Label>Industria *</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona o escribe..." />
                  </SelectTrigger>
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
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="País" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="city">Ciudad</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lima" className="mt-1" />
                </div>
              </div>

              <div>
                <Label>Fuente del Lead</Label>
                <Select value={leadSource} onValueChange={setLeadSource}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="¿Cómo encontraste este lead?" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+51..." className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input id="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@usuario" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input id="linkedin" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="URL o usuario" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="gbusiness">Google Business</Label>
                  <Input id="gbusiness" value={googleBusinessUrl} onChange={(e) => setGoogleBusinessUrl(e.target.value)} placeholder="URL de Google" className="mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Signal Checklist */}
        <div>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Checklist de Señales</CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Marca lo que ya tiene. Lo que falta = oportunidad para Kronos.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {Object.entries(SIGNAL_BY_CATEGORY).map(([cat, sigs]) => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
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
                          checked={signals[s.key]}
                          onCheckedChange={() => toggleSignal(s.key)}
                        />
                        <span className="text-sm text-slate-700">{s.label}</span>
                        {signals[s.key] && s.problemWhen && (
                          <span className="ml-auto text-xs text-red-500 font-medium">Problema</span>
                        )}
                        {!signals[s.key] && !s.problemWhen && (
                          <span className="ml-auto text-xs text-amber-500 font-medium">Oportunidad</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit */}
      <div className="mt-6 flex items-center gap-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        <div className="ml-auto flex gap-3">
          <Button variant="outline" asChild disabled={saving}>
            <Link href="/">Cancelar</Link>
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Creando y evaluando...</> : 'Crear y Evaluar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
