"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Link2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  KeyRound,
  Zap,
  ExternalLink,
  DownloadCloud,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Provider config ──────────────────────────────────────────────────────────

const providers = [
  {
    id: "REBRANDLY",
    name: "Rebrandly",
    description: "Encurtador profissional com analytics avançados",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
    apiKeyGuide: {
      title: "Como encontrar sua API Key no Rebrandly",
      steps: [
        "Acesse app.rebrandly.com e faça login na sua conta",
        "Clique no seu avatar no canto superior direito",
        "Selecione \"Account Settings\" no menu",
        "Vá para a aba \"API Keys\"",
        "Clique em \"Create new API key\" ou copie uma existente",
      ],
      docsUrl: "https://app.rebrandly.com/account/api-keys",
      note: "A API key começa com uma sequência alfanumérica longa.",
    },
  },
  {
    id: "BITLY",
    name: "Bitly",
    description: "Um dos encurtadores mais populares do mundo",
    iconBg: "bg-sky-50",
    iconColor: "text-sky-500",
    apiKeyGuide: {
      title: "Como encontrar sua API Key no Bitly",
      steps: [
        "Acesse bitly.com e faça login",
        "Clique no seu avatar no canto superior direito",
        "Selecione \"Settings\"",
        "No menu lateral, clique em \"API\"",
        "Gere ou copie seu access token",
      ],
      docsUrl: "https://bitly.com/a/oauth_apps",
      note: "O token do Bitly tem 40 caracteres hexadecimais.",
    },
  },
  {
    id: "CUSTOM",
    name: "Outro / Customizado",
    description: "Conecte qualquer provedor via API key",
    iconBg: "bg-slate-50",
    iconColor: "text-slate-500",
    apiKeyGuide: {
      title: "Configuração customizada",
      steps: [
        "Acesse o painel do seu provedor de encurtamento de links",
        "Encontre a seção de API ou integrações",
        "Gere ou copie sua chave de API",
        "Cole no campo abaixo",
      ],
      docsUrl: null,
      note: "Consulte a documentação do seu provedor para detalhes.",
    },
  },
];

