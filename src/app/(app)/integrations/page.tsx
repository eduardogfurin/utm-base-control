"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { toast } from "sonner";
import {
  Plug, RefreshCw, CheckCircle2, XCircle, Globe, Key,
  AlertTriangle, Plus, QrCode, ChevronDown, ChevronUp,
  Upload, Trash2, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Integration {
  id: string;
  provider: string;
  domain: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

interface RebrandlyDomain {
  id: string;
  fullName: string;
  active: boolean;
}

type DotStyle = "square" | "rounded" | "dots" | "classy" | "classy-rounded" | "extra-rounded";
type ExportSize = 256 | 512 | 1080;
type ExportFormat = "png" | "svg" | "jpeg" | "webp";

interface QrConfig {
  fgColor: string;
  bgColor: string;
  logoDataUrl: string;
  // 0.1–0.4 → imageSize passed to qr-code-styling (capped at 0.4 to preserve readability)
  logoSize: number;
  // 0–10 → margin cells (qr-code-styling uses pixel margin = margin * moduleSize)
  margin: number;
  dotStyle: DotStyle;
  exportSize: ExportSize;
  exportFormat: ExportFormat;
}

const DEFAULT_QR: QrConfig = {
  fgColor: "#272727",
  bgColor: "#ffffff",
  logoDataUrl: "",
  logoSize: 0.2,
  margin: 2,
  dotStyle: "classy-rounded",
  exportSize: 256,
  exportFormat: "png",
};

// ─── QR style helpers ────────────────────────────────────────────────────────

const DOT_STYLES: { id: DotStyle; label: string }[] = [
  { id: "square", label: "Quadrado" },
  { id: "rounded", label: "Arredondado" },
  { id: "extra-rounded", label: "Oval" },
  { id: "classy", label: "Classy" },
  { id: "classy-rounded", label: "Classy +" },
  { id: "dots", label: "Pontos" },
];

function cornerStyleFor(dot: DotStyle): {
  squareType: "square" | "extra-rounded" | "dot";
  dotType: "square" | "dot";
} {
  switch (dot) {
    case "square":
    case "classy":
      return { squareType: "square", dotType: "square" };
    default:
      return { squareType: "extra-rounded", dotType: "dot" };
  }
}

function buildQrOptions(domain: string, cfg: QrConfig, size: number) {
  const corners = cornerStyleFor(cfg.dotStyle);
  return {
    width: size,
    height: size,
    type: "svg" as const,
    data: `https://${domain}`,
    dotsOptions: { color: cfg.fgColor, type: cfg.dotStyle },
    backgroundOptions: { color: cfg.bgColor },
    cornersSquareOptions: { color: cfg.fgColor, type: corners.squareType },
    cornersDotOptions: { color: cfg.fgColor, type: corners.dotType },
    margin: cfg.margin,
    ...(cfg.logoDataUrl
      ? {
          image: cfg.logoDataUrl,
          imageOptions: {
            crossOrigin: "anonymous" as const,
            margin: 2,
            imageSize: Math.min(cfg.logoSize, 0.4), // cap to preserve QR readability
          },
        }
      : {}),
  };
}

// ─── Dot style thumbnail SVGs ─────────────────────────────────────────────────

function DotStyleThumb({ style, active }: { style: DotStyle; active: boolean }) {
  const c = active ? "#3b82f6" : "#374151";
  const grid = [
    [1,1,0,1,1],
    [1,0,1,0,1],
    [0,1,0,1,0],
    [1,0,1,0,1],
    [1,1,0,1,1],
  ];
  const size = 6;
  const gap = 1.5;
  const total = grid.length * size + (grid.length - 1) * gap;
  return (
    <svg viewBox={`0 0 ${total} ${total}`} width="32" height="32">
      {grid.flatMap((row, ri) =>
        row.map((on, ci) => {
          if (!on) return null;
          const x = ci * (size + gap);
          const y = ri * (size + gap);
          if (style === "dots") return <circle key={`${ri}-${ci}`} cx={x + size / 2} cy={y + size / 2} r={size / 2} fill={c} />;
          if (style === "rounded") return <rect key={`${ri}-${ci}`} x={x} y={y} width={size} height={size} rx={1.5} fill={c} />;
          if (style === "extra-rounded") return <rect key={`${ri}-${ci}`} x={x} y={y} width={size} height={size} rx={3} fill={c} />;
          if (style === "classy") return (
            <g key={`${ri}-${ci}`}>
              <rect x={x} y={y} width={size} height={size} fill={c} />
              <rect x={x + size - 2} y={y} width={2} height={2} rx={1} fill={active ? "#93c5fd" : "#9ca3af"} />
            </g>
          );
          if (style === "classy-rounded") return (
            <g key={`${ri}-${ci}`}>
              <rect x={x} y={y} width={size} height={size} rx={1} fill={c} />
              <rect x={x + size - 2} y={y} width={2} height={2} rx={1} fill={active ? "#93c5fd" : "#9ca3af"} />
            </g>
          );
          return <rect key={`${ri}-${ci}`} x={x} y={y} width={size} height={size} fill={c} />;
        })
      )}
    </svg>
  );
}

// ─── Live QR preview component ───────────────────────────────────────────────

function QrPreview({ domain, config }: { domain: string; config: QrConfig }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<InstanceType<typeof import("qr-code-styling").default> | null>(null);
  const initializedRef = useRef(false);

  const opts = buildQrOptions(domain, config, 200);

  // Stable serialization to detect real changes
  const optsKey = JSON.stringify(opts);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (cancelled || !containerRef.current) return;
      if (!initializedRef.current) {
        instanceRef.current = new QRCodeStyling(opts);
        instanceRef.current.append(containerRef.current);
        initializedRef.current = true;
      } else {
        instanceRef.current?.update(opts);
      }
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optsKey]);

  return (
    <div
      ref={containerRef}
      className="w-[200px] h-[200px]"
      style={{ background: config.bgColor }}
    />
  );
}

