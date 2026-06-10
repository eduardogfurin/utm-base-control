"use client"

import { useEffect, useState, useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import {
  BarChart2,
  Radio,
  Megaphone,
  Link2,
  Globe,
  Tag,
  Filter,
  MousePointerClick,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────

type Dimension =
  | "campaign"
  | "vehicle"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_content"
  | "utm_term"
  | "domain"
  | "slug"

interface DimensionOption {
  value: Dimension
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

interface TrackingRow {
  key: string
  clicks: number
  links: number
}

interface TrackingData {
  rows: TrackingRow[]
  totalClicks: number
  totalLinks: number
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const DIMENSIONS: DimensionOption[] = [
  { value: "campaign", label: "Campanha", icon: Megaphone },
  { value: "vehicle", label: "Veículo", icon: Radio },
  { value: "utm_source", label: "UTM Source", icon: Globe },
  { value: "utm_medium", label: "UTM Medium", icon: Filter },
  { value: "utm_campaign", label: "UTM Campaign", icon: Tag },
  { value: "utm_content", label: "UTM Content", icon: Tag },
  { value: "utm_term", label: "UTM Term", icon: Tag },
  { value: "domain", label: "Domínio", icon: Globe },
  { value: "slug", label: "Slug", icon: Link2 },
]

const BAR_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#f97316", "#6366f1", "#ec4899", "#14b8a6", "#8b5cf6"]

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 dark:bg-white/8 ${className ?? ""}`} />
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TrackingPage() {
  const [dimension, setDimension] = useState<Dimension>("campaign")
  const [data, setData] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/tracking?dimension=${dimension}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}))
          throw new Error(body?.error ?? `Erro ${r.status}`)
        }
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [dimension])

  const activeDim = DIMENSIONS.find((d) => d.value === dimension)!
  const chartData = useMemo(() => (data?.rows ?? []).slice(0, 10), [data])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Acompanhamento</h1>
          <p className="text-sm text-gray-400 mt-0.5">Visão por dimensão de rastreamento</p>
        </div>

        {/* Dimension selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {DIMENSIONS.map((d) => {
            const Icon = d.icon
            const active = d.value === dimension
            return (
              <button
                key={d.value}
                onClick={() => setDimension(d.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 ${
                  active
                    ? "bg-blue-500 text-white border-blue-500 shadow-[0_2px_8px_rgba(59,130,246,0.3)]"
                    : "bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                <Icon size={12} />
                {d.label}
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-4">

        {/* KPI: total clicks */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-card border border-gray-100 dark:border-white/8 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cliques</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center">
              <MousePointerClick size={15} className="text-blue-500" />
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-9 w-20" />
          ) : (
            <span className="text-4xl font-bold text-gray-900 dark:text-gray-100 tabular-nums leading-none">
              {(data?.totalClicks ?? 0).toLocaleString("pt-BR")}
            </span>
          )}
          <p className="text-xs text-gray-400">Total de cliques filtrados</p>
        </div>

        {/* KPI: total links */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-card border border-gray-100 dark:border-white/8 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Links</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center">
              <Link2 size={15} className="text-amber-500" />
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-9 w-20" />
          ) : (
            <span className="text-4xl font-bold text-gray-900 dark:text-gray-100 tabular-nums leading-none">
              {(data?.totalLinks ?? 0).toLocaleString("pt-BR")}
            </span>
          )}
          <p className="text-xs text-gray-400">Links nesta dimensão</p>
        </div>

        {/* KPI: top value */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-card border border-gray-100 dark:border-white/8 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Líder</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center">
              <BarChart2 size={15} className="text-emerald-500" />
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-9 w-28" />
          ) : (
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">
              {data?.rows?.[0]?.key ?? "—"}
            </span>
          )}
          <p className="text-xs text-gray-400">
            {data?.rows?.[0]
              ? `${data.rows[0].clicks.toLocaleString("pt-BR")} cliques`
              : "Nenhum dado"}
          </p>
        </div>

        {/* KPI: dimension */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-card border border-gray-100 dark:border-white/8 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dimensão</span>
            <span className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-500/15 flex items-center justify-center">
              <Filter size={15} className="text-violet-500" />
            </span>
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
            {activeDim.label}
          </span>
          <p className="text-xs text-gray-400">
            {(data?.rows?.length ?? 0).toLocaleString("pt-BR")} valores únicos
          </p>
        </div>

        {/* Bar chart — col 8 */}
        <div className="col-span-12 lg:col-span-8 rounded-2xl bg-card border border-gray-100 dark:border-white/8 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Top 10 por {activeDim.label}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Cliques por valor da dimensão</p>
            </div>
            <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center">
              <BarChart2 size={13} className="text-blue-500" />
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-52 w-full" />
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-sm text-gray-400">
              Nenhum dado para esta dimensão
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                barSize={28}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.15)" vertical={false} />
                <XAxis
                  dataKey="key"
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + "…" : v}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(val: unknown) => [(val as number).toLocaleString("pt-BR"), "cliques"]}
                  contentStyle={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "#404349", color: "#e5e7eb", fontSize: 12 }}
                />
                <Bar dataKey="clicks" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Ranked table — col 4 */}
        <div className="col-span-12 lg:col-span-4 rounded-2xl bg-card border border-gray-100 dark:border-white/8 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 dark:border-white/6 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Ranking</h3>
            <span className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center">
              <BarChart2 size={11} className="text-amber-500" />
            </span>
          </div>
          <div className="flex-1 divide-y divide-gray-50 dark:divide-white/5 overflow-y-auto">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-10" />
                </div>
              ))
            ) : (data?.rows ?? []).length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                Nenhum dado encontrado
              </div>
            ) : (
              (data?.rows ?? []).slice(0, 10).map((row, idx) => (
                <div
                  key={idx}
                  className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/60 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600 w-3 shrink-0">{idx + 1}</span>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{row.key || "—"}</p>
                  </div>
                  <span
                    className="text-xs font-bold tabular-nums shrink-0"
                    style={{ color: BAR_COLORS[idx % BAR_COLORS.length] }}
                  >
                    {row.clicks.toLocaleString("pt-BR")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
