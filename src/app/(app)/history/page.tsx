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
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  UPDATED: {
    label: "Atualizado",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  DELETED: {
    label: "Deletado",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  INTEGRATION: {
    label: "Integração",
    className: "bg-violet-50 text-violet-700 border-violet-200",
  },
  METRICS_SYNC: {
    label: "Sync Métricas",
    className: "bg-gray-100 text-gray-400 border-gray-200",
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
        <TableRow key={i} className="border-gray-100">
          <TableCell>
            <Skeleton className="h-5 w-20 bg-gray-100" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24 bg-gray-100" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20 bg-gray-100" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32 bg-gray-100" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32 bg-gray-100" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24 bg-gray-100" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28 bg-gray-100" />
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
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <History size={16} className="text-gray-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Histórico de Alterações
            </h1>
            <p className="text-sm text-gray-400">
              Auditoria completa de todas as ações no sistema
            </p>
          </div>
        </div>

        {/* Filter */}
        <Select
          value={entityType}
          onValueChange={(val) => setEntityType(val ?? "all")}
        >
          <SelectTrigger className="w-44 bg-card border-gray-200 text-gray-800">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent className="bg-card border-gray-200">
            <SelectItem value="all" className="text-gray-800">
              Todos
            </SelectItem>
            <SelectItem value="Vehicle" className="text-gray-800">
              Veículo
            </SelectItem>
            <SelectItem value="Campaign" className="text-gray-800">
              Campanha
            </SelectItem>
            <SelectItem value="Link" className="text-gray-800">
              Link
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats pill */}
      {pagination && !loading && (
        <p className="text-xs text-gray-400">
          {pagination.total} registro{pagination.total !== 1 ? "s" : ""} encontrado
          {pagination.total !== 1 ? "s" : ""}
          {entityType !== "all" && ` para "${ENTITY_LABELS[entityType] ?? entityType}"`}
        </p>
      )}

      {/* Table */}
      <div className="bg-card border border-gray-100 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-100 hover:bg-transparent">
              <TableHead className="text-gray-400 font-medium w-32">Ação</TableHead>
              <TableHead className="text-gray-400 font-medium">Entidade</TableHead>
              <TableHead className="text-gray-400 font-medium">Campo</TableHead>
              <TableHead className="text-gray-400 font-medium">Valor Anterior</TableHead>
              <TableHead className="text-gray-400 font-medium">Novo Valor</TableHead>
              <TableHead className="text-gray-400 font-medium">Usuário</TableHead>
              <TableHead className="text-gray-400 font-medium">Data/Hora</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows />
            ) : logs.length === 0 ? (
              <TableRow className="border-gray-100 hover:bg-card">
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <History size={32} className="text-gray-500" />
                    <p className="text-sm text-gray-400">Nenhum registro encontrado</p>
                    {entityType !== "all" && (
                      <p className="text-xs text-gray-300">
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
                    className="border-gray-100 hover:bg-gray-50/60 transition-colors"
                  >
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">
                      <span className="font-medium">
                        {ENTITY_LABELS[log.entityType] ?? log.entityType}
                      </span>
                      <span className="text-gray-300 ml-1.5 text-[11px] font-mono">
                        {log.entityId.slice(0, 8)}…
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm font-mono text-[12px]">
                      {log.field ?? "—"}
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm max-w-[180px]">
                      <span title={log.oldValue ?? undefined} className="truncate block">
                        {truncate(log.oldValue)}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm max-w-[180px]">
                      <span title={log.newValue ?? undefined} className="truncate block">
                        {truncate(log.newValue)}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {log.user.name ?? log.user.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm whitespace-nowrap">
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
            className="border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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
