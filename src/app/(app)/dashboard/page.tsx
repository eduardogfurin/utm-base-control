"use client"

import { useEffect, useState, useCallback } from "react"
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
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { InlineCreateCard, type Vehicle, type Campaign } from "@/components/links/inline-create-card"

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
      // Load support data (vehicles/campaigns/settings) independently — never block the page
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
      // Load dashboard data separately so its error is isolated
      await loadDashboard()
      setLoading(false)
    }
    load()
  }, [loadDashboard])

  const firstName = session?.user?.name?.split(" ")[0] ?? "usuário"
  const barColors = ["#f59e0b", "#3b82f6", "#10b981", "#f97316", "#6366f1"]

  return (
    <div className="space-y-4">
      {/* ── Greeting row ─────────────────────────────────────────── */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
          {getGreeting()}, {firstName} 👋
        </h1>
      </div>

      {/* ── Error banner (non-blocking) ──────────────────────────── */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={loadDashboard}
            className="text-xs font-medium text-red-600 hover:text-red-800 underline ml-4 shrink-0"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── Inline create card ────────────────────────────────────── */}
      <InlineCreateCard
        vehicles={vehicles}
        campaigns={campaigns}
        settings={settings}
        hasUserRebrandly={hasUserRebrandly}
        onSuccess={loadDashboard}
      />

      {/* ── Bento Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4">

        {/* KPI: Total Links — col 3 */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Links</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <Link2 size={15} className="text-amber-500" />
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-9 w-20" />
          ) : (
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-gray-900 tabular-nums leading-none">
                {(data?.totalLinks ?? 0).toLocaleString("pt-BR")}
              </span>
              <ArrowUpRight size={14} className="text-gray-300 mb-1" />
            </div>
          )}
          <p className="text-xs text-gray-400">Total de links criados</p>
        </div>

        {/* KPI: Cliques — col 3 */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cliques</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <MousePointerClick size={15} className="text-blue-500" />
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-9 w-20" />
          ) : (
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-gray-900 tabular-nums leading-none">
                {(data?.totalClicks ?? 0).toLocaleString("pt-BR")}
              </span>
              <ArrowUpRight size={14} className="text-gray-300 mb-1" />
            </div>
          )}
          <p className="text-xs text-gray-400">Total acumulado via Rebrandly</p>
        </div>

        {/* KPI: Campanhas — col 3 */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Campanhas</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Megaphone size={15} className="text-emerald-500" />
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-9 w-20" />
          ) : (
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-gray-900 tabular-nums leading-none">
                {(data?.activeCampaigns ?? 0).toLocaleString("pt-BR")}
              </span>
              <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 mb-1">ativas</span>
            </div>
          )}
          <p className="text-xs text-gray-400">Campanhas com status ativo</p>
        </div>

        {/* KPI: Veículos — col 3 */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Veículos</span>
            <span className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
              <Radio size={15} className="text-violet-500" />
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-9 w-20" />
          ) : (
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-gray-900 tabular-nums leading-none">
                {(data?.activeVehicles ?? 0).toLocaleString("pt-BR")}
              </span>
              <span className="text-[10px] font-medium text-violet-600 bg-violet-50 rounded-full px-2 py-0.5 mb-1">ativos</span>
            </div>
          )}
          <p className="text-xs text-gray-400">Canais com status ativo</p>
        </div>

        {/* ── Area chart: cliques over time — col 8 ── */}
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
          {loading ? (
            <Skeleton className="h-52 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={data?.clicksOverTime ?? []}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#9ca3af", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => {
                    const d = new Date(v + "T00:00:00")
                    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "#9ca3af", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#areaGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Top Links — col 4 ── */}
        <div className="col-span-12 lg:col-span-4 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Top Links</h3>
            <span className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
              <ExternalLink size={11} className="text-amber-500" />
            </span>
          </div>
          <div className="flex-1 divide-y divide-gray-50 overflow-y-auto">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-10" />
                </div>
              ))
            ) : (data?.topLinks ?? []).length === 0 ? (
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

        {/* ── Top Veículos bar chart — col 6 ── */}
        <div className="col-span-12 lg:col-span-6 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Top Veículos</h3>
            <span className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Radio size={11} className="text-emerald-500" />
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (data?.topVehicles ?? []).length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">
              Nenhum veículo com cliques
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={(data?.topVehicles ?? []).slice(0, 5)}
                margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                barSize={24}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#9ca3af", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + "…" : v}
                />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(val: unknown) => [(val as number).toLocaleString("pt-BR"), "cliques"]}
                  contentStyle={{ borderRadius: 10, border: "1px solid #f3f4f6", fontSize: 12 }}
                />
                <Bar dataKey="clicks" radius={[6, 6, 0, 0]}>
                  {(data?.topVehicles ?? []).slice(0, 5).map((_, idx) => (
                    <Cell key={idx} fill={barColors[idx % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Top Campanhas bar chart — col 6 ── */}
        <div className="col-span-12 lg:col-span-6 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Top Campanhas</h3>
            <span className="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center">
              <Megaphone size={11} className="text-violet-500" />
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (data?.topCampaigns ?? []).length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">
              Nenhuma campanha com cliques
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={(data?.topCampaigns ?? []).slice(0, 5)}
                margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                barSize={24}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#9ca3af", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + "…" : v}
                />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(val: unknown) => [(val as number).toLocaleString("pt-BR"), "cliques"]}
                  contentStyle={{ borderRadius: 10, border: "1px solid #f3f4f6", fontSize: 12 }}
                />
                <Bar dataKey="clicks" radius={[6, 6, 0, 0]}>
                  {(data?.topCampaigns ?? []).slice(0, 5).map((_, idx) => (
                    <Cell key={idx} fill={barColors[(idx + 2) % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  )
}
