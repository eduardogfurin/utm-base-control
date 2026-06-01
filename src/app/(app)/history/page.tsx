"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import { History, Loader2 } from "lucide-react";

type AuditAction = "CREATED" | "UPDATED" | "DELETED" | "INTEGRATION" | "METRICS_SYNC";

interface AuditLog {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ACTION_BADGE: Record<AuditAction, { label: string; className: string }> = {
  CREATED: {
    label: "Criado",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  UPDATED: {
    label: "Atualizado",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  DELETED: {
    label: "Deletado",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  INTEGRATION: {
    label: "Integração",
    className: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  },
  METRICS_SYNC: {
    label: "Sync Métricas",
    className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  },
};

const ENTITY_LABELS: Record<string, string> = {
  Vehicle: "Veículo",
  Campaign: "Campanha",
  Link: "Link",
};

function truncate(value: string | null, max = 60): string {
  if (!value) return "—";
  return value.length > max ? value.slice(0, max) + "…" : value;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i} className="border-zinc-800">
          <TableCell>
            <Skeleton className="h-5 w-20 bg-zinc-800" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24 bg-zinc-800" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20 bg-zinc-800" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32 bg-zinc-800" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32 bg-zinc-800" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24 bg-zinc-800" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28 bg-zinc-800" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [entityType, setEntityType] = useState<string>("all");
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(
    async (newPage: number, replace: boolean) => {
      if (newPage === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams({
          page: String(newPage),
          limit: "50",
        });
        if (entityType !== "all" && entityType) params.set("entityType", entityType);

        const res = await fetch(`/api/history?${params.toString()}`);
        if (!res.ok) throw new Error("Erro ao carregar histórico");
        const json = await res.json();

        setLogs((prev) => (replace ? json.data : [...prev, ...json.data]));
        setPagination(json.pagination);
        setPage(newPage);
      } catch {
        // silent — no toast on initial load to avoid noise
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [entityType]
  );

  useEffect(() => {
    fetchLogs(1, true);
  }, [fetchLogs]);

  const handleLoadMore = () => {
    if (pagination && page < pagination.totalPages) {
      fetchLogs(page + 1, false);
    }
  };

  const hasMore = pagination ? page < pagination.totalPages : false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
            <History size={16} className="text-zinc-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">
              Histórico de Alterações
            </h1>
            <p className="text-sm text-zinc-500">
              Auditoria completa de todas as ações no sistema
            </p>
          </div>
        </div>

        {/* Filter */}
        <Select
          value={entityType}
          onValueChange={(val) => setEntityType(val ?? "all")}
        >
          <SelectTrigger className="w-44 bg-zinc-900 border-zinc-700 text-zinc-200">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all" className="text-zinc-200">
              Todos
            </SelectItem>
            <SelectItem value="Vehicle" className="text-zinc-200">
              Veículo
            </SelectItem>
            <SelectItem value="Campaign" className="text-zinc-200">
              Campanha
            </SelectItem>
            <SelectItem value="Link" className="text-zinc-200">
              Link
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats pill */}
      {pagination && !loading && (
        <p className="text-xs text-zinc-500">
          {pagination.total} registro{pagination.total !== 1 ? "s" : ""} encontrado
          {pagination.total !== 1 ? "s" : ""}
          {entityType !== "all" && ` para "${ENTITY_LABELS[entityType] ?? entityType}"`}
        </p>
      )}

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400 font-medium w-32">Ação</TableHead>
              <TableHead className="text-zinc-400 font-medium">Entidade</TableHead>
              <TableHead className="text-zinc-400 font-medium">Campo</TableHead>
              <TableHead className="text-zinc-400 font-medium">Valor Anterior</TableHead>
              <TableHead className="text-zinc-400 font-medium">Novo Valor</TableHead>
              <TableHead className="text-zinc-400 font-medium">Usuário</TableHead>
              <TableHead className="text-zinc-400 font-medium">Data/Hora</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows />
            ) : logs.length === 0 ? (
              <TableRow className="border-zinc-800 hover:bg-zinc-900">
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <History size={32} className="text-zinc-700" />
                    <p className="text-sm text-zinc-500">Nenhum registro encontrado</p>
                    {entityType !== "all" && (
                      <p className="text-xs text-zinc-600">
                        Tente remover o filtro de entidade
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const badge = ACTION_BADGE[log.action];
                return (
                  <TableRow
                    key={log.id}
                    className="border-zinc-800 hover:bg-zinc-800/40 transition-colors"
                  >
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-300 text-sm">
                      <span className="font-medium">
                        {ENTITY_LABELS[log.entityType] ?? log.entityType}
                      </span>
                      <span className="text-zinc-600 ml-1.5 text-[11px] font-mono">
                        {log.entityId.slice(0, 8)}…
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm font-mono text-[12px]">
                      {log.field ?? "—"}
                    </TableCell>
                    <TableCell className="text-zinc-500 text-sm max-w-[180px]">
                      <span title={log.oldValue ?? undefined} className="truncate block">
                        {truncate(log.oldValue)}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-300 text-sm max-w-[180px]">
                      <span title={log.newValue ?? undefined} className="truncate block">
                        {truncate(log.newValue)}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm">
                      {log.user.name ?? log.user.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-zinc-500 text-sm whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Load more */}
      {!loading && hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          >
            {loadingMore ? (
              <>
                <Loader2 size={14} className="animate-spin mr-2" />
                Carregando…
              </>
            ) : (
              `Carregar mais (${pagination!.total - logs.length} restantes)`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
