"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  logoSize: number;
  margin: number;
  dotStyle: DotStyle;
  exportSize: ExportSize;
  exportFormat: ExportFormat;
}

const DEFAULT_QR: QrConfig = {
  fgColor: "#272727",
  bgColor: "#ffffff",
  logoDataUrl: "",
  logoSize: 0.3,
  margin: 2,
  dotStyle: "classy-rounded",
  exportSize: 256,
  exportFormat: "png",
};

// ─── QR Dot style thumbnails (inline SVG previews) ───────────────────────────

const DOT_STYLES: { id: DotStyle; label: string }[] = [
  { id: "square", label: "Quadrado" },
  { id: "rounded", label: "Arredondado" },
  { id: "extra-rounded", label: "Oval" },
  { id: "classy", label: "Classy" },
  { id: "classy-rounded", label: "Classy +" },
  { id: "dots", label: "Pontos" },
];

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
          if (style === "dots") {
            return <circle key={`${ri}-${ci}`} cx={x + size / 2} cy={y + size / 2} r={size / 2} fill={c} />;
          }
          if (style === "rounded") {
            return <rect key={`${ri}-${ci}`} x={x} y={y} width={size} height={size} rx={1.5} fill={c} />;
          }
          if (style === "extra-rounded") {
            return <rect key={`${ri}-${ci}`} x={x} y={y} width={size} height={size} rx={3} fill={c} />;
          }
          if (style === "classy") {
            return (
              <g key={`${ri}-${ci}`}>
                <rect x={x} y={y} width={size} height={size} fill={c} />
                <rect x={x + size - 2} y={y} width={2} height={2} rx={1} fill={active ? "#93c5fd" : "#9ca3af"} />
              </g>
            );
          }
          if (style === "classy-rounded") {
            return (
              <g key={`${ri}-${ci}`}>
                <rect x={x} y={y} width={size} height={size} rx={1} fill={c} />
                <rect x={x + size - 2} y={y} width={2} height={2} rx={1} fill={active ? "#93c5fd" : "#9ca3af"} />
              </g>
            );
          }
          // square
          return <rect key={`${ri}-${ci}`} x={x} y={y} width={size} height={size} fill={c} />;
        })
      )}
    </svg>
  );
}

// ─── Live QR preview (canvas-based via qr-code-styling) ──────────────────────

