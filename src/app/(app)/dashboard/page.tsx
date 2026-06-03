"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp, Link2, Megaphone, Radio, ArrowUpRight } from "lucide-react"
import { formatDate } from "@/lib/utils"

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
  return (
    <div className={`animate-pulse rounded-lg bg-gray-100 ${className ?? ""}`} />
  )
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
  loading: boolean
}

function KpiCard({ label, value, icon, color, loading }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 flex flex-col gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {label}
        </span>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div className="flex items-end justify-between">
          <span className="text-3xl font-bold text-gray-900 tabular-nums">
            {value.toLocaleString("pt-BR")}
          </span>
          <ArrowUpRight size={14} className="text-gray-300 mb-1" />
        </div>
      )}
    </div>
  )
}

// ─── Ranking Table ─────────────────────────────────────────────────────────────

interface RankingRow {
  label: string
  sub?: string
  clicks: number
}

interface RankingTableProps {
  title: string
  rows: RankingRow[]
  loading: boolean
  emptyMessage: string
}

function RankingTable({ title, rows, loading, emptyMessage }: RankingTableProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="divide-y divide-gray-50">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            {emptyMessage}
          </div>
        ) : (
          rows.map((row, idx) => (
            <div
              key={idx}
              className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-semibold text-gray-300 w-4 shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-gray-700 truncate font-medium">{row.label}</p>
                  {row.sub && (
                    <p className="text-xs text-gray-400 truncate">{row.sub}</p>
                  )}
                </div>
              </div>
              <span className="text-sm font-semibold text-orange-500 tabular-nums shrink-0">
                {row.clicks.toLocaleString("pt-BR")}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await fetch("/api/dashboard")
        if (!res.ok) throw new Error("Falha ao carregar dados")
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  const kpis = [
    {
      label: "Total de Links",
      value: data?.totalLinks ?? 0,
      icon: <Link2 size={16} className="text-orange-500" />,
      color: "bg-orange-50",
    },
    {
      label: "Total de Cliques",
      value: data?.totalClicks ?? 0,
      icon: <TrendingUp size={16} className="text-amber-600" />,
      color: "bg-amber-50",
    },
    {
      label: "Campanhas Ativas",
      value: data?.activeCampaigns ?? 0,
      icon: <Megaphone size={16} className="text-sky-600" />,
      color: "bg-sky-50",
    },
    {
      label: "Veículos Ativos",
      value: data?.activeVehicles ?? 0,
      icon: <Radio size={16} className="text-emerald-600" />,
      color: "bg-emerald-50",
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            color={kpi.color}
            loading={loading}
          />
        ))}
      </div>

      {/* Line chart */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.04)]">
        <h3 className="text-sm font-semibold text-gray-800 mb-5">
          Cliques nos últimos 30 dias
        </h3>
        {loading ? (
          <Skeleton className="h-52 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <LineChart
              data={data?.clicksOverTime ?? []}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => {
                  const d = new Date(v + "T00:00:00")
                  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
                }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="url(#lineGradient)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: "#f97316", strokeWidth: 0 }}
              />
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Ranking tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RankingTable
          title="Top Veículos"
          loading={loading}
          emptyMessage="Nenhum veículo com cliques"
          rows={(data?.topVehicles ?? []).map((v) => ({
            label: v.name,
            clicks: v.clicks,
          }))}
        />
        <RankingTable
          title="Top Campanhas"
          loading={loading}
          emptyMessage="Nenhuma campanha com cliques"
          rows={(data?.topCampaigns ?? []).map((c) => ({
            label: c.name,
            clicks: c.clicks,
          }))}
        />
        <RankingTable
          title="Top Links"
          loading={loading}
          emptyMessage="Nenhum link com cliques"
          rows={(data?.topLinks ?? []).map((l) => ({
            label: `/${l.slug}`,
            sub: l.shortUrl,
            clicks: l.clicks,
          }))}
        />
      </div>
    </div>
  )
}
