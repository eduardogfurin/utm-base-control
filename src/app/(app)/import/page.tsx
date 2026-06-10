"use client";

import { useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Papa from "papaparse";
import {
  Upload,
  FileText,
  X,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
}

interface CsvRow {
  baseUrl?: string;
  slug?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  vehicleId?: string;
  campaignId?: string;
  [key: string]: string | undefined;
}

interface ImportResult {
  created: number;
  errors: string[];
}

// ─── CSV Template ─────────────────────────────────────────────────────────────

const CSV_HEADERS = [
  "baseUrl",
  "slug",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmContent",
  "utmTerm",
  "vehicleId",
  "campaignId",
];

const CSV_EXAMPLE_ROW = [
  "https://exemplo.com/pagina",
  "slug-opcional",
  "google",
  "cpc",
  "campanha-verão",
  "banner-top",
  "",
  "vehicle-id-aqui",
  "campaign-id-aqui",
];

function downloadTemplateCsv() {
  const rows = [CSV_HEADERS, CSV_EXAMPLE_ROW];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "utm-base-control-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Template CSV baixado!");
}

// ─── Preview Table ────────────────────────────────────────────────────────────

const PREVIEW_COLUMNS = [
  { key: "baseUrl", label: "URL Base" },
  { key: "slug", label: "Slug" },
  { key: "utmSource", label: "Source" },
  { key: "utmMedium", label: "Medium" },
  { key: "utmCampaign", label: "Campaign" },
  { key: "utmContent", label: "Content" },
  { key: "utmTerm", label: "Term" },
  { key: "vehicleId", label: "VehicleId" },
  { key: "campaignId", label: "CampaignId" },
];

interface PreviewTableProps {
  rows: CsvRow[];
  defaultVehicleId: string;
  defaultCampaignId: string;
}

