"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plug, RefreshCw, CheckCircle2, XCircle, Globe, Key, AlertTriangle, Plus } from "lucide-react";
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

  const rebrandly = integrations.find((i) => i.provider === "REBRANDLY");

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
        if (defaultDomain) { setSelectedDomain(defaultDomain); setSavedDomain(defaultDomain); }
        else if (!selectedDomain && data?.[0]?.fullName) { setSelectedDomain(data[0].fullName); setSavedDomain(data[0].fullName); }
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
      if (!res.ok) throw new Error("Erro ao salvar");

      setLoadingDomains(true);
      const domainsRes = await fetch("/api/integrations/rebrandly/domains");
      if (domainsRes.ok) {
        const res = await domainsRes.json();
        const data: RebrandlyDomain[] = Array.isArray(res) ? res : (res?.domains ?? []);
        const defaultDomain = Array.isArray(res) ? null : res?.defaultDomain;
        setDomains(data);
        if (defaultDomain) { setSelectedDomain(defaultDomain); setSavedDomain(defaultDomain); }
        else if (data?.[0]?.fullName) { setSelectedDomain(data[0].fullName); setSavedDomain(data[0].fullName); }
      }

      const intRes = await fetch("/api/integrations");
      if (intRes.ok) setIntegrations(await intRes.json());

      toast.success("Integração conectada com sucesso!");
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
    if (!selectedDomain) return;
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

  const domainHasChanges = selectedDomain !== savedDomain;

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrações</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gerencie suas integrações de encurtamento de links</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : rebrandly?.isActive ? (
        <>
          {/* ── Connected box ── */}
          <div className="rounded-2xl bg-card border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            {/* Header */}
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
              {/* Domain selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                  <Globe size={13} className="text-gray-400" />
                  Domínio padrão
                </Label>
                {loadingDomains ? (
                  <Skeleton className="h-9 w-full" />
                ) : domains.length > 0 ? (
                  <>
                    <div className="flex gap-2">
                      <select
                        value={selectedDomain}
                        onChange={(e) => setSelectedDomain(e.target.value)}
                        className="flex-1 h-9 rounded-xl border border-gray-200 bg-card px-3 text-sm text-gray-900 outline-none focus:border-blue-400 transition-colors"
                      >
                        {domains.map((d) => (
                          <option key={d.id} value={d.fullName}>{d.fullName}</option>
                        ))}
                      </select>
                      <Button
                        onClick={handleSaveDomain}
                        disabled={saving || !domainHasChanges}
                        className={
                          domainHasChanges
                            ? "bg-red-500 hover:bg-red-600 text-white shadow-[0_2px_8px_rgba(239,68,68,0.3)]"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }
                      >
                        {saving ? <RefreshCw size={14} className="animate-spin" /> : "Salvar"}
                      </Button>
                    </div>
                    {domainHasChanges && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertTriangle size={11} />
                        Alteração pendente — clique em Salvar para aplicar
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-400">Nenhum domínio encontrado</p>
                )}
              </div>

              {/* Danger zone */}
              <div className="rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-red-700">Zona perigosa</p>
                    <p className="text-[11px] text-red-500 mt-0.5 leading-snug">Desconectar remove a integração permanentemente.</p>
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

          {/* ── Connect new integration box ── */}
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
                <button onClick={() => setShowConnectNew(false)} className="text-gray-400 hover:text-gray-600 text-xs">
                  <XCircle size={16} />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
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
                <Button
                  onClick={handleTestAndSave}
                  disabled={testing}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {testing ? (
                    <><RefreshCw size={14} className="animate-spin mr-2" /> Conectando...</>
                  ) : (
                    <><Plug size={14} className="mr-2" /> Conectar</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ── Disconnected — single connect box ── */
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
          <div className="px-5 py-4 space-y-3">
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
            <Button
              onClick={handleTestAndSave}
              disabled={testing}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {testing ? (
                <><RefreshCw size={14} className="animate-spin mr-2" /> Conectando...</>
              ) : (
                <><Plug size={14} className="mr-2" /> Conectar Rebrandly</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* More providers coming soon */}
      <div className="rounded-2xl bg-card border border-dashed border-gray-200 px-5 py-4">
        <p className="text-xs font-semibold text-gray-500 mb-0.5">Mais integrações em breve</p>
        <p className="text-xs text-gray-400">Bitly, TinyURL e outros encurtadores serão adicionados em versões futuras.</p>
      </div>
    </div>
  );
}
