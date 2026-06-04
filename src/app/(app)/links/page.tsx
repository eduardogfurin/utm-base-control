"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Copy,
  ExternalLink,
  QrCode,
  Pencil,
  Trash2,
  Link2,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, buildUtmUrl, formatDate } from "@/lib/utils";
import { InlineCreateCard, type Vehicle, type Campaign } from "@/components/links/inline-create-card";

interface UtmTemplate {
  id: string;
  name: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  vehicleId: string | null;
}

interface RebrandlyData {
  shortUrl: string;
  clicks: number;
}

interface QrCodeData {
  id: string;
}

interface Link {
  id: string;
  baseUrl: string;
  finalUrl: string;
  slug: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  createdAt: string;
  vehicle: Vehicle;
  campaign: Campaign;
  rebrandly: RebrandlyData | null;
  qrCode: QrCodeData | null;
}

interface AppSettings {
  rebrandlyApiKey: string | null;
  rebrandlyDomain: string | null;
  rebrandlyStatus: boolean;
}

interface RebrandlyDomain {
  id: string;
  fullName: string;
  active: boolean;
}

interface LinkFormState {
  baseUrl: string;
  vehicleId: string;
  campaignId: string;
  slug: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  shortenWithRebrandly: boolean;
  rebrandlyDomain: string;
}

const emptyForm: LinkFormState = {
  baseUrl: "",
  vehicleId: "",
  campaignId: "",
  slug: "",
  utmSource: "",
  utmMedium: "",
  utmCampaign: "",
  utmContent: "",
  utmTerm: "",
  shortenWithRebrandly: false,
  rebrandlyDomain: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "INACTIVE") return "secondary";
  return "outline";
}

function statusLabel(status: string) {
  if (status === "ACTIVE") return "Ativo";
  if (status === "INACTIVE") return "Inativo";
  return "Arquivado";
}

// ─── QR Code Dialog ───────────────────────────────────────────────────────────

