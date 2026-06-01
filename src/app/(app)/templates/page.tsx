"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string;
  name: string;
  slug: string;
  category: string;
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
  vehicle: Vehicle | null;
  createdAt: string;
}

interface TemplateFormState {
  name: string;
  vehicleId: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
}

const emptyForm: TemplateFormState = {
  name: "",
  vehicleId: "none",
  source: "",
  medium: "",
  campaign: "",
  content: "",
  term: "",
};

// ─── Template Form Dialog ─────────────────────────────────────────────────────

interface TemplateFormDialogProps {
  mode: "create" | "edit";
  template?: UtmTemplate;
  vehicles: Vehicle[];
  onSuccess: () => void;
  trigger: React.ReactNode;
}

function TemplateFormDialog({
  mode,
  template,
  vehicles,
  onSuccess,
  trigger,
}: TemplateFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TemplateFormState>(
    template
      ? {
          name: template.name,
          vehicleId: template.vehicleId ?? "none",
          source: template.source ?? "",
          medium: template.medium ?? "",
          campaign: template.campaign ?? "",
          content: template.content ?? "",
          term: template.term ?? "",
        }
      : { ...emptyForm }
  );

  const set = (field: keyof TemplateFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Nome do template é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        vehicleId: form.vehicleId === "none" ? undefined : form.vehicleId,
        source: form.source || undefined,
        medium: form.medium || undefined,
        campaign: form.campaign || undefined,
        content: form.content || undefined,
        term: form.term || undefined,
      };

      const url = mode === "edit" ? `/api/templates/${template!.id}` : "/api/templates";
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao salvar template");
      }

      toast.success(mode === "create" ? "Template criado!" : "Template atualizado!");
      setOpen(false);
      setForm({ ...emptyForm });
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v && mode === "create") setForm({ ...emptyForm });
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo Template UTM" : "Editar Template"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">Nome *</Label>
            <Input
              id="tpl-name"
              placeholder="ex: Podcast Padrão"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="bg-zinc-900 border-zinc-800"
            />
          </div>

          {/* Vehicle */}
          <div className="space-y-1.5">
            <Label>Veículo (opcional)</Label>
            <Select value={form.vehicleId} onValueChange={(v) => v !== null && set("vehicleId", v)}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Global (sem veículo)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Global (sem veículo)</SelectItem>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500">
              Templates sem veículo ficam disponíveis para todos os links.
            </p>
          </div>

          <Separator className="bg-zinc-800" />

          {/* UTM Fields */}
          <div>
            <p className="text-sm font-medium text-zinc-300 mb-3">Parâmetros UTM</p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { field: "source", label: "UTM Source" },
                  { field: "medium", label: "UTM Medium" },
                  { field: "campaign", label: "UTM Campaign" },
                  { field: "content", label: "UTM Content" },
                ] as { field: keyof TemplateFormState; label: string }[]
              ).map(({ field, label }) => (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={`tpl-${field}`}>{label}</Label>
                  <Input
                    id={`tpl-${field}`}
                    placeholder={field}
                    value={form[field] as string}
                    onChange={(e) => set(field, e.target.value)}
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
              ))}
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="tpl-term">UTM Term</Label>
                <Input
                  id="tpl-term"
                  placeholder="term"
                  value={form.term}
                  onChange={(e) => set("term", e.target.value)}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : mode === "create" ? "Criar Template" : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const { data: session } = useSession();
  const [templates, setTemplates] = useState<UtmTemplate[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const isViewer = session?.user?.role === "VIEWER";

  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/templates");
    if (res.ok) setTemplates(await res.json());
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [vehiclesRes] = await Promise.all([fetch("/api/vehicles"), fetchTemplates()]);
        if (vehiclesRes.ok) setVehicles(await vehiclesRes.json());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchTemplates]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao deletar");
      toast.success("Template deletado!");
      fetchTemplates();
    } catch {
      toast.error("Erro ao deletar template");
    }
  };

  const utmCell = (value: string | null) =>
    value ? (
      <span className="font-mono text-xs text-zinc-200">{value}</span>
    ) : (
      <span className="text-zinc-600 text-xs">—</span>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Templates UTM</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Pré-configurações de UTM reutilizáveis por veículo
          </p>
        </div>
        {!isViewer && (
          <TemplateFormDialog
            mode="create"
            vehicles={vehicles}
            onSuccess={fetchTemplates}
            trigger={
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Template
              </Button>
            }
          />
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400">Nome</TableHead>
              <TableHead className="text-zinc-400">Veículo</TableHead>
              <TableHead className="text-zinc-400">Source</TableHead>
              <TableHead className="text-zinc-400">Medium</TableHead>
              <TableHead className="text-zinc-400">Campaign</TableHead>
              <TableHead className="text-zinc-400">Content</TableHead>
              <TableHead className="text-zinc-400">Term</TableHead>
              {!isViewer && (
                <TableHead className="text-zinc-400 text-right">Ações</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="border-zinc-800">
                  {Array.from({ length: isViewer ? 7 : 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : templates.length === 0 ? (
              <TableRow className="border-zinc-800">
                <TableCell colSpan={isViewer ? 7 : 8} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <LayoutTemplate className="h-8 w-8" />
                    <p className="text-sm">Nenhum template encontrado</p>
                    {!isViewer && (
                      <p className="text-xs">
                        Crie templates UTM para agilizar a criação de links
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              templates.map((tpl) => (
                <TableRow key={tpl.id} className="border-zinc-800 hover:bg-zinc-900/50">
                  <TableCell>
                    <span className="text-sm font-medium text-zinc-200">{tpl.name}</span>
                  </TableCell>
                  <TableCell>
                    {tpl.vehicle ? (
                      <Badge variant="secondary" className="text-xs">
                        {tpl.vehicle.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-700">
                        Global
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{utmCell(tpl.source)}</TableCell>
                  <TableCell>{utmCell(tpl.medium)}</TableCell>
                  <TableCell>{utmCell(tpl.campaign)}</TableCell>
                  <TableCell>{utmCell(tpl.content)}</TableCell>
                  <TableCell>{utmCell(tpl.term)}</TableCell>
                  {!isViewer && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5">
                        <TemplateFormDialog
                          mode="edit"
                          template={tpl}
                          vehicles={vehicles}
                          onSuccess={fetchTemplates}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-400 hover:text-red-400"
                                title="Deletar"
                              />
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deletar template?</AlertDialogTitle>
                              <AlertDialogDescription>
                                O template{" "}
                                <strong className="text-zinc-200">{tpl.name}</strong> será
                                removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(tpl.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && templates.length > 0 && (
        <p className="text-xs text-zinc-600">
          {templates.length} template{templates.length !== 1 ? "s" : ""} cadastrado
          {templates.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
