"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Globe, X, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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

// ─── Component ────────────────────────────────────────────────────────────────

interface InlineCreateCardProps {
  vehicles: Vehicle[];
  campaigns: Campaign[];
  settings: AppSettings | null;
  hasUserRebrandly: boolean;
  onSuccess: () => void;
}

export function InlineCreateCard({
  vehicles,
  campaigns,
  settings,
  hasUserRebrandly,
  onSuccess,
}: InlineCreateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rebrandlyDomains, setRebrandlyDomains] = useState<RebrandlyDomain[]>([]);
  const [form, setForm] = useState<LinkFormState>({ ...emptyForm });
  const urlInputRef = useRef<HTMLInputElement>(null);

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
      .then((data: RebrandlyDomain[]) => {
        setRebrandlyDomains(data ?? []);
        setForm((prev) => ({
          ...prev,
          shortenWithRebrandly: true,
          rebrandlyDomain: prev.rebrandlyDomain || (data?.[0]?.fullName ?? ""),
        }));
      })
      .catch(() => {});
  }, [expanded, hasRebrandly]);

  useEffect(() => {
    if (!expanded) return;
    const veh = vehicles.find((v) => v.id === form.vehicleId);
    const cam = campaigns.find((c) => c.id === form.campaignId);
    if (veh && cam) {
      setForm((prev) => ({ ...prev, slug: slugify(`${veh.slug}-${cam.slug}`) }));
    }
  }, [form.vehicleId, form.campaignId, expanded, vehicles, campaigns]);

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

  const handleCancel = () => {
    setExpanded(false);
    setForm({ ...emptyForm });
    setRebrandlyDomains([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.baseUrl || !form.vehicleId || !form.campaignId) {
      toast.error("URL Base, Veículo e Campanha são obrigatórios");
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
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao criar link");
      }
      toast.success("Link criado com sucesso!");
      handleCancel();
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar link");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl bg-white border transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
        expanded
          ? "border-orange-200 shadow-[0_4px_24px_rgba(249,115,22,0.10)]"
          : "border-gray-100 hover:border-gray-200"
      )}
    >
      <form onSubmit={handleSubmit}>
        {/* Always-visible row */}
        <div className="flex items-center gap-3 p-4">
          {/* CTA button — left-aligned, prominent */}
          <button
            type={expanded ? "button" : "button"}
            onClick={() => {
              if (!expanded) {
                setExpanded(true);
                setTimeout(() => urlInputRef.current?.focus(), 50);
              }
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shrink-0 transition-all duration-300",
              expanded
                ? "bg-orange-500 text-white shadow-[0_2px_8px_rgba(249,115,22,0.35)] scale-105"
                : "bg-[#1C1B21] hover:bg-orange-500 text-white shadow-[0_2px_8px_rgba(28,27,33,0.2)] hover:shadow-[0_2px_12px_rgba(249,115,22,0.35)]"
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
              onClick={handleCancel}
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
            expanded ? "max-h-[900px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
          )}
        >
          <div className="border-t border-gray-100 px-4 pb-4 pt-4 space-y-4">
            {/* Vehicle + Campaign */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Veículo *</Label>
                <select
                  value={form.vehicleId}
                  onChange={(e) => set("vehicleId", e.target.value)}
                  className="w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-400 transition-colors duration-200"
                >
                  <option value="" disabled>Selecionar</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Campanha *</Label>
                <select
                  value={form.campaignId}
                  onChange={(e) => set("campaignId", e.target.value)}
                  className="w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-400 transition-colors duration-200"
                >
                  <option value="" disabled>Selecionar</option>
                  {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Slug</Label>
              <Input
                placeholder="gerado-automaticamente"
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                className="bg-white border-gray-200 font-mono text-xs text-gray-500 focus:border-orange-400 transition-colors duration-200"
              />
            </div>

            <Separator className="bg-gray-100" />

            {/* UTM Fields */}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Parâmetros UTM</p>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { field: "utmSource", label: "Source", placeholder: "ex: google" },
                    { field: "utmMedium", label: "Medium", placeholder: "ex: cpc" },
                    { field: "utmCampaign", label: "Campaign", placeholder: "ex: lancamento-2026" },
                    { field: "utmContent", label: "Content", placeholder: "ex: banner-topo" },
                  ] as { field: keyof LinkFormState; label: string; placeholder: string }[]
                ).map(({ field, label, placeholder }) => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-xs text-gray-500">{label}</Label>
                    <Input
                      placeholder={placeholder}
                      value={form[field] as string}
                      onChange={(e) => set(field, e.target.value)}
                      className="bg-white border-gray-200 text-sm focus:border-orange-400 transition-colors duration-200"
                    />
                  </div>
                ))}
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs text-gray-500">Term</Label>
                  <Input
                    placeholder="ex: palavra-chave"
                    value={form.utmTerm}
                    onChange={(e) => set("utmTerm", e.target.value)}
                    className="bg-white border-gray-200 text-sm focus:border-orange-400 transition-colors duration-200"
                  />
                </div>
              </div>
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
                  <div className={cn(
                    "transition-all duration-300",
                    form.shortenWithRebrandly ? "opacity-100" : "opacity-0"
                  )}>
                    <Label className="text-xs text-gray-500">Domínio</Label>
                    <select
                      value={form.rebrandlyDomain}
                      onChange={(e) => set("rebrandlyDomain", e.target.value)}
                      className="mt-1.5 w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-400 transition-colors duration-200"
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
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-800"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#1C1B21] hover:bg-orange-500 text-white transition-colors duration-300 px-6"
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