function PreviewTable({ rows, defaultVehicleId, defaultCampaignId }: PreviewTableProps) {
  const preview = rows.slice(0, 10);
  return (
    <div className="rounded-lg border border-gray-100 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-100 hover:bg-transparent">
            <TableHead className="text-gray-400 w-8">#</TableHead>
            {PREVIEW_COLUMNS.map((col) => (
              <TableHead key={col.key} className="text-gray-400 whitespace-nowrap">
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {preview.map((row, i) => (
            <TableRow key={i} className="border-gray-100 hover:bg-card/50">
              <TableCell className="text-gray-300 text-xs">{i + 1}</TableCell>
              {PREVIEW_COLUMNS.map((col) => {
                let value = row[col.key];
                // Apply defaults when column is empty
                if (!value && col.key === "vehicleId" && defaultVehicleId !== "none") {
                  value = defaultVehicleId;
                }
                if (!value && col.key === "campaignId" && defaultCampaignId !== "none") {
                  value = defaultCampaignId;
                }
                return (
                  <TableCell key={col.key}>
                    {value ? (
                      <span className="font-mono text-xs text-gray-800 whitespace-nowrap">
                        {value.length > 35 ? value.slice(0, 35) + "…" : value}
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs">—</span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const [defaultVehicleId, setDefaultVehicleId] = useState("none");
  const [defaultCampaignId, setDefaultCampaignId] = useState("none");

  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const isViewer = session?.user?.role === "VIEWER";

  useEffect(() => {
    const load = async () => {
      setLoadingMeta(true);
      try {
        const [vRes, cRes] = await Promise.all([
          fetch("/api/vehicles"),
          fetch("/api/campaigns"),
        ]);
        if (vRes.ok) setVehicles(await vRes.json());
        if (cRes.ok) setCampaigns(await cRes.json());
      } finally {
        setLoadingMeta(false);
      }
    };
    load();
  }, []);

  const parseFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      setParseError("Apenas arquivos .csv são aceitos.");
      return;
    }
    setParseError(null);
    setResult(null);
    setFileName(file.name);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setParseError(`Erro ao parsear CSV: ${results.errors[0].message}`);
          setParsedRows([]);
          return;
        }
        setParsedRows(results.data);
      },
      error: (err) => {
        setParseError(`Erro ao ler arquivo: ${err.message}`);
        setParsedRows([]);
      },
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const clearFile = () => {
    setFileName(null);
    setParsedRows([]);
    setParseError(null);
    setResult(null);
  };

  const buildRows = () =>
    parsedRows.map((row) => ({
      baseUrl: row.baseUrl ?? "",
      slug: row.slug ?? undefined,
      utmSource: row.utmSource ?? undefined,
      utmMedium: row.utmMedium ?? undefined,
      utmCampaign: row.utmCampaign ?? undefined,
      utmContent: row.utmContent ?? undefined,
      utmTerm: row.utmTerm ?? undefined,
      vehicleId:
        row.vehicleId?.trim() || (defaultVehicleId !== "none" ? defaultVehicleId : ""),
      campaignId:
        row.campaignId?.trim() || (defaultCampaignId !== "none" ? defaultCampaignId : ""),
    }));

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    if (isViewer) {
      toast.error("Você não tem permissão para importar links");
      return;
    }
    setImporting(true);
    setResult(null);
    try {
      const rows = buildRows();
      const res = await fetch("/api/links/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao importar");
      setResult({ created: data.created, errors: data.errors ?? [] });
      if (data.created > 0) {
        toast.success(`${data.created} link${data.created !== 1 ? "s" : ""} importado${data.created !== 1 ? "s" : ""}!`);
      }
      if (data.errors?.length > 0) {
        toast.warning(`${data.errors.length} erro${data.errors.length !== 1 ? "s" : ""} durante a importação`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao importar");
    } finally {
      setImporting(false);
    }
  };

  if (isViewer) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
        <AlertCircle className="h-10 w-10" />
        <p className="font-medium text-gray-600">Acesso negado</p>
        <p className="text-sm">Você não tem permissão para importar links.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importação CSV</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Importe múltiplos links de uma vez via arquivo CSV
          </p>
        </div>
        <Button variant="outline" onClick={downloadTemplateCsv} className="gap-2 shrink-0">
          <Download className="h-4 w-4" />
          Template CSV
        </Button>
      </div>

      {/* Defaults */}
      <div className="rounded-lg border border-gray-100 p-5 space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-800">Valores padrão</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Aplicados quando as colunas vehicleId / campaignId não estiverem no CSV ou estiverem vazias
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Veículo padrão</Label>
            <Select
              value={defaultVehicleId}
              onValueChange={(v) => v !== null && setDefaultVehicleId(v)}
              disabled={loadingMeta}
            >
              <SelectTrigger className="bg-card border-gray-100">
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Campanha padrão</Label>
            <Select
              value={defaultCampaignId}
              onValueChange={(v) => v !== null && setDefaultCampaignId(v)}
              disabled={loadingMeta}
            >
              <SelectTrigger className="bg-card border-gray-100">
                <SelectValue placeholder="Nenhuma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />

        {!fileName ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-16 cursor-pointer transition-colors",
              isDragging
                ? "border-blue-500 bg-blue-50/30"
                : "border-gray-200 hover:border-gray-300 hover:bg-card/40"
            )}
          >
            <div className={cn(
              "rounded-full p-4 transition-colors",
              isDragging ? "bg-blue-900/40" : "bg-gray-100"
            )}>
              <Upload className={cn(
                "h-8 w-8 transition-colors",
                isDragging ? "text-blue-700" : "text-gray-400"
              )} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-800">
                {isDragging ? "Solte o arquivo aqui" : "Arraste e solte seu CSV aqui"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                ou clique para selecionar — apenas arquivos .csv
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-card p-4">
            <div className="rounded-md bg-gray-100 p-2">
              <FileText className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{fileName}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {parsedRows.length} linha{parsedRows.length !== 1 ? "s" : ""} encontrada{parsedRows.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-gray-900 shrink-0"
              onClick={clearFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Parse Error */}
      {parseError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-900 bg-red-950/20 p-4">
          <AlertCircle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">Erro ao processar arquivo</p>
            <p className="text-xs text-red-700 mt-0.5">{parseError}</p>
          </div>
        </div>
      )}

      {/* Preview */}
      {parsedRows.length > 0 && !parseError && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">
                Preview{parsedRows.length > 10 ? ` (primeiras 10 de ${parsedRows.length})` : ""}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Verifique os dados antes de confirmar a importação
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{parsedRows.length} linha{parsedRows.length !== 1 ? "s" : ""}</Badge>
            </div>
          </div>

          <PreviewTable
            rows={parsedRows}
            defaultVehicleId={defaultVehicleId}
            defaultCampaignId={defaultCampaignId}
          />

          <Separator className="bg-gray-100" />

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Links sem vehicleId válido ou campaignId válido serão ignorados com erro.
            </p>
            <Button
              onClick={handleImport}
              disabled={importing || parsedRows.length === 0}
              className="gap-2 min-w-[160px]"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Importar {parsedRows.length} link{parsedRows.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <Separator className="bg-gray-100" />
          <p className="text-sm font-medium text-gray-800">Resultado da importação</p>

          {result.created > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-green-900 bg-green-950/20 p-4">
              <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-300">
                  {result.created} link{result.created !== 1 ? "s" : ""} criado{result.created !== 1 ? "s" : ""} com sucesso
                </p>
                <p className="text-xs text-green-500 mt-0.5">
                  Os links já estão disponíveis na página de Links.
                </p>
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="rounded-lg border border-yellow-900 bg-yellow-950/10 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-700" />
                <p className="text-sm font-medium text-yellow-300">
                  {result.errors.length} erro{result.errors.length !== 1 ? "s" : ""}
                </p>
              </div>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-xs text-yellow-500 font-mono">
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.created === 0 && result.errors.length === 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-card p-4">
              <AlertCircle className="h-5 w-5 text-gray-400" />
              <p className="text-sm text-gray-400">Nenhum link foi criado.</p>
            </div>
          )}
        </div>
      )}

      {/* Column guide */}
      <div className="rounded-lg border border-gray-100 bg-card/30 p-5 space-y-3">
        <p className="text-sm font-medium text-gray-600">Colunas aceitas no CSV</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CSV_HEADERS.map((col) => (
            <div key={col} className="flex items-center gap-2">
              <span
                className={cn(
                  "text-xs font-mono px-2 py-0.5 rounded",
                  ["baseUrl", "vehicleId", "campaignId"].includes(col)
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-gray-100 text-gray-600"
                )}
              >
                {col}
              </span>
              {["baseUrl", "vehicleId", "campaignId"].includes(col) && (
                <span className="text-xs text-gray-300">obrig.</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-300">
          Colunas marcadas como obrigatórias devem estar presentes ou ter valor padrão configurado acima.
        </p>
      </div>
    </div>
  );
}
