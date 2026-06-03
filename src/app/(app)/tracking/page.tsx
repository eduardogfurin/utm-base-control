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
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className ?? ""}`} />
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
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar dados")
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
          <h1 className="text-2xl font-bold text-gray-900">Acompanhamento</h1>
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
                    ? "bg-[#1C1B21] text-white border-[#1C1B21]"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-800"
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
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-4">

        {/* KPI: total clicks */}
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
            <span className="text-4xl font-bold text-gray-900 tabular-nums leading-none">
              {(data?.totalClicks ?? 0).toLocaleString("pt-BR")}
            </span>
          )}
          <p className="text-xs text-gray-400">Total de cliques filtrados</p>
        </div>

        {/* KPI: total links */}
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
            <span className="text-4xl font-bold text-gray-900 tabular-nums leading-none">
              {(data?.totalLinks ?? 0).toLocaleString("pt-BR")}
            </span>
          )}
          <p className="text-xs text-gray-400">Links nesta dimensão</p>
        </div>

        {/* KPI: top value */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Líder</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <BarChart2 size={15} className="text-emerald-500" />
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-9 w-28" />
          ) : (
            <span className="text-2xl font-bold text-gray-900 leading-tight truncate">
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
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dimensão</span>
            <span className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
              <Filter size={15} className="text-violet-500" />
            </span>
          </div>
          <span className="text-2xl font-bold text-gray-900 leading-tight">
            {activeDim.label}
          </span>
          <p className="text-xs text-gray-400">
            {(data?.rows?.length ?? 0).toLocaleString("pt-BR")} valores únicos
          </p>
        </div>

        {/* Bar chart — col 8 */}
        <div className="col-span-12 lg:col-span-8 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                Top 10 por {activeDim.label}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Cliques por valor da dimensão</p>
            </div>
            <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="key"
                  tick={{ fill: "#9ca3af", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + "…" : v}
                />
                <YAxis
                  tick={{ fill: "#9ca3af", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(val: unknown) => [(val as number).toLocaleString("pt-BR"), "cliques"]}
                  contentStyle={{ borderRadius: 10, border: "1px solid #f3f4f6", fontSize: 12 }}
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
        <div className="col-span-12 lg:col-span-4 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Ranking</h3>
            <span className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
              <BarChart2 size={11} className="text-amber-500" />
            </span>
          </div>
          <div className="flex-1 divide-y divide-gray-50 overflow-y-auto">
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
                  className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-bold text-gray-300 w-3 shrink-0">{idx + 1}</span>
                    <p className="text-xs font-medium text-gray-700 truncate">{row.key || "—"}</p>
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
