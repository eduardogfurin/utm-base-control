"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts"
import {
  TrendingUp,
  Link2,
  Megaphone,
  Radio,
  ArrowUpRight,
  MousePointerClick,
  ExternalLink,
  Plus,
  X,
  Globe,
} from "lucide-react"
import { formatDate, buildUtmUrl, slugify } from "@/lib/utils"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CreatableSelect, type SelectOption } from "@/components/ui/creatable-select"
import { cn } from "@/lib/utils"
import { type Vehicle, type Campaign } from "@/components/links/inline-create-card"

interface AppSettings {
  rebrandlyApiKey: string | null;
  rebrandlyDomain: string | null;
  rebrandlyStatus: boolean;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DashboardData {
  totalLinks: number
  totalClicks: number
  activeCampaigns: number
  activeVehicles: number
  topVehicles: { name: string; clicks: number }[]
  topCampaigns: { name: string; clicks: number }[]
  topLinks: { slug: string; shortUrl: string; clicks: number }[]
  clicksOverTime: { date: string; clicks: number }[]
}

interface RebrandlyDomain {
  id: string
  fullName: string
  active: boolean
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className ?? ""}`} />
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-400 mb-1">{label ? formatDate(label) : ""}</p>
      <p className="text-gray-900 font-semibold">
        {payload[0].value.toLocaleString("pt-BR")} cliques
      </p>
    </div>
  )
}

// ─── Greeting ─────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Bom dia"
  if (h < 18) return "Boa tarde"
  return "Boa noite"
}

// ─── Hero Create Card ─────────────────────────────────────────────────────────

interface HeroCreateCardProps {
  totalLinks: number
  loading: boolean
  vehicles: Vehicle[]
  campaigns: Campaign[]
  settings: AppSettings | null
  hasUserRebrandly: boolean
  onSuccess: () => void
  onVehicleCreated: (v: Vehicle) => void
  onCampaignCreated: (c: Campaign) => void
}

interface LinkFormState {
  baseUrl: string
  vehicleId: string
  campaignId: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmContent: string
  utmTerm: string
  slug: string
  shortenWithRebrandly: boolean
  rebrandlyDomain: string
}

const emptyForm: LinkFormState = {
  baseUrl: "", vehicleId: "", campaignId: "",
  utmSource: "", utmMedium: "", utmCampaign: "", utmContent: "", utmTerm: "",
  slug: "", shortenWithRebrandly: false, rebrandlyDomain: "",
}

interface UtmTemplate {
  id: string; name: string
  source: string | null; medium: string | null; campaign: string | null
  content: string | null; term: string | null; vehicleId: string | null
}

function HeroCreateCard({
  totalLinks, loading, vehicles: initialVehicles, campaigns: initialCampaigns,
  settings, hasUserRebrandly, onSuccess, onVehicleCreated, onCampaignCreated,
}: HeroCreateCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<LinkFormState>({ ...emptyForm })
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles)
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns)
  const [rebrandlyDomains, setRebrandlyDomains] = useState<RebrandlyDomain[]>([])
  const urlInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setVehicles(initialVehicles) }, [initialVehicles])
  useEffect(() => { setCampaigns(initialCampaigns) }, [initialCampaigns])

  const hasRebrandly = hasUserRebrandly || !!(settings?.rebrandlyApiKey && settings?.rebrandlyStatus)

  useEffect(() => {
    if (!expanded || !hasRebrandly) return
    fetch("/api/integrations/rebrandly/domains")
      .then((r) => r.json())
      .then((res: { domains: RebrandlyDomain[]; defaultDomain: string | null }) => {
        const domains = res?.domains ?? []
        setRebrandlyDomains(domains)
        setForm((prev) => ({
          ...prev,
          shortenWithRebrandly: true,
          rebrandlyDomain: prev.rebrandlyDomain || res?.defaultDomain || domains?.[0]?.fullName || "",
        }))
      })
      .catch(() => {})
  }, [expanded, hasRebrandly])

  useEffect(() => {
    if (!expanded) return
    const veh = vehicles.find((v) => v.id === form.vehicleId)
    const cam = campaigns.find((c) => c.id === form.campaignId)
    if (veh && cam) setForm((prev) => ({ ...prev, slug: slugify(`${veh.slug}-${cam.slug}`) }))
  }, [form.vehicleId, form.campaignId, expanded, vehicles, campaigns])

  useEffect(() => {
    if (!form.vehicleId || !expanded) return
    fetch("/api/templates")
      .then((r) => r.json())
      .then((allTemplates: UtmTemplate[]) => {
        const tpl = allTemplates.find((t) => t.vehicleId === form.vehicleId) ?? allTemplates.find((t) => !t.vehicleId)
        if (tpl) setForm((prev) => ({
          ...prev,
          utmSource: tpl.source ?? prev.utmSource,
          utmMedium: tpl.medium ?? prev.utmMedium,
          utmCampaign: tpl.campaign ?? prev.utmCampaign,
          utmContent: tpl.content ?? prev.utmContent,
          utmTerm: tpl.term ?? prev.utmTerm,
        }))
      })
      .catch(() => {})
  }, [form.vehicleId, expanded])

  const set = (field: keyof LinkFormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const previewUrl = buildUtmUrl(form.baseUrl, {
    utmSource: form.utmSource || null, utmMedium: form.utmMedium || null,
    utmCampaign: form.utmCampaign || null, utmContent: form.utmContent || null, utmTerm: form.utmTerm || null,
  })

  const handleCancel = () => { setExpanded(false); setForm({ ...emptyForm }); setRebrandlyDomains([]) }

  const handleCreateVehicle = useCallback(async (name: string): Promise<SelectOption> => {
    const res = await fetch("/api/vehicles", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slugify(name), category: "OTHER", status: "ACTIVE" }),
    })
    if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Erro ao criar veículo") }
    const created: Vehicle = await res.json()
    setVehicles((prev) => [created, ...prev])
    onVehicleCreated(created)
    toast.success(`Veículo "${name}" criado`)
    return { id: created.id, name: created.name }
  }, [onVehicleCreated])

  const handleCreateCampaign = useCallback(async (name: string): Promise<SelectOption> => {
    const res = await fetch("/api/campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slugify(name), status: "ACTIVE" }),
    })
    if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Erro ao criar campanha") }
    const created: Campaign = await res.json()
    setCampaigns((prev) => [created, ...prev])
    onCampaignCreated(created)
    toast.success(`Campanha "${name}" criada`)
    return { id: created.id, name: created.name }
  }, [onCampaignCreated])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.baseUrl || !form.vehicleId || !form.campaignId) {
      toast.error("URL Base, Veículo e Campanha são obrigatórios"); return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/links", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: form.baseUrl, vehicleId: form.vehicleId, campaignId: form.campaignId,
          slug: form.slug || undefined, utmSource: form.utmSource || undefined,
          utmMedium: form.utmMedium || undefined, utmCampaign: form.utmCampaign || undefined,
          utmContent: form.utmContent || undefined, utmTerm: form.utmTerm || undefined,
          shortenWithRebrandly: form.shortenWithRebrandly, rebrandlyDomain: form.rebrandlyDomain || undefined,
        }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Erro ao criar link") }
      toast.success("Link criado!")
      handleCancel()
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar link")
    } finally { setSaving(false) }
  }

  const vehicleOptions: SelectOption[] = vehicles.map((v) => ({ id: v.id, name: v.name }))
  const campaignOptions: SelectOption[] = campaigns.map((c) => ({ id: c.id, name: c.name }))

  return (
    <div className="flex justify-center">
      <div
        className={cn(
          "w-full max-w-lg rounded-3xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "bg-gradient-to-b from-[#1a1a2e] to-[#16213e] shadow-[0_24px_60px_rgba(0,0,0,0.35)]",
          expanded ? "scale-100" : "scale-[0.98] hover:scale-100"
        )}
      >
        {/* Top section: balance-style total links */}
        <div className="px-6 pt-6 pb-4 text-center">
          <p className="text-xs text-blue-300/70 uppercase tracking-widest font-medium mb-1">LINKS CRIADOS</p>
          {loading ? (
            <div className="h-12 flex items-center justify-center">
              <div className="w-28 h-9 rounded-xl bg-white/10 animate-pulse" />
            </div>
          ) : (
            <p className="text-5xl font-bold text-white tabular-nums tracking-tight">
              {(totalLinks).toLocaleString("pt-BR")}
            </p>
          )}
        </div>

        {/* URL input area (always visible) */}
        <div className="mx-4 mb-3">
          <div
            className={cn(
              "rounded-2xl transition-all duration-300",
              expanded
                ? "bg-white/5 border border-white/10"
                : "bg-white/10 hover:bg-white/15 border border-white/0"
            )}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <Globe size={15} className="text-blue-300/70 shrink-0" />
              <input
                ref={urlInputRef}
                value={form.baseUrl}
                onChange={(e) => {
                  set("baseUrl", e.target.value)
                  if (e.target.value && !expanded) setExpanded(true)
                  if (!e.target.value && !form.vehicleId) setExpanded(false)
                }}
                onFocus={() => { if (!expanded) setExpanded(true) }}
                placeholder="Cole o link a encurtar..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-blue-200/40 outline-none"
              />
              {expanded && (
                <button type="button" onClick={handleCancel} className="shrink-0 text-blue-200/40 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expandable UTM form */}
        <div className={cn(
          "overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
          expanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}>
          <form onSubmit={handleSubmit}>
            <div className="px-4 pb-4 space-y-3">
              {/* Vehicle + Campaign */}
              <div className="space-y-2">
                <CreatableSelect
                  value={form.vehicleId}
                  onChange={(id) => set("vehicleId", id)}
                  options={vehicleOptions}
                  placeholder="Selecionar veículo *"
                  createLabel="Criar veículo"
                  onCreate={handleCreateVehicle}
                  className="bg-white/10 border-white/10 text-white hover:border-white/20 focus-visible:border-blue-400 [&_span]:text-white [&_svg]:text-blue-300"
                />
                <CreatableSelect
                  value={form.campaignId}
                  onChange={(id) => set("campaignId", id)}
                  options={campaignOptions}
                  placeholder="Selecionar campanha *"
                  createLabel="Criar campanha"
                  onCreate={handleCreateCampaign}
                  className="bg-white/10 border-white/10 text-white hover:border-white/20 focus-visible:border-blue-400 [&_span]:text-white [&_svg]:text-blue-300"
                />
              </div>

              <div className="h-px bg-white/10" />

              {/* UTM params — vertical */}
              <div className="space-y-2">
                {([
                  { field: "utmSource" as keyof LinkFormState, placeholder: "UTM Source (ex: google)" },
                  { field: "utmMedium" as keyof LinkFormState, placeholder: "UTM Medium (ex: cpc)" },
                  { field: "utmCampaign" as keyof LinkFormState, placeholder: "UTM Campaign (ex: lancamento)" },
                  { field: "utmContent" as keyof LinkFormState, placeholder: "UTM Content (ex: banner-topo)" },
                  { field: "utmTerm" as keyof LinkFormState, placeholder: "UTM Term (ex: palavra-chave)" },
                ]).map(({ field, placeholder }) => (
                  <input
                    key={field}
                    value={form[field] as string}
                    onChange={(e) => set(field, e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-xl bg-white/10 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-blue-200/40 outline-none focus:border-blue-400/60 transition-colors"
                  />
                ))}
              </div>

              {/* Slug — last */}
              <input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="Slug (gerado automaticamente)"
                className="w-full rounded-xl bg-white/10 border border-white/10 px-3.5 py-2.5 text-sm text-white/70 font-mono placeholder:text-blue-200/30 outline-none focus:border-blue-400/60 transition-colors"
              />

              {/* URL Preview */}
              {form.baseUrl && (
                <div className="rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5">
                  <p className="text-[10px] text-blue-200/50 uppercase tracking-wider mb-1">Preview</p>
                  <p className="text-xs text-blue-100/70 break-all font-mono leading-relaxed">{previewUrl}</p>
                </div>
              )}

              {/* Rebrandly */}
              {hasRebrandly && (
                <div className="rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white/80">Encurtar via Rebrandly</p>
                    <Switch checked={form.shortenWithRebrandly} onCheckedChange={(v) => set("shortenWithRebrandly", v)} />
                  </div>
                  {form.shortenWithRebrandly && rebrandlyDomains.length > 0 && (
                    <select
                      value={form.rebrandlyDomain}
                      onChange={(e) => set("rebrandlyDomain", e.target.value)}
                      className="w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/60"
                    >
                      {rebrandlyDomains.map((d) => (
                        <option key={d.id} value={d.fullName} className="bg-[#16213e]">{d.fullName}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Bottom action buttons */}
            <div className="flex gap-3 px-4 pb-5">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-2xl bg-white/10 py-3.5 text-sm font-medium text-white/70 hover:bg-white/15 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-2xl bg-blue-500 hover:bg-blue-400 py-3.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.4)]"
              >
                <Plus size={15} />
                {saving ? "Criando..." : "Criar Link"}
              </button>
            </div>
          </form>
        </div>

        {/* Bottom quick action row (when collapsed) */}
        {!expanded && (
          <div className="flex gap-2 px-4 pb-5">
            <button
              onClick={() => { setExpanded(true); setTimeout(() => urlInputRef.current?.focus(), 50) }}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-blue-500 hover:bg-blue-400 py-3.5 text-sm font-semibold text-white transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)]"
            >
              <Plus size={15} />
              Criar Link
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [hasUserRebrandly, setHasUserRebrandly] = useState(false)

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard")
      if (!res.ok) throw new Error("Falha ao carregar dados")
      setData(await res.json())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    }
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [vehiclesRes, campaignsRes, settingsRes, intRes] = await Promise.allSettled([
        fetch("/api/vehicles"),
        fetch("/api/campaigns"),
        fetch("/api/settings"),
        fetch("/api/integrations"),
      ])
      if (vehiclesRes.status === "fulfilled" && vehiclesRes.value.ok)
        setVehicles(await vehiclesRes.value.json())
      if (campaignsRes.status === "fulfilled" && campaignsRes.value.ok)
        setCampaigns(await campaignsRes.value.json())
      if (settingsRes.status === "fulfilled" && settingsRes.value.ok)
        setSettings(await settingsRes.value.json())
      if (intRes.status === "fulfilled" && intRes.value.ok) {
        const integrations = await intRes.value.json()
        setHasUserRebrandly(
          Array.isArray(integrations) &&
          integrations.some((i: { provider: string; isActive: boolean }) =>
            i.provider === "REBRANDLY" && i.isActive
          )
        )
      }
      await loadDashboard()
      setLoading(false)
    }
    load()
  }, [loadDashboard])

  const firstName = session?.user?.name?.split(" ")[0] ?? "usuário"
  const barColors = ["#f59e0b", "#3b82f6", "#10b981", "#f97316", "#6366f1"]

  return (
    <div className="space-y-6">
      {/* ── Greeting ─────────────────────────────────────────────── */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
          {getGreeting()}, {firstName} 👋
        </h1>
      </div>

      {/* ── Error banner ─────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={loadDashboard} className="text-xs font-medium text-red-600 hover:text-red-800 underline ml-4 shrink-0">
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── Hero create card ──────────────────────────────────────── */}
      <HeroCreateCard
        totalLinks={data?.totalLinks ?? 0}
        loading={loading}
        vehicles={vehicles}
        campaigns={campaigns}
        settings={settings}
        hasUserRebrandly={hasUserRebrandly}
        onSuccess={loadDashboard}
        onVehicleCreated={(v) => setVehicles((prev) => [v, ...prev])}
        onCampaignCreated={(c) => setCampaigns((prev) => [c, ...prev])}
      />

      {/* ── Bento Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4">

        {/* KPI: Cliques */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cliques</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <MousePointerClick size={15} className="text-blue-500" />
            </span>
          </div>
          {loading ? <Skeleton className="h-9 w-20" /> : (
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-gray-900 tabular-nums leading-none">
                {(data?.totalClicks ?? 0).toLocaleString("pt-BR")}
              </span>
              <ArrowUpRight size={14} className="text-gray-300 mb-1" />
            </div>
          )}
          <p className="text-xs text-gray-400">Total acumulado via Rebrandly</p>
        </div>

        {/* KPI: Campanhas */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Campanhas</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Megaphone size={15} className="text-emerald-500" />
            </span>
          </div>
          {loading ? <Skeleton className="h-9 w-20" /> : (
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-gray-900 tabular-nums leading-none">
                {(data?.activeCampaigns ?? 0).toLocaleString("pt-BR")}
              </span>
              <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 mb-1">ativas</span>
            </div>
          )}
          <p className="text-xs text-gray-400">Campanhas com status ativo</p>
        </div>

        {/* KPI: Veículos */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Veículos</span>
            <span className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
              <Radio size={15} className="text-violet-500" />
            </span>
          </div>
          {loading ? <Skeleton className="h-9 w-20" /> : (
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-gray-900 tabular-nums leading-none">
                {(data?.activeVehicles ?? 0).toLocaleString("pt-BR")}
              </span>
              <span className="text-[10px] font-medium text-violet-600 bg-violet-50 rounded-full px-2 py-0.5 mb-1">ativos</span>
            </div>
          )}
          <p className="text-xs text-gray-400">Canais com status ativo</p>
        </div>

        {/* Area chart: cliques over time — col 8 */}
        <div className="col-span-12 lg:col-span-8 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Cliques nos últimos 30 dias</h3>
              <p className="text-xs text-gray-400 mt-0.5">Distribuição por data de criação do link</p>
            </div>
            <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <TrendingUp size={13} className="text-blue-500" />
            </span>
          </div>
          {loading ? <Skeleton className="h-52 w-full" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data?.clicksOverTime ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={(v: string) => { const d = new Date(v + "T00:00:00"); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}` }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} fill="url(#areaGrad)" dot={false} activeDot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Links — col 4 */}
        <div className="col-span-12 lg:col-span-4 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Top Links</h3>
            <span className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
              <ExternalLink size={11} className="text-amber-500" />
            </span>
          </div>
          <div className="flex-1 divide-y divide-gray-50 overflow-y-auto">
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-10" />
              </div>
            )) : (data?.topLinks ?? []).length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">Nenhum link com cliques</div>
            ) : (
              (data?.topLinks ?? []).slice(0, 7).map((link, idx) => (
                <div key={idx} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-bold text-gray-300 w-3 shrink-0">{idx + 1}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">/{link.slug}</p>
                      <p className="text-[10px] text-gray-400 truncate">{link.shortUrl}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: barColors[idx % barColors.length] }}>
                    {link.clicks.toLocaleString("pt-BR")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Veículos bar chart — col 6 */}
        <div className="col-span-12 lg:col-span-6 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Top Veículos</h3>
            <span className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Radio size={11} className="text-emerald-500" />
            </span>
          </div>
          {loading ? <Skeleton className="h-40 w-full" /> : (data?.topVehicles ?? []).length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">Nenhum veículo com cliques</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={(data?.topVehicles ?? []).slice(0, 5)} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + "…" : v} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip formatter={(val: unknown) => [(val as number).toLocaleString("pt-BR"), "cliques"]} contentStyle={{ borderRadius: 10, border: "1px solid #f3f4f6", fontSize: 12 }} />
                <Bar dataKey="clicks" radius={[6, 6, 0, 0]}>
                  {(data?.topVehicles ?? []).slice(0, 5).map((_, idx) => <Cell key={idx} fill={barColors[idx % barColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Campanhas bar chart — col 6 */}
        <div className="col-span-12 lg:col-span-6 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Top Campanhas</h3>
            <span className="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center">
              <Megaphone size={11} className="text-violet-500" />
            </span>
          </div>
          {loading ? <Skeleton className="h-40 w-full" /> : (data?.topCampaigns ?? []).length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">Nenhuma campanha com cliques</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={(data?.topCampaigns ?? []).slice(0, 5)} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + "…" : v} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip formatter={(val: unknown) => [(val as number).toLocaleString("pt-BR"), "cliques"]} contentStyle={{ borderRadius: 10, border: "1px solid #f3f4f6", fontSize: 12 }} />
                <Bar dataKey="clicks" radius={[6, 6, 0, 0]}>
                  {(data?.topCampaigns ?? []).slice(0, 5).map((_, idx) => <Cell key={idx} fill={barColors[(idx + 2) % barColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  )
}
