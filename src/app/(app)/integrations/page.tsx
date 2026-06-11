"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plug, RefreshCw, CheckCircle2, XCircle, Globe, Key,
  AlertTriangle, Plus, QrCode, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

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

interface QrStyle {
  fgColor: string;
  bgColor: string;
  logo: string;
  margin: number;
}

const DEFAULT_QR: QrStyle = { fgColor: "#000000", bgColor: "#ffffff", logo: "", margin: 4 };

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
  const [qrStyles, setQrStyles] = useState<Record<string, QrStyle>>({});

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
        if (def) { setSelectedDomain(def); setSavedDomain(def); }
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
        if (def) { setSelectedDomain(def); setSavedDomain(def); }
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
      setShowConnectNew(false);
      toast.success("Integração desconectada");
    } catch {
      toast.error("Erro ao desconectar");
    }
  };

  const getQrStyle = (domain: string) => qrStyles[domain] ?? DEFAULT_QR;
  const setQrStyle = (domain: string, patch: Partial<QrStyle>) =>
    setQrStyles((prev) => ({ ...prev, [domain]: { ...getQrStyle(domain), ...patch } }));

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

  return (
    <div className="space-y-4 max-w-2xl">
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
                      const qr = getQrStyle(d.fullName);
                      const panelOpen = qrPanelOpen === d.fullName;
                      return (
                        <div key={d.id}>
                          <div
                            className={`flex items-center gap-3 px-3.5 py-2.5 transition-colors ${isDefault ? "bg-blue-50/60" : "hover:bg-gray-50/60"}`}
                          >
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

                            {/* Domain name */}
                            <span className={`flex-1 text-sm font-medium ${isDefault ? "text-blue-700" : "text-gray-700"}`}>
                              {d.fullName}
                            </span>

                            {isDefault && (
                              <span className="text-[10px] font-semibold text-blue-500 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                                padrão
                              </span>
                            )}

                            {/* QR Code customization button */}
                            <button
                              type="button"
                              onClick={() => setQrPanelOpen(panelOpen ? null : d.fullName)}
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

                          {/* QR customization panel */}
                          {panelOpen && (
                            <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3 space-y-3">
                              <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                                <QrCode size={12} className="text-violet-500" />
                                Personalizar QR Code — {d.fullName}
                              </p>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[11px] text-gray-500 font-medium">Cor do código</label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={qr.fgColor}
                                      onChange={(e) => setQrStyle(d.fullName, { fgColor: e.target.value })}
                                      className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-card"
                                    />
                                    <span className="text-xs font-mono text-gray-500">{qr.fgColor}</span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] text-gray-500 font-medium">Cor de fundo</label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={qr.bgColor}
                                      onChange={(e) => setQrStyle(d.fullName, { bgColor: e.target.value })}
                                      className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-card"
                                    />
                                    <span className="text-xs font-mono text-gray-500">{qr.bgColor}</span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] text-gray-500 font-medium">Logo (URL)</label>
                                  <input
                                    type="text"
                                    value={qr.logo}
                                    onChange={(e) => setQrStyle(d.fullName, { logo: e.target.value })}
                                    placeholder="https://..."
                                    className="w-full h-8 rounded-lg border border-gray-200 bg-card px-2.5 text-xs text-gray-800 placeholder:text-gray-300 outline-none focus:border-blue-400"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] text-gray-500 font-medium">Margem ({qr.margin}px)</label>
                                  <input
                                    type="range"
                                    min={0}
                                    max={20}
                                    value={qr.margin}
                                    onChange={(e) => setQrStyle(d.fullName, { margin: Number(e.target.value) })}
                                    className="w-full accent-violet-500"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-1">
                                <button
                                  type="button"
                                  onClick={() => setQrStyles((prev) => { const n = { ...prev }; delete n[d.fullName]; return n; })}
                                  className="text-[11px] text-gray-400 hover:text-gray-600"
                                >
                                  Restaurar padrão
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { toast.success("Estilo salvo"); setQrPanelOpen(null); }}
                                  className="text-xs font-medium text-white bg-violet-500 hover:bg-violet-600 rounded-lg px-3 py-1.5 transition-colors"
                                >
                                  Salvar estilo
                                </button>
                              </div>
                            </div>
                          )}
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
