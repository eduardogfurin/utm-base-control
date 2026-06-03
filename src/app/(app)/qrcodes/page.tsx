"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { QrCode, Copy, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
}

interface QrCodeData {
  id: string;
  svgData: string;
}

interface RebrandlyData {
  shortUrl: string;
}

interface Link {
  id: string;
  slug: string;
  finalUrl: string;
  baseUrl: string;
  vehicle: Vehicle;
  campaign: Campaign;
  rebrandly: RebrandlyData | null;
  qrCode: QrCodeData | null;
}

// ─── QR Card ─────────────────────────────────────────────────────────────────

function QrCard({ link }: { link: Link }) {
  const qr = link.qrCode!;

  const handleDownloadSvg = () => {
    const blob = new Blob([qr.svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${link.slug}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Download iniciado!");
  };

  const handleCopySvg = () => {
    navigator.clipboard.writeText(qr.svgData);
    toast.success("SVG copiado para a área de transferência!");
  };

  const handleCopyUrl = () => {
    const url = link.rebrandly
      ? `https://${link.rebrandly.shortUrl}`
      : link.finalUrl;
    navigator.clipboard.writeText(url);
    toast.success("URL copiada!");
  };

  return (
    <div className="rounded-lg border border-gray-100 bg-white overflow-hidden flex flex-col">
      {/* QR Preview */}
      <Dialog>
        <DialogTrigger
          render={
            <button className="flex items-center justify-center p-6 bg-gray-50 hover:bg-gray-50 transition-colors cursor-zoom-in group" />
          }
        >
          <div
            className="h-[150px] w-[150px] rounded overflow-hidden bg-white p-1.5 group-hover:scale-105 transition-transform"
            dangerouslySetInnerHTML={{ __html: qr.svgData }}
          />
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code — {link.slug}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div
              className="h-64 w-64 rounded-lg overflow-hidden bg-white p-3"
              dangerouslySetInnerHTML={{ __html: qr.svgData }}
            />
            <p className="text-xs text-gray-400 text-center break-all">
              {link.rebrandly
                ? `https://${link.rebrandly.shortUrl}`
                : link.finalUrl}
            </p>
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={handleCopySvg}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar SVG
              </Button>
              <Button className="flex-1" onClick={handleDownloadSvg}>
                <Download className="h-4 w-4 mr-2" />
                Baixar SVG
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Card Body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <p className="font-mono text-sm font-medium text-gray-900 truncate">{link.slug}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant="secondary" className="text-xs">
              {link.vehicle.name}
            </Badge>
            <Badge variant="outline" className="text-xs text-gray-400 border-gray-200">
              {link.campaign.name}
            </Badge>
          </div>
        </div>

        {link.rebrandly && (
          <a
            href={`https://${link.rebrandly.shortUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors truncate"
          >
            {link.rebrandly.shortUrl}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs gap-1.5"
            onClick={handleCopySvg}
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar SVG
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs gap-1.5"
            onClick={handleDownloadSvg}
          >
            <Download className="h-3.5 w-3.5" />
            Baixar SVG
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-gray-400 hover:text-gray-900"
            title="Copiar URL"
            onClick={handleCopyUrl}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function QrCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-100 bg-white overflow-hidden">
      <div className="flex items-center justify-center p-6 bg-gray-50">
        <Skeleton className="h-[150px] w-[150px] rounded" />
      </div>
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 flex-1 rounded" />
          <Skeleton className="h-8 flex-1 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QrCodesPage() {
  const [links, setLinks] = useState<Link[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterVehicleId, setFilterVehicleId] = useState("all");
  const [filterCampaignId, setFilterCampaignId] = useState("all");

  const fetchLinks = useCallback(async () => {
    const res = await fetch("/api/links");
    if (res.ok) {
      const data: Link[] = await res.json();
      setLinks(data.filter((l) => l.qrCode !== null));
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [vehiclesRes, campaignsRes] = await Promise.all([
          fetch("/api/vehicles"),
          fetch("/api/campaigns"),
          fetchLinks(),
        ]);
        if (vehiclesRes.ok) setVehicles(await vehiclesRes.json());
        if (campaignsRes.ok) setCampaigns(await campaignsRes.json());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchLinks]);

  const filteredLinks = links.filter((l) => {
    if (filterVehicleId !== "all" && l.vehicle.id !== filterVehicleId) return false;
    if (filterCampaignId !== "all" && l.campaign.id !== filterCampaignId) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR Codes</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            QR Codes gerados automaticamente para seus links
          </p>
        </div>
        {!loading && (
          <span className="text-sm text-gray-400">
            {filteredLinks.length} QR Code{filteredLinks.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterVehicleId} onValueChange={(v) => v !== null && setFilterVehicleId(v)}>
          <SelectTrigger className="w-48 bg-white border-gray-100">
            <SelectValue placeholder="Todos os veículos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os veículos</SelectItem>
            {vehicles.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
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
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <QrCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-100 bg-white/30 py-24 gap-4">
          <div className="rounded-full bg-gray-100 p-4">
            <QrCode className="h-10 w-10 text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-gray-600 font-medium">Nenhum QR Code encontrado</p>
            <p className="text-sm text-gray-400 mt-1">
              {links.length === 0
                ? "Crie links com QR Code na página de Links"
                : "Nenhum QR Code corresponde aos filtros selecionados"}
            </p>
          </div>
          {links.length === 0 && (
            <Button variant="outline" onClick={() => (window.location.href = "/links")}>
              Ir para Links
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredLinks.map((link) => (
            <QrCard key={link.id} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}