function QrPreview({ domain, config }: { domain: string; config: QrConfig }) {
  const ref = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<InstanceType<typeof import("qr-code-styling").default> | null>(null);

  const buildOptions = useCallback(() => ({
    width: 200,
    height: 200,
    type: "svg" as const,
    data: `https://${domain}`,
    dotsOptions: { color: config.fgColor, type: config.dotStyle },
    backgroundOptions: { color: config.bgColor },
    cornersSquareOptions: { color: config.fgColor, type: "extra-rounded" as const },
    cornersDotOptions: { color: config.fgColor, type: "dot" as const },
    margin: config.margin,
    ...(config.logoDataUrl
      ? {
          image: config.logoDataUrl,
          imageOptions: { crossOrigin: "anonymous" as const, margin: 4, imageSize: config.logoSize },
        }
      : {}),
  }), [domain, config]);

  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;
    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (cancelled || !ref.current) return;
      if (instanceRef.current) {
        instanceRef.current.update(buildOptions());
      } else {
        instanceRef.current = new QRCodeStyling(buildOptions());
        instanceRef.current.append(ref.current);
      }
    });
    return () => { cancelled = true; };
  }, [buildOptions]);

  return (
    <div
      ref={ref}
      className="w-[200px] h-[200px] flex items-center justify-center"
      style={{ background: config.bgColor }}
    />
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
    fetch("/api/integrations")
      .then((r) => r.json())
      .then((data) => {
        setIntegrations(data ?? []);
        const rb = (data ?? []).find((i: Integration) => i.provider === "REBRANDLY");
        if (rb?.domain) { setSelectedDomain(rb.domain); setSavedDomain(rb.domain); }
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
      if (!res.ok) throw new Error();
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
    } catch {
      toast.error("Falha ao conectar. Verifique a API Key.");
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

  const getQrConfig = (domain: string): QrConfig => qrConfigs[domain] ?? DEFAULT_QR;
  const patchQrConfig = (domain: string, patch: Partial<QrConfig>) =>
    setQrConfigs((prev) => ({ ...prev, [domain]: { ...getQrConfig(domain), ...patch } }));

  const handleLogoUpload = (domain: string, file: File) => {
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo máximo 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      patchQrConfig(domain, { logoDataUrl: e.target?.result as string, logoSize: 0.3 });
    };
    reader.readAsDataURL(file);
  };

  const handleExportQr = async (domain: string) => {
    const cfg = getQrConfig(domain);
    const { default: QRCodeStyling } = await import("qr-code-styling");
    const qr = new QRCodeStyling({
      width: cfg.exportSize,
      height: cfg.exportSize,
      type: cfg.exportFormat === "svg" ? "svg" : "canvas",
      data: `https://${domain}`,
      dotsOptions: { color: cfg.fgColor, type: cfg.dotStyle },
      backgroundOptions: { color: cfg.bgColor },
      cornersSquareOptions: { color: cfg.fgColor, type: "extra-rounded" },
      cornersDotOptions: { color: cfg.fgColor, type: "dot" },
      margin: cfg.margin,
      ...(cfg.logoDataUrl
        ? { image: cfg.logoDataUrl, imageOptions: { crossOrigin: "anonymous", margin: 4, imageSize: cfg.logoSize } }
        : {}),
    });
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

    return (
      <div className="border-t border-gray-100 bg-gray-50/50">
        <div className="grid grid-cols-[1fr_auto] gap-0 divide-x divide-gray-100">

          {/* ── Left: controls ── */}
          <div className="px-5 py-4 space-y-5">
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <QrCode size={14} className="text-violet-500" />
              Personalização
            </p>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-medium">Background</label>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-card">
                  <input
                    type="color"
                    value={cfg.bgColor}
                    onChange={(e) => patchQrConfig(domain, { bgColor: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border-none bg-transparent p-0 shrink-0"
                  />
                  <span className="text-xs font-mono text-gray-600 flex-1">{cfg.bgColor}</span>
                  <button
                    onClick={() => {
                      const v = prompt("Hex color", cfg.bgColor);
                      if (v) patchQrConfig(domain, { bgColor: v });
                    }}
                    className="text-gray-300 hover:text-gray-500"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-medium">Cor principal</label>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-card">
                  <input
                    type="color"
                    value={cfg.fgColor}
                    onChange={(e) => patchQrConfig(domain, { fgColor: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border-none bg-transparent p-0 shrink-0"
                  />
                  <span className="text-xs font-mono text-gray-600 flex-1">{cfg.fgColor}</span>
                  <button
                    onClick={() => {
                      const v = prompt("Hex color", cfg.fgColor);
                      if (v) patchQrConfig(domain, { fgColor: v });
                    }}
                    className="text-gray-300 hover:text-gray-500"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Margem slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-500 font-medium">Margem</label>
                <span className="text-xs font-mono text-gray-600 bg-gray-100 rounded px-1.5 py-0.5">{cfg.margin}</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={cfg.margin}
                onChange={(e) => patchQrConfig(domain, { margin: Number(e.target.value) })}
                className="w-full h-1.5 rounded-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Logo upload */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-medium">Upload a logo</label>
              {!cfg.logoDataUrl ? (
                <label
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-card hover:bg-gray-50 cursor-pointer py-5 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
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
                  <Upload size={18} className="text-gray-400" />
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
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cfg.logoDataUrl} alt="logo" className="w-8 h-8 object-contain rounded" />
                    <span className="text-xs text-gray-500 flex-1 truncate">Logo carregada</span>
                    <button
                      onClick={() => patchQrConfig(domain, { logoDataUrl: "", logoSize: 0.3 })}
                      className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg px-2.5 py-1 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={11} />
                      Deletar logo
                    </button>
                  </div>
                  {/* Logo size slider — only shown when logo is set */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-500 font-medium">Tamanho logo</label>
                      <span className="text-xs font-mono text-gray-600 bg-gray-100 rounded px-1.5 py-0.5">
                        {(cfg.logoSize * 10).toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={0.1}
                      value={cfg.logoSize * 10}
                      onChange={(e) => patchQrConfig(domain, { logoSize: Number(e.target.value) / 10 })}
                      className="w-full h-1.5 rounded-full accent-blue-500 cursor-pointer"
                    />
                  </div>
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

            {/* QR preview */}
            <div
              className="rounded-xl overflow-hidden border border-gray-100 shadow-sm flex items-center justify-center"
              style={{ background: previewCfg.bgColor, width: 216, height: 216 }}
            >
              <QrPreview domain={previewDomain || domain} config={previewCfg} />
            </div>

            <p className="text-[11px] text-gray-400 text-center">{previewDomain || domain}</p>
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
