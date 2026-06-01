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
import { TrendingUp, Link2, Megaphone, Radio } from "lucide-react"
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
    <div
      className={`animate-pulse rounded-md bg-zinc-800 ${className ?? ""}`}
    />
  )
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  loading: boolean
}

function KpiCard({ label, value, icon, loading }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-zinc-500">{icon}</span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <span className="text-3xl font-semibold text-zinc-100 tabular-nums">
          {value.toLocaleString("pt-BR")}
        </span>
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      </div>
      <div className="divide-y divide-zinc-800">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-zinc-500">
            {emptyMessage}
          </div>
        ) : (
          rows.map((row, idx) => (
            <div
              key={idx}
              className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono text-zinc-500 w-4 shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{row.label}</p>
                  {row.sub && (
                    <p className="text-xs text-zinc-500 truncate">{row.sub}</p>
                  )}
                </div>
              </div>
              <span className="text-sm font-medium text-zinc-300 tabular-nums shrink-0">
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
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-400 mb-1">{label ? formatDate(label) : ""}</p>
      <p className="text-zinc-100 font-semibold">
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
        <p className="text-sm text-red-400">{error}</p>
      </div>
    )
  }

  const kpis = [
    {
      label: "Total de Links",
      value: data?.totalLinks ?? 0,
      icon: <Link2 className="size-4" />,
    },
    {
      label: "Total de Cliques",
      value: data?.totalClicks ?? 0,
      icon: <TrendingUp className="size-4" />,
    },
    {
      label: "Campanhas Ativas",
      value: data?.activeCampaigns ?? 0,
      icon: <Megaphone className="size-4" />,
    },
    {
      label: "Veículos Ativos",
      value: data?.activeVehicles ?? 0,
      icon: <Radio className="size-4" />,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Visão geral de performance de links e campanhas
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            loading={loading}
          />
        ))}
      </div>

      {/* Line chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="text-sm font-semibold text-zinc-100 mb-5">
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
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#71717a", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => {
                  const d = new Date(v + "T00:00:00")
                  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
                }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
              />
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