interface RebrandlyDomain {
  id: string;
  fullName: string;
  active: boolean;
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepWelcome({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto shadow-lg">
        <Link2 size={28} className="text-white" />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Bem-vindo ao UTM Base Control!</h2>
        <p className="text-gray-500 mt-2 max-w-sm mx-auto">
          Vamos configurar sua conta em poucos passos para que você possa começar a rastrear seus links.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
        {[
          { icon: <Zap size={16} />, label: "Conecte encurtadores" },
          { icon: <Link2 size={16} />, label: "Crie links UTM" },
          { icon: <CheckCircle2 size={16} />, label: "Monitore cliques" },
        ].map((item, i) => (
          <div key={i} className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="text-blue-500 flex justify-center mb-1">{item.icon}</div>
            <p className="text-xs text-gray-600 font-medium leading-tight">{item.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Button
          onClick={onNext}
          className="bg-blue-500 hover:bg-blue-400 text-white px-8 transition-colors duration-300 shadow-[0_4px_14px_rgba(59,130,246,0.4)]"
        >
          Começar configuração
          <ArrowRight size={16} className="ml-2" />
        </Button>
        <Button variant="ghost" onClick={onSkip} className="text-gray-400 hover:text-gray-600 text-sm">
          Pular por agora
        </Button>
      </div>
    </div>
  );
}

function StepSelectProvider({
  selected,
  onSelect,
  onNext,
  onBack,
  onSkip,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Qual encurtador você usa?</h2>
        <p className="text-sm text-gray-400 mt-1">
          Selecione o serviço que você utiliza para encurtar links.
        </p>
      </div>

      <div className="space-y-3">
        {providers.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={cn(
              "w-full text-left rounded-xl border-2 p-4 flex items-center gap-4 transition-all duration-150",
              selected === p.id
                ? "border-orange-400 bg-orange-50/50"
                : "border-gray-100 bg-card hover:border-gray-200 hover:bg-gray-50/50"
            )}
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", p.iconBg)}>
              <Link2 size={18} className={p.iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{p.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
            </div>
            {selected === p.id && (
              <CheckCircle2 size={18} className="text-orange-500 flex-shrink-0" />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-2 pt-2">
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1 border-gray-200 text-gray-700">
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </Button>
          <Button
            onClick={onNext}
            disabled={!selected}
            className="flex-1 bg-blue-500 hover:bg-blue-400 text-white transition-colors duration-300"
          >
            Continuar
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
        <Button variant="ghost" onClick={onSkip} className="w-full text-gray-400 hover:text-gray-600 text-sm">
          Pular configuração
        </Button>
      </div>
    </div>
  );
}

function StepApiKey({
  provider,
  apiKey,
  onApiKeyChange,
  onNext,
  onBack,
  onSkip,
  loading,
}: {
  provider: (typeof providers)[0];
  apiKey: string;
  onApiKeyChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Conecte o {provider.name}</h2>
        <p className="text-sm text-gray-400 mt-1">
          Insira sua API key para conectar sua conta.
        </p>
      </div>

      {/* Guide */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          {provider.apiKeyGuide.title}
        </p>
        <ol className="space-y-2">
          {provider.apiKeyGuide.steps.map((step, i) => (
            <li key={i} className="flex gap-2.5 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-semibold flex items-center justify-center flex-shrink-0 text-[10px]">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        {provider.apiKeyGuide.note && (
          <p className="text-xs text-gray-400 italic">{provider.apiKeyGuide.note}</p>
        )}
        {provider.apiKeyGuide.docsUrl && (
          <a
            href={provider.apiKeyGuide.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-medium"
          >
            Abrir painel do {provider.name}
            <ExternalLink size={11} />
          </a>
        )}
      </div>

      {/* Input */}
      <div className="space-y-1.5">
        <Label htmlFor="apiKey" className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
          <KeyRound size={13} className="text-gray-400" />
          API Key do {provider.name}
        </Label>
        <Input
          id="apiKey"
          type="password"
          placeholder="Cole sua API key aqui"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-card font-mono text-sm"
        />
      </div>

      <div className="space-y-2 pt-2">
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1 border-gray-200 text-gray-700" disabled={loading}>
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </Button>
          <Button
            onClick={onNext}
            disabled={!apiKey.trim() || loading}
            className="flex-1 bg-blue-500 hover:bg-blue-400 text-white transition-colors duration-300"
          >
            {loading && <Loader2 size={16} className="animate-spin mr-2" />}
            Conectar conta
            {!loading && <ArrowRight size={16} className="ml-2" />}
          </Button>
        </div>
        <Button variant="ghost" onClick={onSkip} disabled={loading} className="w-full text-gray-400 hover:text-gray-600 text-sm">
          Pular configuração
        </Button>
      </div>
    </div>
  );
}

function StepSelectDomain({
  providerName,
  domains,
  selectedDomain,
  onSelect,
  onNext,
  onBack,
  onSkip,
  loading,
}: {
  providerName: string;
  domains: RebrandlyDomain[];
  selectedDomain: string;
  onSelect: (d: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Escolha seu domínio padrão</h2>
        <p className="text-sm text-gray-400 mt-1">
          Selecione qual domínio do {providerName} será usado ao encurtar links. Você pode mudar isso por link depois.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : domains.length === 0 ? (
        <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-700">
          Nenhum domínio encontrado na sua conta. Você pode continuar e configurar depois em Configurações.
        </div>
      ) : (
        <div className="space-y-2">
          {domains.map((d) => (
            <button
              key={d.id}
              onClick={() => onSelect(d.fullName)}
              className={cn(
                "w-full text-left rounded-xl border-2 p-3.5 flex items-center gap-3 transition-all duration-150",
                selectedDomain === d.fullName
                  ? "border-orange-400 bg-orange-50/50"
                  : "border-gray-100 bg-card hover:border-gray-200 hover:bg-gray-50/50"
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Globe size={14} className="text-gray-500" />
              </div>
              <span className="text-sm font-medium text-gray-800 flex-1">{d.fullName}</span>
              {selectedDomain === d.fullName && (
                <CheckCircle2 size={16} className="text-orange-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2 pt-2">
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1 border-gray-200 text-gray-700">
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </Button>
          <Button
            onClick={onNext}
            className="flex-1 bg-blue-500 hover:bg-blue-400 text-white transition-colors duration-300"
          >
            Continuar
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
        <Button variant="ghost" onClick={onSkip} className="w-full text-gray-400 hover:text-gray-600 text-sm">
          Pular configuração
        </Button>
      </div>
    </div>
  );
}

function StepImport({
  provider,
  onImport,
  onSkip,
  importing,
  imported,
}: {
  provider: (typeof providers)[0];
  onImport: () => void;
  onSkip: () => void;
  importing: boolean;
  imported: number | null;
}) {
  return (
    <div className="space-y-5 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mx-auto shadow-lg">
        {imported !== null ? (
          <CheckCircle2 size={28} className="text-white" />
        ) : (
          <DownloadCloud size={28} className="text-white" />
        )}
      </div>

      {imported !== null ? (
        <>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Tudo pronto!</h2>
            <p className="text-gray-500 mt-2">
              <span className="font-semibold text-orange-500">{imported} links</span> importados com sucesso do {provider.name}.
            </p>
          </div>
          <Button
            onClick={onSkip}
            className="bg-[#1C1B21] hover:bg-orange-500 text-white px-8 transition-colors duration-300"
          >
            Ir para o dashboard
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </>
      ) : (
        <>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Importar links existentes?</h2>
            <p className="text-gray-500 mt-2 max-w-sm mx-auto text-sm">
              Posso importar automaticamente os links que você já criou no {provider.name}. Isso é opcional e pode ser feito depois.
            </p>
          </div>

          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <Button
              onClick={onImport}
              disabled={importing}
              className="bg-[#1C1B21] hover:bg-orange-500 text-white transition-colors duration-300"
            >
              {importing ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <DownloadCloud size={16} className="mr-2" />
              )}
              {importing ? "Importando..." : "Importar links agora"}
            </Button>
            <Button
              variant="ghost"
              onClick={onSkip}
              disabled={importing}
              className="text-gray-400 hover:text-gray-600"
            >
              Pular por agora
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

// Steps: 0=Welcome, 1=Provider, 2=ApiKey, 3=Domain, 4=Import
const STEPS = ["Boas-vindas", "Encurtador", "API Key", "Domínio", "Importar"];

export function OnboardingWizard({ onComplete }: { onComplete?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  // Domain step state
  const [domains, setDomains] = useState<RebrandlyDomain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [loadingDomains, setLoadingDomains] = useState(false);

  const provider = providers.find((p) => p.id === selectedProvider) ?? providers[0];

  // Load domains when entering domain step (step 3), only for Rebrandly
  useEffect(() => {
    if (step !== 3 || selectedProvider !== "REBRANDLY") return;
    setLoadingDomains(true);
    fetch("/api/integrations/rebrandly/domains")
      .then((r) => r.json())
      .then((res: { domains: RebrandlyDomain[]; defaultDomain: string | null } | RebrandlyDomain[]) => {
        const data = Array.isArray(res) ? res : (res?.domains ?? []);
        setDomains(data);
        if (data?.length && !selectedDomain) {
          setSelectedDomain(data[0].fullName);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDomains(false));
  }, [step, selectedProvider]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConnect() {
    if (!selectedProvider || !apiKey.trim()) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, apiKey: apiKey.trim() }),
      });
      if (!res.ok) {
        const body = await res.json();
        toast.error(body.error ?? "Erro ao conectar conta");
        return;
      }
      toast.success(`${provider.name} conectado com sucesso!`);
      // For Rebrandly, go to domain step; otherwise skip to import
      setStep(selectedProvider === "REBRANDLY" ? 3 : 4);
    } catch {
      toast.error("Erro de conexão. Verifique sua API key.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleSaveDomain() {
    if (selectedDomain) {
      await fetch("/api/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "REBRANDLY", domain: selectedDomain }),
      }).catch(() => {});
    }
    setStep(4);
  }

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/integrations/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Erro ao importar links");
        return;
      }
      setImportedCount(body.imported ?? 0);
    } catch {
      toast.error("Erro ao importar links.");
    } finally {
      setImporting(false);
    }
  }

  async function handleFinish() {
    await fetch("/api/onboarding/complete", { method: "POST" });
    onComplete?.();
    router.push("/dashboard");
    router.refresh();
  }

  async function handleSkipAll() {
    await fetch("/api/onboarding/complete", { method: "POST" }).catch(() => {});
    onComplete?.();
  }

  return (
    <div className="fixed inset-0 bg-[#f5f5f7] flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="px-6 pt-5 pb-2 flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                  i < step
                    ? "bg-orange-500 text-white"
                    : i === step
                    ? "bg-orange-100 text-orange-700 ring-2 ring-orange-300"
                    : "bg-gray-100 text-gray-400"
                )}
              >
                {i < step ? <CheckCircle2 size={12} /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] hidden sm:block",
                  i === step ? "text-gray-700 font-medium" : "text-gray-400"
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 pt-4">
          {step === 0 && <StepWelcome onNext={() => setStep(1)} onSkip={handleSkipAll} />}
          {step === 1 && (
            <StepSelectProvider
              selected={selectedProvider}
              onSelect={setSelectedProvider}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
              onSkip={handleSkipAll}
            />
          )}
          {step === 2 && (
            <StepApiKey
              provider={provider}
              apiKey={apiKey}
              onApiKeyChange={setApiKey}
              onNext={handleConnect}
              onBack={() => setStep(1)}
              onSkip={handleSkipAll}
              loading={connecting}
            />
          )}
          {step === 3 && (
            <StepSelectDomain
              providerName={provider.name}
              domains={domains}
              selectedDomain={selectedDomain}
              onSelect={setSelectedDomain}
              onNext={handleSaveDomain}
              onBack={() => setStep(2)}
              onSkip={handleSkipAll}
              loading={loadingDomains}
            />
          )}
          {step === 4 && (
            <StepImport
              provider={provider}
              onImport={handleImport}
              onSkip={handleFinish}
              importing={importing}
              imported={importedCount}
            />
          )}
        </div>
      </div>
    </div>
  );
}