// ─── Color field with react-colorful popover ─────────────────────────────────

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const id = `color-field-${label.replace(/\s+/g, "-").toLowerCase()}`;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <label htmlFor={id} className="text-xs text-gray-500 font-medium">{label}</label>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-card w-full hover:border-gray-300 transition-colors"
      >
        <div
          className="w-5 h-5 rounded-full border border-gray-200 shrink-0 shadow-sm"
          style={{ background: value }}
        />
        <span className="text-xs font-mono text-gray-600 flex-1 text-left">{value}</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 shadow-xl rounded-xl border border-gray-100 bg-card p-3 space-y-2">
          <HexColorPicker color={value} onChange={onChange} style={{ width: "100%", height: 160 }} />
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50">
            <span className="text-xs text-gray-400">#</span>
            <HexColorInput
              color={value}
              onChange={onChange}
              prefixed={false}
              className="flex-1 text-xs font-mono text-gray-700 bg-transparent outline-none uppercase"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Smooth range slider ──────────────────────────────────────────────────────

function RangeSlider({
  label,
  value,
  displayValue,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  displayValue?: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-500 font-medium">{label}</label>
        <span className="text-xs font-mono text-gray-600 bg-gray-100 rounded px-1.5 py-0.5 min-w-[28px] text-center">
          {displayValue ?? value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
        className="w-full h-2 rounded-full cursor-pointer appearance-none"
        style={{
          touchAction: "none",
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)`,
          // Custom thumb via accent-color
          accentColor: "#3b82f6",
        }}
      />
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [domains, setDomains] = useState<RebrandlyDomain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [savedDomain, setSavedDomain] = useState("");
  const [showConnectNew, setShowConnectNew] = useState(false);
  const [qrPanelOpen, setQrPanelOpen] = useState<string | null>(null);
  const [qrConfigs, setQrConfigs] = useState<Record<string, QrConfig>>({});
  const [qrPreviewDomain, setQrPreviewDomain] = useState<string>("");

  const rebrandly = integrations.find((i) => i.provider === "REBRANDLY");
  const domainHasChanges = selectedDomain !== savedDomain;

  useEffect(() => {
    Promise.all([
      fetch("/api/integrations").then((r) => r.json()),
      fetch("/api/integrations/qr-config").then((r) => r.json()).catch(() => ({ qrConfig: null })),
    ])
      .then(([data, qrData]) => {
        setIntegrations(data ?? []);
        const rb = (data ?? []).find((i: Integration) => i.provider === "REBRANDLY");
        if (rb?.domain) { setSelectedDomain(rb.domain); setSavedDomain(rb.domain); }
        // Restore saved qrConfig from the dedicated endpoint
        if (qrData?.qrConfig && typeof qrData.qrConfig === "object") {
          setQrConfigs({ __global__: { ...DEFAULT_QR, ...qrData.qrConfig } });
        }
      })
      .catch(() => toast.error("Erro ao carregar integrações"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!rebrandly?.isActive) return;
    setLoadingDomains(true);
    fetch("/api/integrations/rebrandly/domains")
      .then((r) => r.json())
      .then((res: { domains: RebrandlyDomain[]; defaultDomain: string | null } | RebrandlyDomain[]) => {
        const data = Array.isArray(res) ? res : (res?.domains ?? []);
        const defaultDomain = Array.isArray(res) ? null : res?.defaultDomain;
        setDomains(data);
        const def = defaultDomain ?? data?.[0]?.fullName ?? "";
        if (def) { setSelectedDomain(def); setSavedDomain(def); setQrPreviewDomain(def); }
      })
      .catch(() => {})
      .finally(() => setLoadingDomains(false));
  }, [rebrandly?.isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTestAndSave = async () => {
    if (!apiKey.trim()) { toast.error("Insira a API Key"); return; }
    setTesting(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "REBRANDLY", apiKey: apiKey.trim(), domain: selectedDomain || null }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error ?? `HTTP ${res.status}`);
      }
      setLoadingDomains(true);
      const dr = await fetch("/api/integrations/rebrandly/domains");
      if (dr.ok) {
        const res2 = await dr.json();
        const data: RebrandlyDomain[] = Array.isArray(res2) ? res2 : (res2?.domains ?? []);
        const def = (Array.isArray(res2) ? null : res2?.defaultDomain) ?? data?.[0]?.fullName ?? "";
        setDomains(data);
        if (def) { setSelectedDomain(def); setSavedDomain(def); setQrPreviewDomain(def); }
      }
      const ir = await fetch("/api/integrations");
      if (ir.ok) setIntegrations(await ir.json());
      toast.success("Integração conectada!");
      setApiKey("");
      setShowConnectNew(false);
      window.dispatchEvent(new Event("integration-updated"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Falha ao conectar: ${msg}`);
    } finally {
      setTesting(false);
      setLoadingDomains(false);
    }
  };

  const handleSaveDomain = async () => {
    if (!selectedDomain || !domainHasChanges) return;
    setSaving(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "REBRANDLY", domain: selectedDomain }),
      });
      if (!res.ok) throw new Error();
      setSavedDomain(selectedDomain);
      toast.success("Domínio padrão atualizado");
    } catch {
      toast.error("Erro ao salvar domínio");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Deseja desconectar a integração com o Rebrandly?")) return;
    try {
      const res = await fetch("/api/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "REBRANDLY", domain: null }),
      });
      if (!res.ok) throw new Error();
      setIntegrations((prev) =>
        prev.map((i) => (i.provider === "REBRANDLY" ? { ...i, isActive: false, domain: null } : i))
      );
      setDomains([]);
      setSelectedDomain("");
      setSavedDomain("");
      setQrPreviewDomain("");
      setShowConnectNew(false);
      toast.success("Integração desconectada");
    } catch {
      toast.error("Erro ao desconectar");
    }
  };

  const saveQrConfigRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistQrConfig = useCallback((cfg: QrConfig) => {
    if (saveQrConfigRef.current) clearTimeout(saveQrConfigRef.current);
    saveQrConfigRef.current = setTimeout(() => {
      fetch("/api/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "REBRANDLY", qrConfig: cfg }),
      }).catch(() => {});
    }, 800);
  }, []);

  const getQrConfig = useCallback(
    (domain: string): QrConfig => qrConfigs[domain] ?? qrConfigs["__global__"] ?? DEFAULT_QR,
    [qrConfigs]
  );

  const patchQrConfig = useCallback((domain: string, patch: Partial<QrConfig>) => {
    setQrConfigs((prev) => {
      const current = prev[domain] ?? prev["__global__"] ?? DEFAULT_QR;
      const updated = { ...current, ...patch };
      // Also update __global__ so it persists across domain switches
      const next = { ...prev, [domain]: updated, "__global__": updated };
      persistQrConfig(updated);
      return next;
    });
  }, [persistQrConfig]);

  const applyToAll = useCallback((sourceDomain: string) => {
    const cfg = qrConfigs[sourceDomain] ?? qrConfigs["__global__"] ?? DEFAULT_QR;
    setQrConfigs((prev) => {
      const next: Record<string, QrConfig> = { ...prev, "__global__": { ...cfg } };
      domains.forEach((d) => { next[d.fullName] = { ...cfg }; });
      return next;
    });
    persistQrConfig(cfg);
  }, [qrConfigs, domains, persistQrConfig]);

  const handleLogoUpload = useCallback((domain: string, file: File) => {
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo máximo 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      patchQrConfig(domain, { logoDataUrl: e.target?.result as string, logoSize: 0.2 });
    };
    reader.readAsDataURL(file);
  }, [patchQrConfig]);

  const handleExportQr = async (domain: string) => {
    const cfg = getQrConfig(domain);
    const { default: QRCodeStyling } = await import("qr-code-styling");
    const exportOpts = {
      ...buildQrOptions(domain, cfg, cfg.exportSize),
      type: cfg.exportFormat === "svg" ? "svg" as const : "canvas" as const,
    };
    const qr = new QRCodeStyling(exportOpts);
    await qr.download({ name: `qr-${domain.replace(/\./g, "-")}`, extension: cfg.exportFormat as "png" | "svg" | "jpeg" | "webp" });
    toast.success("QR exportado!");
  };

  const ConnectForm = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
          <Key size={13} className="text-gray-400" />
          API Key do Rebrandly
        </Label>
        <Input
          type="password"
          placeholder="Cole sua API Key aqui"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="bg-card border-gray-200 focus:border-blue-400"
        />
        <p className="text-[11px] text-gray-400">
          Encontre em <span className="font-mono text-gray-500">rebrandly.com → Account → API Keys</span>
        </p>
      </div>
      <Button onClick={handleTestAndSave} disabled={testing} className="bg-blue-500 hover:bg-blue-600 text-white">
        {testing ? <><RefreshCw size={14} className="animate-spin mr-2" />Conectando...</> : <><Plug size={14} className="mr-2" />Conectar</>}
      </Button>
    </div>
  );

  // ─── QR Customization panel ────────────────────────────────────────────────

  const QrPanel = ({ domain }: { domain: string }) => {
    const cfg = getQrConfig(domain);
    const previewDomain = qrPreviewDomain || domain;
    const previewCfg = getQrConfig(previewDomain);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    return (
      <div className="border-t border-gray-100 bg-gray-50/50">
        <div className="grid grid-cols-[1fr_auto] divide-x divide-gray-100">

          {/* ── Left: controls ── */}
          <div className="px-5 py-4 space-y-5">
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <QrCode size={14} className="text-violet-500" />
              Personalização
            </p>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <ColorField
                label="Background"
                value={cfg.bgColor}
                onChange={(v) => patchQrConfig(domain, { bgColor: v })}
              />
              <ColorField
                label="Cor principal"
                value={cfg.fgColor}
                onChange={(v) => patchQrConfig(domain, { fgColor: v })}
              />
            </div>

            {/* Margem slider */}
            <RangeSlider
              label="Margem"
              value={cfg.margin}
              min={0}
              max={10}
              step={1}
              onChange={(v) => patchQrConfig(domain, { margin: v })}
            />

            {/* Logo upload */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-medium">Upload a logo</label>
              {!cfg.logoDataUrl ? (
                <label
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer py-5 transition-all ${
                    dragOver
                      ? "border-blue-400 bg-blue-50 scale-[1.01]"
                      : "border-gray-200 bg-card hover:bg-gray-50 hover:border-gray-300"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files[0];
                    if (f) handleLogoUpload(domain, f);
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleLogoUpload(domain, f);
                    }}
                  />
                  <Upload size={18} className={dragOver ? "text-blue-400" : "text-gray-400"} />
                  <p className="text-xs text-center text-gray-500">
                    <span className="font-semibold">Drag & drop file,</span>{" "}
                    <span
                      className="underline underline-offset-2 cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      or Browse file
                    </span>
                  </p>
                  <p className="text-[11px] text-gray-400">PNG format, Max size 2MB, 1536 × 2046</p>
                </label>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cfg.logoDataUrl} alt="logo" className="w-8 h-8 object-contain rounded" />
                    <span className="text-xs text-gray-500 flex-1 truncate">Logo carregada</span>
                    <button
                      onClick={() => patchQrConfig(domain, { logoDataUrl: "", logoSize: 0.2 })}
                      className="group text-xs font-medium rounded-lg px-2.5 py-1 flex items-center gap-1 transition-colors bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600"
                    >
                      <Trash2 size={11} />
                      Deletar logo
                    </button>
                  </div>
                  <RangeSlider
                    label="Tamanho logo"
                    value={Math.round(cfg.logoSize * 10)}
                    displayValue={String(Math.round(cfg.logoSize * 10))}
                    min={1}
                    max={4}
                    step={1}
                    onChange={(v) => patchQrConfig(domain, { logoSize: v / 10 })}
                  />
                </div>
              )}
            </div>

            {/* Forma / dot styles */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-medium">Forma</label>
              <div className="grid grid-cols-6 gap-1.5">
                {DOT_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => patchQrConfig(domain, { dotStyle: s.id })}
                    title={s.label}
                    className={`flex items-center justify-center rounded-lg p-1.5 border transition-colors ${
                      cfg.dotStyle === s.id
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 bg-card"
                    }`}
                  >
                    <DotStyleThumb style={s.id} active={cfg.dotStyle === s.id} />
                  </button>
                ))}
              </div>
            </div>

            {/* Export */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-medium">Export</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={cfg.exportSize}
                    onChange={(e) => patchQrConfig(domain, { exportSize: Number(e.target.value) as ExportSize })}
                    className="w-full appearance-none rounded-lg border border-gray-200 bg-card px-2.5 py-1.5 text-xs text-gray-700 focus:border-blue-400 outline-none pr-6"
                  >
                    <option value={256}>256 px</option>
                    <option value={512}>512 px</option>
                    <option value={1080}>1080 px</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative flex-1">
                  <select
                    value={cfg.exportFormat}
                    onChange={(e) => patchQrConfig(domain, { exportFormat: e.target.value as ExportFormat })}
                    className="w-full appearance-none rounded-lg border border-gray-200 bg-card px-2.5 py-1.5 text-xs text-gray-700 focus:border-blue-400 outline-none pr-6"
                  >
                    <option value="png">PNG</option>
                    <option value="svg">SVG</option>
                    <option value="jpeg">JPG</option>
                    <option value="webp">WebP</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setQrConfigs((prev) => { const n = { ...prev }; delete n[domain]; return n; })}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Restaurar padrão
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleExportQr(domain)}
                  className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-colors"
                >
                  <Download size={12} />
                  Baixar QR
                </button>
                <button
                  type="button"
                  onClick={() => { toast.success("Estilo salvo"); setQrPanelOpen(null); }}
                  className="text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Salvar estilo
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: live preview ── */}
          <div className="w-[280px] px-5 py-4 flex flex-col items-center gap-3">
            {/* Domain selector for preview */}
            {domains.length > 1 && (
              <div className="w-full relative">
                <select
                  value={previewDomain}
                  onChange={(e) => setQrPreviewDomain(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-200 bg-card px-2.5 py-1.5 text-xs text-gray-700 focus:border-blue-400 outline-none pr-6"
                >
                  {domains.map((d) => (
                    <option key={d.id} value={d.fullName}>{d.fullName}</option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            )}

            {/* QR preview card */}
            <div
              className="rounded-xl overflow-hidden border border-gray-100 shadow-sm flex items-center justify-center"
              style={{ background: previewCfg.bgColor, width: 216, height: 216 }}
            >
              <QrPreview domain={previewDomain || domain} config={previewCfg} />
            </div>

            <p className="text-[11px] text-gray-400 text-center">{previewDomain || domain}</p>

            {/* Apply to all toggle */}
            {domains.length > 1 && (
              <div className="w-full mt-1">
                <div className="rounded-xl border border-gray-100 bg-card px-3 py-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-gray-700">Aplicar a todos os domínios</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Substituirá o estilo de todos os domínios</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Aplicar o estilo de "${domain}" para todos os ${domains.length} domínios? Isso substituirá as personalizações individuais.`)) {
                          applyToAll(domain);
                          toast.success("Estilo aplicado a todos os domínios");
                        }
                      }}
                      className="shrink-0 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1 transition-colors"
                    >
                      Aplicar a todos
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrações</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gerencie suas integrações de encurtamento de links</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ) : rebrandly?.isActive ? (
        <>
          {/* ── Connected box ── */}
          <div className="rounded-2xl bg-card border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Plug size={16} className="text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Rebrandly</p>
                  <p className="text-xs text-gray-400">Encurtamento com domínio personalizado</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                <CheckCircle2 size={12} />
                Conectado
              </span>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Domain list */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                    <Globe size={13} className="text-gray-400" />
                    Domínio padrão
                  </Label>
                  {domainHasChanges && (
                    <Button
                      onClick={handleSaveDomain}
                      disabled={saving}
                      className="h-7 px-3 text-xs bg-blue-500 hover:bg-blue-600 text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)]"
                    >
                      {saving ? <RefreshCw size={12} className="animate-spin" /> : "Salvar"}
                    </Button>
                  )}
                </div>

                {loadingDomains ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                ) : domains.length > 0 ? (
                  <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    {domains.map((d) => {
                      const isDefault = selectedDomain === d.fullName;
                      const panelOpen = qrPanelOpen === d.fullName;
                      return (
                        <div key={d.id}>
                          <div className={`flex items-center gap-3 px-3.5 py-2.5 transition-colors ${isDefault ? "bg-blue-50/60" : "hover:bg-gray-50/60"}`}>
                            {/* Radio */}
                            <button
                              type="button"
                              onClick={() => setSelectedDomain(d.fullName)}
                              className="flex items-center justify-center w-4 h-4 rounded-full border-2 shrink-0 transition-colors"
                              style={{
                                borderColor: isDefault ? "#3b82f6" : "#d1d5db",
                                backgroundColor: isDefault ? "#3b82f6" : "transparent",
                              }}
                            >
                              {isDefault && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                            </button>

                            <span className={`flex-1 text-sm font-medium ${isDefault ? "text-blue-700" : "text-gray-700"}`}>
                              {d.fullName}
                            </span>

                            {isDefault && (
                              <span className="text-[10px] font-semibold text-blue-500 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                                padrão
                              </span>
                            )}

                            {/* QR button */}
                            <button
                              type="button"
                              onClick={() => {
                                setQrPanelOpen(panelOpen ? null : d.fullName);
                                if (!panelOpen) setQrPreviewDomain(d.fullName);
                              }}
                              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${
                                panelOpen
                                  ? "bg-violet-50 border-violet-200 text-violet-600"
                                  : "border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                              }`}
                            >
                              <QrCode size={13} />
                              <span className="hidden sm:inline">QR</span>
                              {panelOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            </button>
                          </div>

                          {panelOpen && <QrPanel domain={d.fullName} />}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Nenhum domínio encontrado</p>
                )}

                {domainHasChanges && (
                  <p className="text-xs text-blue-500 flex items-center gap-1">
                    <AlertTriangle size={11} />
                    Alteração pendente — clique em Salvar para aplicar
                  </p>
                )}
              </div>

              {/* Danger zone */}
              <div className="rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-red-700">Desconectar integração</p>
                    <p className="text-[11px] text-red-400 mt-0.5 font-medium">Zona perigosa</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={handleDisconnect}
                  className="shrink-0 border border-red-300 text-red-600 hover:bg-red-100 hover:border-red-400 text-xs px-3 h-8"
                >
                  <XCircle size={13} className="mr-1.5" />
                  Desconectar
                </Button>
              </div>
            </div>
          </div>

          {/* ── Connect new ── */}
          {!showConnectNew ? (
            <button
              onClick={() => setShowConnectNew(true)}
              className="w-full rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 hover:bg-gray-50 hover:border-gray-300 transition-colors py-4 flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600"
            >
              <Plus size={15} />
              Conectar nova integração
            </button>
          ) : (
            <div className="rounded-2xl bg-card border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Plus size={15} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Conectar nova integração</p>
                    <p className="text-xs text-gray-400">Adicione um novo encurtador de links</p>
                  </div>
                </div>
                <button onClick={() => setShowConnectNew(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle size={16} />
                </button>
              </div>
              <div className="px-5 py-4"><ConnectForm /></div>
            </div>
          )}
        </>
      ) : (
        /* ── Disconnected ── */
        <div className="rounded-2xl bg-card border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                <Plug size={16} className="text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Rebrandly</p>
                <p className="text-xs text-gray-400">Encurtamento com domínio personalizado</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
              <XCircle size={12} />
              Desconectado
            </span>
          </div>
          <div className="px-5 py-4"><ConnectForm /></div>
        </div>
      )}

      {/* More providers */}
      <div className="rounded-2xl bg-card border border-dashed border-gray-200 px-5 py-4">
        <p className="text-xs font-semibold text-gray-500 mb-0.5">Mais integrações em breve</p>
        <p className="text-xs text-gray-400">Bitly, TinyURL e outros encurtadores serão adicionados em versões futuras.</p>
      </div>
    </div>
  );
}
