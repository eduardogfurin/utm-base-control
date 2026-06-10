"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Globe, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CreatableSelect, type SelectOption } from "@/components/ui/creatable-select";
import { cn, slugify, buildUtmUrl } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Vehicle {
  id: string;
  name: string;
  slug: string;
  category: string;
}

export interface Campaign {
  id: string;
  name: string;
  slug: string;
}

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
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  slug: string;
  shortenWithRebrandly: boolean;
  rebrandlyDomain: string;
}

const emptyForm: LinkFormState = {
  baseUrl: "",
  vehicleId: "",
  campaignId: "",
  utmSource: "",
  utmMedium: "",
  utmCampaign: "",
  utmContent: "",
  utmTerm: "",
  slug: "",
  shortenWithRebrandly: false,
  rebrandlyDomain: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface InlineCreateCardProps {
  vehicles: Vehicle[];
  campaigns: Campaign[];
  settings: AppSettings | null;
  hasUserRebrandly: boolean;
  onSuccess: () => void;
  onVehicleCreated?: (v: Vehicle) => void;
  onCampaignCreated?: (c: Campaign) => void;
}

export function InlineCreateCard({
  vehicles: initialVehicles,
  campaigns: initialCampaigns,
  settings,
  hasUserRebrandly,
  onSuccess,
  onVehicleCreated,
  onCampaignCreated,
}: InlineCreateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rebrandlyDomains, setRebrandlyDomains] = useState<RebrandlyDomain[]>([]);
  const [form, setForm] = useState<LinkFormState>({ ...emptyForm });
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "taken" | "free">("idle");
  const urlInputRef = useRef<HTMLInputElement>(null);
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setVehicles(initialVehicles); }, [initialVehicles]);
  useEffect(() => { setCampaigns(initialCampaigns); }, [initialCampaigns]);

  // Check slug availability
  useEffect(() => {
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
    if (!form.slug) { setSlugStatus("idle"); return; }
    setSlugStatus("checking");
    slugTimerRef.current = setTimeout(() => {
      fetch(`/api/links/check-slug?slug=${encodeURIComponent(form.slug)}`)
        .then((r) => r.json())
        .then((d) => setSlugStatus(d.available ? "free" : "taken"))
        .catch(() => setSlugStatus("idle"));
    }, 500);
    return () => { if (slugTimerRef.current) clearTimeout(slugTimerRef.current); };
  }, [form.slug]);

  const hasRebrandly = hasUserRebrandly || !!(settings?.rebrandlyApiKey && settings?.rebrandlyStatus);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, baseUrl: val }));
    if (val && !expanded) setExpanded(true);
    if (!val && !form.vehicleId && !form.campaignId) setExpanded(false);
  };

  useEffect(() => {
    if (!expanded || !hasRebrandly) return;
    fetch("/api/integrations/rebrandly/domains")
      .then((r) => r.json())
      .then((res: { domains: RebrandlyDomain[]; defaultDomain: string | null }) => {
        const domains = res?.domains ?? [];
        setRebrandlyDomains(domains);
        setForm((prev) => {
          // Priority: user-selected domain from integration > first domain in list
          const defaultDomain = res?.defaultDomain || domains?.[0]?.fullName || "";
          return {
            ...prev,
            shortenWithRebrandly: true,
            rebrandlyDomain: prev.rebrandlyDomain || defaultDomain,
          };
        });
      })
      .catch(() => {});
  }, [expanded, hasRebrandly]);

  // Auto-generate slug from vehicle + campaign slugs
  useEffect(() => {
    if (!expanded) return;
    const veh = vehicles.find((v) => v.id === form.vehicleId);
    const cam = campaigns.find((c) => c.id === form.campaignId);
    if (veh && cam) {
      setForm((prev) => ({ ...prev, slug: slugify(`${veh.slug}-${cam.slug}`) }));
    }
  }, [form.vehicleId, form.campaignId, expanded, vehicles, campaigns]);

  // Load UTM template when vehicle changes
  useEffect(() => {
    if (!form.vehicleId || !expanded) return;
    fetch("/api/templates")
      .then((r) => r.json())
      .then((allTemplates: UtmTemplate[]) => {
        const tpl =
          allTemplates.find((t) => t.vehicleId === form.vehicleId) ??
          allTemplates.find((t) => !t.vehicleId);
        if (tpl) {
          setForm((prev) => ({
            ...prev,
            utmSource: tpl.source ?? prev.utmSource,
            utmMedium: tpl.medium ?? prev.utmMedium,
            utmCampaign: tpl.campaign ?? prev.utmCampaign,
            utmContent: tpl.content ?? prev.utmContent,
            utmTerm: tpl.term ?? prev.utmTerm,
          }));
        }
      })
      .catch(() => {});
  }, [form.vehicleId, expanded]);

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

  const handleCollapse = () => {
    setExpanded(false);
  };

  const handleCancel = () => {
    setExpanded(false);
    setForm({ ...emptyForm });
    setRebrandlyDomains([]);
    setSlugStatus("idle");
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
  };

  // ── Inline creation ───────────────────────────────────────────────────────

  const handleCreateVehicle = useCallback(async (name: string): Promise<SelectOption> => {
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slugify(name), category: "OTHER", status: "ACTIVE" }),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Erro ao criar veículo"); }
    const created: Vehicle = await res.json();
    setVehicles((prev) => [created, ...prev]);
    onVehicleCreated?.(created);
    toast.success(`Veículo "${name}" criado`);
    return { id: created.id, name: created.name };
  }, [onVehicleCreated]);

  const handleCreateCampaign = useCallback(async (name: string): Promise<SelectOption> => {
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slugify(name), status: "ACTIVE" }),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Erro ao criar campanha"); }
    const created: Campaign = await res.json();
    setCampaigns((prev) => [created, ...prev]);
    onCampaignCreated?.(created);
    toast.success(`Campanha "${name}" criada`);
    return { id: created.id, name: created.name };
  }, [onCampaignCreated]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.baseUrl || !form.vehicleId || !form.campaignId) {
      toast.error("URL Base, Veículo e Campanha são obrigatórios");
      return;
    }
    if (slugStatus === "taken") {
      toast.error("O slug escolhido já está em uso. Escolha outro.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
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
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Erro ao criar link"); }
      toast.success("Link criado com sucesso!");
      handleCancel();
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar link");
    } finally {
      setSaving(false);
    }
  };

  const vehicleOptions: SelectOption[] = vehicles.map((v) => ({
    id: v.id,
    name: v.name,
    meta: v.category === "OTHER" ? undefined : v.category.toLowerCase().replace("_", " "),
  }));

  const campaignOptions: SelectOption[] = campaigns.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div
      className={cn(
        "rounded-2xl bg-card border transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-visible shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
        expanded
          ? "border-blue-200 shadow-[0_4px_24px_rgba(59,130,246,0.10)]"
          : "border-gray-100 hover:border-gray-200"
      )}
    >
      <form onSubmit={handleSubmit}>
        {/* Always-visible row */}
        <div className="flex items-center gap-3 p-4">
          <button
            type="button"
            onClick={() => { if (!expanded) { setExpanded(true); setTimeout(() => urlInputRef.current?.focus(), 50); } }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shrink-0 transition-all duration-300",
              expanded
                ? "bg-blue-500 text-white shadow-[0_2px_8px_rgba(59,130,246,0.4)] scale-105"
                : "bg-blue-500 hover:bg-blue-400 text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)] hover:shadow-[0_2px_12px_rgba(59,130,246,0.45)]"
            )}
          >
            <Plus size={15} />
            Criar Link
          </button>

          <Input
            ref={urlInputRef}
            placeholder="Cole a URL base aqui..."
            value={form.baseUrl}
            onChange={handleUrlChange}
            onFocus={() => { if (!expanded) setExpanded(true); }}
            className={cn(
              "flex-1 border-0 bg-transparent text-sm placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto",
              expanded && "font-medium text-gray-800"
            )}
          />

          {expanded ? (
            <button
              type="button"
              onClick={handleCollapse}
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
            >
              <X size={14} />
            </button>
          ) : (
            <Globe size={14} className="text-gray-300 shrink-0" />
          )}
        </div>

        {/* Expandable section */}
        <div
          className={cn(
            "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
            expanded ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
          )}
        >
          <div className="border-t border-gray-100 px-4 pb-4 pt-4 space-y-3">

            {/* Vehicle */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Veículo *</Label>
              <CreatableSelect
                value={form.vehicleId}
                onChange={(id) => set("vehicleId", id)}
                options={vehicleOptions}
                placeholder="Selecionar veículo"
                createLabel="Criar veículo"
                onCreate={handleCreateVehicle}
              />
            </div>

            {/* Campaign */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Campanha *</Label>
              <CreatableSelect
                value={form.campaignId}
                onChange={(id) => set("campaignId", id)}
                options={campaignOptions}
                placeholder="Selecionar campanha"
                createLabel="Criar campanha"
                onCreate={handleCreateCampaign}
              />
            </div>

            <Separator className="bg-gray-100" />

            {/* UTM Fields — vertical */}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Parâmetros UTM</p>
              <div className="space-y-3">
                {(
                  [
                    { field: "utmSource", label: "Source", placeholder: "ex: google" },
                    { field: "utmMedium", label: "Medium", placeholder: "ex: cpc" },
                    { field: "utmCampaign", label: "Campaign", placeholder: "ex: lancamento-2026" },
                    { field: "utmContent", label: "Content", placeholder: "ex: banner-topo" },
                    { field: "utmTerm", label: "Term", placeholder: "ex: palavra-chave" },
                  ] as { field: keyof LinkFormState; label: string; placeholder: string }[]
                ).map(({ field, label, placeholder }) => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-xs text-gray-500">{label}</Label>
                    <Input
                      placeholder={placeholder}
                      value={form[field] as string}
                      onChange={(e) => set(field, e.target.value)}
                      className="bg-card border-gray-200 text-sm focus:border-blue-400 transition-colors duration-200"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Slug — last */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Slug</Label>
              <div className="relative">
                <Input
                  placeholder="gerado-automaticamente"
                  value={form.slug}
                  onChange={(e) => { set("slug", e.target.value); setSlugStatus("idle"); }}
                  className={cn(
                    "bg-card font-mono text-xs focus:border-blue-400 transition-colors duration-200 pr-8",
                    slugStatus === "taken" ? "border-red-400 text-red-700" :
                    slugStatus === "free" ? "border-emerald-400" : "border-gray-200 text-gray-500"
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {slugStatus === "checking" && <span className="w-3 h-3 rounded-full border-2 border-orange-400 border-t-transparent animate-spin block" />}
                  {slugStatus === "free" && <span className="text-emerald-500 text-xs font-bold">✓</span>}
                  {slugStatus === "taken" && <span className="text-red-500 text-xs font-bold">✕</span>}
                </div>
              </div>
              {slugStatus === "taken" && (
                <p className="text-xs text-red-600">Este slug já está em uso. Escolha outro.</p>
              )}
            </div>

            {/* Preview URL */}
            {form.baseUrl && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1.5">Preview da URL final</p>
                <p className="text-xs text-gray-600 break-all font-mono leading-relaxed">{previewUrl}</p>
              </div>
            )}

            {/* Rebrandly */}
            {hasRebrandly && (
              <div className="rounded-xl border border-gray-100 p-3 space-y-3 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Encurtar via Rebrandly</p>
                    <p className="text-xs text-gray-400">Gera um link curto com domínio personalizado</p>
                  </div>
                  <Switch
                    checked={form.shortenWithRebrandly}
                    onCheckedChange={(v) => set("shortenWithRebrandly", v)}
                  />
                </div>
                {form.shortenWithRebrandly && rebrandlyDomains.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-500">Domínio</Label>
                    <select
                      value={form.rebrandlyDomain}
                      onChange={(e) => set("rebrandlyDomain", e.target.value)}
                      className="mt-1.5 w-full h-9 rounded-xl border border-gray-200 bg-card px-3 text-sm text-gray-900 outline-none focus:border-blue-400 transition-colors duration-200"
                    >
                      {rebrandlyDomains.map((d) => (
                        <option key={d.id} value={d.fullName}>{d.fullName}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <Button type="button" variant="ghost" onClick={handleCancel} className="text-gray-500 hover:text-gray-800">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-500 hover:bg-blue-400 text-white transition-colors duration-300 px-6 shadow-[0_2px_8px_rgba(59,130,246,0.3)]"
              >
                {saving ? "Criando..." : "Criar Link"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