function QrCodeDialog({ link }: { link: Link }) {
  const [svgData, setSvgData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const loadQr = useCallback(async () => {
    if (!link.qrCode?.id || svgData) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/links/${link.id}`);
      const data = await res.json();
      if (data?.qrCode?.svgData) setSvgData(data.qrCode.svgData);
    } catch {
      toast.error("Erro ao carregar QR Code");
    } finally {
      setLoading(false);
    }
  }, [link.id, link.qrCode?.id, svgData]);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) loadQr(); }}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-gray-900"
            title="Ver QR Code"
            disabled={!link.qrCode}
          />
        }
      >
        <QrCode className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>QR Code — {link.slug}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          {loading ? (
            <Skeleton className="h-40 w-40 rounded-lg" />
          ) : svgData ? (
            <div
              className="h-40 w-40 rounded-lg overflow-hidden bg-white p-2"
              dangerouslySetInnerHTML={{ __html: svgData }}
            />
          ) : (
            <p className="text-gray-400 text-sm">QR Code não disponível</p>
          )}
          <p className="text-xs text-gray-400 text-center break-all">{link.finalUrl}</p>
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={() => { if (svgData) { navigator.clipboard.writeText(svgData); toast.success("SVG copiado!"); } }} disabled={!svgData}>
              <Copy className="h-4 w-4 mr-2" /> Copiar SVG
            </Button>
            <Button className="flex-1" onClick={() => { if (svgData) { const blob = new Blob([svgData], { type: "image/svg+xml" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `qr-${link.slug}.svg`; a.click(); URL.revokeObjectURL(url); toast.success("Download iniciado!"); } }} disabled={!svgData}>
              Baixar SVG
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── UTM Popover ──────────────────────────────────────────────────────────────

function UtmPopover({ link }: { link: Link }) {
  const utms = [
    { key: "utm_source", value: link.utmSource },
    { key: "utm_medium", value: link.utmMedium },
    { key: "utm_campaign", value: link.utmCampaign },
    { key: "utm_content", value: link.utmContent },
    { key: "utm_term", value: link.utmTerm },
  ].filter((u) => u.value);

  if (utms.length === 0) return <span className="text-gray-300 text-xs">—</span>;

  return (
    <Popover>
      <PopoverTrigger
        render={<button className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-900 transition-colors" />}
      >
        {utms.length} param{utms.length > 1 ? "s" : ""}
        <ChevronDown className="h-3 w-3" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 bg-white border-gray-100">
        <div className="space-y-1.5">
          {utms.map((u) => (
            <div key={u.key} className="flex items-start justify-between gap-2">
              <span className="text-xs text-gray-400 font-mono shrink-0">{u.key}</span>
              <span className="text-xs text-gray-800 text-right break-all">{u.value}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Link Form Dialog (for edit) ──────────────────────────────────────────────

interface LinkFormDialogProps {
  link: Link;
  vehicles: Vehicle[];
  campaigns: Campaign[];
  settings: AppSettings | null;
  hasUserRebrandly?: boolean;
  onSuccess: () => void;
}

function LinkEditDialog({
  link,
  vehicles,
  campaigns,
  settings,
  hasUserRebrandly = false,
  onSuccess,
}: LinkFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rebrandlyDomains, setRebrandlyDomains] = useState<RebrandlyDomain[]>([]);
  const [form, setForm] = useState<LinkFormState>({
    baseUrl: link.baseUrl,
    vehicleId: link.vehicle.id,
    campaignId: link.campaign.id,
    slug: link.slug,
    utmSource: link.utmSource ?? "",
    utmMedium: link.utmMedium ?? "",
    utmCampaign: link.utmCampaign ?? "",
    utmContent: link.utmContent ?? "",
    utmTerm: link.utmTerm ?? "",
    shortenWithRebrandly: !!link.rebrandly,
    rebrandlyDomain: link.rebrandly?.shortUrl?.split("/")[0] ?? "",
  });

  const hasRebrandly = hasUserRebrandly || !!(settings?.rebrandlyApiKey && settings?.rebrandlyStatus);

  useEffect(() => {
    if (!open || !hasRebrandly) return;
    fetch("/api/integrations/rebrandly/domains")
      .then((r) => r.json())
      .then((data: RebrandlyDomain[]) => {
        setRebrandlyDomains(data ?? []);
        setForm((prev) => ({
          ...prev,
          rebrandlyDomain: prev.rebrandlyDomain || (data?.[0]?.fullName ?? ""),
        }));
      })
      .catch(() => {});
  }, [open, hasRebrandly]);

  const set = (field: keyof LinkFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const previewUrl = buildUtmUrl(form.baseUrl, {
    utmSource: form.utmSource || null,
    utmMedium: form.utmMedium || null,
    utmCampaign: form.utmCampaign || null,
    utmContent: form.utmContent || null,
    utmTerm: form.utmTerm || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.baseUrl || !form.vehicleId || !form.campaignId) {
      toast.error("URL Base, Veículo e Campanha são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: form.baseUrl,
          vehicleId: form.vehicleId,
          campaignId: form.campaignId,
          slug: form.slug || undefined,
          utmSource: form.utmSource || undefined,
          utmMedium: form.utmMedium || undefined,
          utmCampaign: form.utmCampaign || undefined,
          utmContent: form.utmContent || undefined,
          utmTerm: form.utmTerm || undefined,
          shortenWithRebrandly: form.shortenWithRebrandly,
          rebrandlyDomain: form.rebrandlyDomain || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao salvar link");
      }
      toast.success("Link atualizado!");
      setOpen(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar link");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-gray-900"
            title="Editar"
          />
        }
      >
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Link</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-1.5">
            <Label>URL Base *</Label>
            <Input
              placeholder="https://exemplo.com/pagina"
              value={form.baseUrl}
              onChange={(e) => set("baseUrl", e.target.value)}
              className="bg-white border-gray-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Veículo *</Label>
              <select
                value={form.vehicleId}
                onChange={(e) => set("vehicleId", e.target.value)}
                className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-400"
              >
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Campanha *</Label>
              <select
                value={form.campaignId}
                onChange={(e) => set("campaignId", e.target.value)}
                className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-400"
              >
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              className="bg-white border-gray-200 font-mono text-sm"
            />
          </div>
          <Separator className="bg-gray-100" />
          <div>
            <p className="text-sm font-medium text-gray-600 mb-3">Parâmetros UTM</p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { field: "utmSource", label: "UTM Source", placeholder: "ex: google" },
                  { field: "utmMedium", label: "UTM Medium", placeholder: "ex: cpc" },
                  { field: "utmCampaign", label: "UTM Campaign", placeholder: "ex: lancamento-2026" },
                  { field: "utmContent", label: "UTM Content", placeholder: "ex: banner-topo" },
                ] as { field: keyof LinkFormState; label: string; placeholder: string }[]
              ).map(({ field, label, placeholder }) => (
                <div key={field} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input
                    placeholder={placeholder}
                    value={form[field] as string}
                    onChange={(e) => set(field, e.target.value)}
                    className="bg-white border-gray-200"
                  />
                </div>
              ))}
              <div className="col-span-2 space-y-1.5">
                <Label>UTM Term</Label>
                <Input
                  placeholder="ex: palavra-chave"
                  value={form.utmTerm}
                  onChange={(e) => set("utmTerm", e.target.value)}
                  className="bg-white border-gray-200"
                />
              </div>
            </div>
          </div>
          {form.baseUrl && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
              <p className="text-xs text-gray-400 mb-1.5 font-medium">Preview da URL final</p>
              <p className="text-xs text-gray-600 break-all font-mono leading-relaxed">{previewUrl}</p>
            </div>
          )}
          {hasRebrandly && (
            <div className="rounded-xl border border-gray-100 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Encurtar via Rebrandly</p>
                  <p className="text-xs text-gray-400">Gera um link curto com domínio personalizado</p>
                </div>
                <Switch checked={form.shortenWithRebrandly} onCheckedChange={(v) => set("shortenWithRebrandly", v)} />
              </div>
              {form.shortenWithRebrandly && rebrandlyDomains.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Domínio</Label>
                  <select
                    value={form.rebrandlyDomain}
                    onChange={(e) => set("rebrandlyDomain", e.target.value)}
                    className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-400"
                  >
                    {rebrandlyDomains.map((d) => (
                      <option key={d.id} value={d.fullName}>{d.fullName}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving} className="text-gray-500 hover:text-gray-800">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-[#1C1B21] hover:bg-orange-500 text-white transition-colors duration-300">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function LinksPageInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [links, setLinks] = useState<Link[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [hasUserRebrandly, setHasUserRebrandly] = useState(false);
  const [loading, setLoading] = useState(true);

  const [filterVehicleId, setFilterVehicleId] = useState(searchParams.get("vehicleId") ?? "all");
  const [filterCampaignId, setFilterCampaignId] = useState(searchParams.get("campaignId") ?? "all");
  const [filterSearch, setFilterSearch] = useState("");

  const isViewer = session?.user?.role === "VIEWER";

  const fetchLinks = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterVehicleId !== "all") params.set("vehicleId", filterVehicleId);
    if (filterCampaignId !== "all") params.set("campaignId", filterCampaignId);
    if (filterSearch.trim()) params.set("search", filterSearch.trim());
    const res = await fetch(`/api/links?${params.toString()}`);
    if (res.ok) setLinks(await res.json());
  }, [filterVehicleId, filterCampaignId, filterSearch]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [vehiclesRes, campaignsRes, settingsRes, integrationsRes] = await Promise.all([
          fetch("/api/vehicles"),
          fetch("/api/campaigns"),
          fetch("/api/settings"),
          fetch("/api/integrations"),
        ]);
        if (vehiclesRes.ok) setVehicles(await vehiclesRes.json());
        if (campaignsRes.ok) setCampaigns(await campaignsRes.json());
        if (settingsRes.ok) setSettings(await settingsRes.json());
        if (integrationsRes.ok) {
          const integrations = await integrationsRes.json();
          setHasUserRebrandly(
            Array.isArray(integrations) &&
            integrations.some((i: { provider: string; isActive: boolean }) =>
              i.provider === "REBRANDLY" && i.isActive
            )
          );
        }
        await fetchLinks();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading) fetchLinks();
  }, [filterVehicleId, filterCampaignId, filterSearch, fetchLinks, loading]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/links/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Link deletado!");
      fetchLinks();
    } catch {
      toast.error("Erro ao deletar link");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Links</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gerencie seus links UTM e links curtos</p>
      </div>

      {/* Inline create card */}
      {!isViewer && (
        <InlineCreateCard
          vehicles={vehicles}
          campaigns={campaigns}
          settings={settings}
          hasUserRebrandly={hasUserRebrandly}
          onSuccess={fetchLinks}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterVehicleId} onValueChange={(v) => v !== null && setFilterVehicleId(v)}>
          <SelectTrigger className="w-48 bg-white border-gray-100">
            <SelectValue placeholder="Todos os veículos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os veículos</SelectItem>
            {vehicles.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCampaignId} onValueChange={(v) => v !== null && setFilterCampaignId(v)}>
          <SelectTrigger className="w-48 bg-white border-gray-100">
            <SelectValue placeholder="Todas as campanhas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as campanhas</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Buscar por slug ou URL..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="w-64 bg-white border-gray-100"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-100 hover:bg-transparent bg-gray-50/60">
              <TableHead className="text-gray-400">Link</TableHead>
              <TableHead className="text-gray-400">UTMs</TableHead>
              <TableHead className="text-gray-400 text-right">Cliques</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Criado</TableHead>
              <TableHead className="text-gray-400 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-gray-100">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : links.length === 0 ? (
              <TableRow className="border-gray-100">
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Link2 className="h-8 w-8" />
                    <p className="text-sm">Nenhum link encontrado</p>
                    {!isViewer && (
                      <p className="text-xs">Cole uma URL acima para criar seu primeiro link</p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              links.map((link) => (
                <TableRow
                  key={link.id}
                  className="border-gray-100 hover:bg-gray-50/50 transition-colors duration-150"
                >
                  <TableCell className="min-w-[220px]">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <Link2 className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        {link.rebrandly ? (
                          <a
                            href={`https://${link.rebrandly.shortUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-gray-800 hover:text-orange-500 flex items-center gap-1 transition-colors duration-200"
                          >
                            {link.rebrandly.shortUrl}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-gray-800 font-mono">/{link.slug}</span>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {link.vehicle.name} · {link.campaign.name}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><UtmPopover link={link} /></TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-semibold text-gray-700 tabular-nums">
                      {link.rebrandly
                        ? `${link.rebrandly.clicks >= 1000 ? (link.rebrandly.clicks / 1000).toFixed(1) + "k" : link.rebrandly.clicks} clicks`
                        : "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(link.status)} className="text-xs">
                      {statusLabel(link.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-gray-400">{formatDate(link.createdAt)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-gray-900 transition-colors duration-200"
                        title="Copiar URL completa"
                        onClick={() => copyToClipboard(link.finalUrl, "URL completa")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {link.rebrandly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-gray-900 transition-colors duration-200"
                          title="Copiar link curto"
                          onClick={() => copyToClipboard(`https://${link.rebrandly!.shortUrl}`, "Link curto")}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <QrCodeDialog link={link} />
                      {!isViewer && (
                        <LinkEditDialog
                          link={link}
                          vehicles={vehicles}
                          campaigns={campaigns}
                          settings={settings}
                          hasUserRebrandly={hasUserRebrandly}
                          onSuccess={fetchLinks}
                        />
                      )}
                      {!isViewer && (
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-red-700 transition-colors duration-200"
                                title="Deletar"
                              />
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deletar link?</AlertDialogTitle>
                              <AlertDialogDescription>
                                O link <strong className="text-gray-800">{link.slug}</strong> será
                                removido permanentemente. Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(link.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && links.length > 0 && (
        <p className="text-xs text-gray-300">
          {links.length} link{links.length !== 1 ? "s" : ""} encontrado{links.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

export default function LinksPage() {
  return (
    <Suspense>
      <LinksPageInner />
    </Suspense>
  );
}
