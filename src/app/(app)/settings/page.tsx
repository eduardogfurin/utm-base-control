"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import {
  Settings,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Link2,
  CheckCircle2,
  XCircle,
  Zap,
} from "lucide-react";

interface AppSettings {
  id: string;
  rebrandlyApiKey: string | null;
  rebrandlyDomain: string | null;
  rebrandlyStatus: boolean;
  rebrandlyLastSync: string | null;
  updatedAt: string;
}

function SettingsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-32 bg-zinc-800" />
      <Skeleton className="h-10 w-full bg-zinc-800" />
      <Skeleton className="h-5 w-28 bg-zinc-800" />
      <Skeleton className="h-10 w-full bg-zinc-800" />
      <Skeleton className="h-9 w-24 bg-zinc-800 mt-2" />
    </div>
  );
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Form state — separate from saved state so user can edit freely
  const [apiKey, setApiKey] = useState("");
  const [domain, setDomain] = useState("");
  const [showKey, setShowKey] = useState(false);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || session.user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role !== "ADMIN") return;

    setLoadingSettings(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: AppSettings | null) => {
        if (data) {
          setSettings(data);
          setApiKey(data.rebrandlyApiKey ?? "");
          setDomain(data.rebrandlyDomain ?? "");
        }
      })
      .catch(() => toast.error("Erro ao carregar configurações"))
      .finally(() => setLoadingSettings(false));
  }, [session]);

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      // Only send apiKey if user typed something new (not the masked value)
      if (apiKey && !apiKey.startsWith("*")) body.rebrandlyApiKey = apiKey;
      if (domain) body.rebrandlyDomain = domain;

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar");
      setSettings(data);
      toast.success("Configurações salvas com sucesso");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    try {
      const res = await fetch("/api/settings/test-rebrandly", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao testar conexão");

      if (data.ok) {
        toast.success("Conexão com Rebrandly bem-sucedida!");
        // Refresh settings to update status badge
        const settingsRes = await fetch("/api/settings");
        const settingsData = await settingsRes.json();
        if (settingsData) setSettings(settingsData);
      } else {
        toast.error("Falha na conexão com Rebrandly. Verifique a API Key e o domínio.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao testar conexão");
    } finally {
      setTesting(false);
    }
  }

  async function handleSyncMetrics() {
    setSyncing(true);
    try {
      // Fetch all links with Rebrandly integration
      const linksRes = await fetch("/api/links?limit=500");
      if (!linksRes.ok) throw new Error("Erro ao carregar links");
      const linksData = await linksRes.json();
      const links = linksData.data ?? linksData ?? [];

      const rebrandlyLinks = links.filter(
        (l: { rebrandly?: unknown }) => l.rebrandly
      );

      if (rebrandlyLinks.length === 0) {
        toast.info("Nenhum link com integração Rebrandly encontrado");
        setSyncing(false);
        return;
      }

      let synced = 0;
      let failed = 0;

      for (const link of rebrandlyLinks) {
        try {
          const r = await fetch(`/api/links/${link.id}/sync`, { method: "POST" });
          if (r.ok) synced++;
          else failed++;
        } catch {
          failed++;
        }
      }

      if (failed === 0) {
        toast.success(`${synced} link${synced !== 1 ? "s" : ""} sincronizado${synced !== 1 ? "s" : ""} com sucesso`);
      } else {
        toast.warning(
          `${synced} sincronizado${synced !== 1 ? "s" : ""}, ${failed} falha${failed !== 1 ? "s" : ""}`
        );
      }

      // Refresh settings to update lastSync
      const settingsRes = await fetch("/api/settings");
      const settingsData = await settingsRes.json();
      if (settingsData) setSettings(settingsData);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao sincronizar métricas");
    } finally {
      setSyncing(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={20} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
          <Settings size={16} className="text-zinc-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Configurações</h1>
          <p className="text-sm text-zinc-500">
            Integrações e preferências da plataforma
          </p>
        </div>
      </div>

      <Tabs defaultValue="integrations">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger
            value="integrations"
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-400"
          >
            Integrações
          </TabsTrigger>
          <TabsTrigger
            value="general"
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-400"
          >
            Geral
          </TabsTrigger>
        </TabsList>

        {/* ── INTEGRAÇÕES ─────────────────────────────────────────────── */}
        <TabsContent value="integrations" className="mt-6 space-y-4">
          {/* Rebrandly Card */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-zinc-800 rounded-lg flex items-center justify-center">
                    <Link2 size={16} className="text-violet-400" />
                  </div>
                  <div>
                    <CardTitle className="text-zinc-100 text-base">Rebrandly</CardTitle>
                    <CardDescription className="text-zinc-500 text-sm">
                      Encurtamento e rastreamento de links
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {loadingSettings ? (
                    <Skeleton className="h-5 w-24 bg-zinc-800" />
                  ) : settings?.rebrandlyStatus ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[11px]"
                    >
                      <CheckCircle2 size={11} className="mr-1" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-red-500/10 text-red-400 border-red-500/30 text-[11px]"
                    >
                      <XCircle size={11} className="mr-1" />
                      Desconectado
                    </Badge>
                  )}
                  {!loadingSettings && settings?.rebrandlyLastSync && (
                    <p className="text-[11px] text-zinc-600">
                      Última sync: {formatDateTime(settings.rebrandlyLastSync)}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>

            <Separator className="bg-zinc-800 mb-4" />

            <CardContent className="space-y-4">
              {loadingSettings ? (
                <SettingsSkeleton />
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300">API Key</Label>
                    <div className="relative">
                      <Input
                        type={showKey ? "text" : "password"}
                        placeholder="Sua API Key do Rebrandly"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-600">
                      Obtenha sua API Key em{" "}
                      <a
                        href="https://app.rebrandly.com/account/api"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:underline"
                      >
                        app.rebrandly.com
                      </a>
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-zinc-300">Domínio Curto</Label>
                    <Input
                      type="text"
                      placeholder="Ex: on.g40.co"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                    />
                    <p className="text-[11px] text-zinc-600">
                      Domínio customizado configurado no Rebrandly
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-500 text-white"
                    >
                      {saving && <Loader2 size={13} className="animate-spin mr-1.5" />}
                      Salvar
                    </Button>
                    <Button
                      onClick={handleTestConnection}
                      disabled={testing || !settings}
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                    >
                      {testing ? (
                        <Loader2 size={13} className="animate-spin mr-1.5" />
                      ) : (
                        <Zap size={13} className="mr-1.5" />
                      )}
                      Testar Conexão
                    </Button>
                    <Button
                      onClick={handleSyncMetrics}
                      disabled={syncing || !settings?.rebrandlyStatus}
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40"
                    >
                      {syncing ? (
                        <Loader2 size={13} className="animate-spin mr-1.5" />
                      ) : (
                        <RefreshCw size={13} className="mr-1.5" />
                      )}
                      Sincronizar Métricas
                    </Button>
                  </div>

                  {!settings?.rebrandlyStatus && settings && (
                    <p className="text-[11px] text-zinc-600">
                      Salve e teste a conexão antes de sincronizar métricas.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Coming soon cards */}
          {[
            { name: "HubSpot", description: "CRM e automação de marketing" },
            { name: "Meta Ads", description: "Campanhas e audiências do Meta" },
            { name: "GA4", description: "Google Analytics 4" },
          ].map((integration) => (
            <Card key={integration.name} className="bg-zinc-900/50 border-zinc-800/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-zinc-400 text-base">
                      {integration.name}
                    </CardTitle>
                    <CardDescription className="text-zinc-600 text-sm">
                      {integration.description}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-zinc-800/60 text-zinc-500 border-zinc-700 text-[11px]"
                  >
                    Em breve
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>

        {/* ── GERAL ────────────────────────────────────────────────────── */}
        <TabsContent value="general" className="mt-6 space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100 text-base">
                Informações da Plataforma
              </CardTitle>
              <CardDescription className="text-zinc-500">
                Dados gerais do sistema UTM Base Control
              </CardDescription>
            </CardHeader>
            <Separator className="bg-zinc-800 mb-4" />
            <CardContent>
              <dl className="space-y-3">
                {[
                  { label: "Plataforma", value: "UTM Base Control" },
                  { label: "Versão", value: "1.0.0" },
                  { label: "Ambiente", value: process.env.NODE_ENV ?? "production" },
                  { label: "Stack", value: "Next.js 15 · TypeScript · Prisma · PostgreSQL" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <dt className="text-sm text-zinc-500">{item.label}</dt>
                    <dd className="text-sm text-zinc-300 font-mono">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-zinc-400 text-base">
                    Configurações Gerais
                  </CardTitle>
                  <CardDescription className="text-zinc-600 text-sm">
                    Preferências globais da plataforma
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="bg-zinc-800/60 text-zinc-500 border-zinc-700 text-[11px]"
                >
                  Em breve
                </Badge>
              </div>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
