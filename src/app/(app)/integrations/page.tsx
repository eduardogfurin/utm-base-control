"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plug, RefreshCw, CheckCircle2, XCircle, Globe, Key } from "lucide-react";
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

  const rebrandly = integrations.find((i) => i.provider === "REBRANDLY");

  useEffect(() => {
    fetch("/api/integrations")
      .then((r) => r.json())
      .then((data) => {
        setIntegrations(data ?? []);
        const rb = (data ?? []).find((i: Integration) => i.provider === "REBRANDLY");
        if (rb?.domain) setSelectedDomain(rb.domain);
      })
      .catch(() => toast.error("Erro ao carregar integrações"))
      .finally(() => setLoading(false));
  }, []);

  // Load domains if already connected
  useEffect(() => {
    if (!rebrandly?.isActive) return;
    setLoadingDomains(true);
    fetch("/api/integrations/rebrandly/domains")
      .then((r) => r.json())
      .then((data: RebrandlyDomain[]) => {
        setDomains(data ?? []);
        if (!selectedDomain && data?.[0]?.fullName) setSelectedDomain(data[0].fullName);
      })
      .catch(() => {})
      .finally(() => setLoadingDomains(false));
  }, [rebrandly?.isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTestAndSave = async () => {
    if (!apiKey.trim()) {
      toast.error("Insira a API Key");
      return;
    }
    setTesting(true);
    try {
      // Save integration first
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "REBRANDLY", apiKey: apiKey.trim(), domain: selectedDomain || null }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");

      // Load domains after saving
      setLoadingDomains(true);
      const domainsRes = await fetch("/api/integrations/rebrandly/domains");
      if (domainsRes.ok) {
        const data: RebrandlyDomain[] = await domainsRes.json();
        setDomains(data ?? []);
        if (!selectedDomain && data?.[0]?.fullName) setSelectedDomain(data[0].fullName);
      }

      // Reload integrations
      const intRes = await fetch("/api/integrations");
      if (intRes.ok) setIntegrations(await intRes.json());

      toast.success("Integração conectada com sucesso!");
      setApiKey("");
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
      toast.success("Integração desconectada");
    } catch {
      toast.error("Erro ao desconectar");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meu Perfil / Integrações</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gerencie suas integrações pessoais de encurtamento</p>
      </div>

      {/* Rebrandly card */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <Plug size={18} className="text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Rebrandly</p>
              <p className="text-xs text-gray-400">Encurtamento de links com domínio personalizado</p>
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-6 w-20" />
          ) : rebrandly?.isActive ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
              <CheckCircle2 size={12} />
              Conectado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
              <XCircle size={12} />
              Desconectado
            </span>
          )}
        </div>

        <div className="px-6 py-5 space-y-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : rebrandly?.isActive ? (
            <>
              {/* Domain selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Globe size={14} className="text-gray-400" />
                  Domínio padrão
                </Label>
                {loadingDomains ? (
                  <Skeleton className="h-9 w-full" />
                ) : domains.length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      value={selectedDomain}
                      onChange={(e) => setSelectedDomain(e.target.value)}
                      className="flex-1 h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-400 transition-colors duration-200"
                    >
                      {domains.map((d) => (
                        <option key={d.id} value={d.fullName}>{d.fullName}</option>
                      ))}
                    </select>
                    <Button
                      onClick={handleSaveDomain}
                      disabled={saving}
                      className="bg-[#1C1B21] hover:bg-orange-500 text-white transition-colors duration-300"
                    >
                      {saving ? <RefreshCw size={14} className="animate-spin" /> : "Salvar"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Nenhum domínio encontrado</p>
                )}
              </div>

              <div className="pt-1">
                <Button
                  variant="ghost"
                  onClick={handleDisconnect}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 text-sm"
                >
                  <XCircle size={14} className="mr-1.5" />
                  Desconectar integração
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Key size={14} className="text-gray-400" />
                  API Key do Rebrandly
                </Label>
                <Input
                  type="password"
                  placeholder="Cole sua API Key aqui"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-white border-gray-200 focus:border-orange-400 transition-colors duration-200"
                />
                <p className="text-xs text-gray-400">
                  Encontre sua API Key em{" "}
                  <span className="font-mono text-gray-500">rebrandly.com → Account → API Keys</span>
                </p>
              </div>
              <Button
                onClick={handleTestAndSave}
                disabled={testing}
                className="bg-[#1C1B21] hover:bg-orange-500 text-white transition-colors duration-300"
              >
                {testing ? (
                  <><RefreshCw size={14} className="animate-spin mr-2" /> Conectando...</>
                ) : (
                  <><Plug size={14} className="mr-2" /> Conectar Rebrandly</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* More providers coming soon */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] px-6 py-5">
        <p className="text-sm font-semibold text-gray-700 mb-1">Mais integrações em breve</p>
        <p className="text-xs text-gray-400">Bitly, TinyURL, e outros encurtadores serão adicionados em versões futuras.</p>
      </div>
    </div>
  );
}
