"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { PlusIcon, Pencil, Trash2 } from "lucide-react"
import { cn, slugify, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string
  name: string
  slug: string
  description: string | null
  startDate: string | null
  endDate: string | null
  status: string
  createdAt: string
  _count: { links: number }
}

// ─── Schema ────────────────────────────────────────────────────────────────────

const campaignSchema = z
  .object({
    name: z.string().min(1, "Nome obrigatório"),
    slug: z
      .string()
      .min(1, "Slug obrigatório")
      .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate)
      }
      return true
    },
    {
      message: "Data de término deve ser igual ou posterior à data de início",
      path: ["endDate"],
    }
  )

type CampaignForm = z.infer<typeof campaignSchema>

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-yellow-50 text-yellow-700 border-yellow-200",
  ARCHIVED: "bg-gray-100 text-gray-400 border-gray-200",
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativa",
  INACTIVE: "Inativa",
  ARCHIVED: "Arquivada",
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        className
      )}
    >
      {children}
    </span>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-gray-100", className)} />
}

// ─── Campaign Dialog ───────────────────────────────────────────────────────────

interface CampaignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaign?: Campaign | null
  onSaved: (c: Campaign) => void
}

function CampaignDialog({ open, onOpenChange, campaign, onSaved }: CampaignDialogProps) {
  const isEditing = !!campaign

  const form = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      startDate: "",
      endDate: "",
      status: "ACTIVE",
    },
  })

  useEffect(() => {
    if (campaign) {
      form.reset({
        name: campaign.name,
        slug: campaign.slug,
        description: campaign.description ?? "",
        startDate: campaign.startDate
          ? new Date(campaign.startDate).toISOString().slice(0, 10)
          : "",
        endDate: campaign.endDate
          ? new Date(campaign.endDate).toISOString().slice(0, 10)
          : "",
        status: campaign.status as "ACTIVE" | "INACTIVE" | "ARCHIVED",
      })
    } else {
      form.reset({
        name: "",
        slug: "",
        description: "",
        startDate: "",
        endDate: "",
        status: "ACTIVE",
      })
    }
  }, [campaign, form])

  const onSubmit = async (values: CampaignForm) => {
    try {
      const url = isEditing ? `/api/campaigns/${campaign!.id}` : "/api/campaigns"
      const method = isEditing ? "PATCH" : "POST"

      const payload = {
        ...values,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
        description: values.description || null,
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao salvar")
      }

      const saved: Campaign = await res.json()
      onSaved(saved)
      onOpenChange(false)
      toast.success(isEditing ? "Campanha atualizada" : "Campanha criada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro desconhecido")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Campanha" : "Nova Campanha"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-600">Nome</label>
            <Input
              {...form.register("name", {
                onChange: (e) => {
                  if (!isEditing) {
                    form.setValue("slug", slugify(e.target.value), {
                      shouldValidate: true,
                    })
                  }
                },
              })}
              placeholder="Ex: Black Friday 2025"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-700">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-600">Slug</label>
            <Input
              {...form.register("slug")}
              placeholder="ex: black-friday-2025"
              className="font-mono text-xs"
            />
            {form.formState.errors.slug && (
              <p className="text-xs text-red-700">{form.formState.errors.slug.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-600">
              Descrição <span className="text-gray-400">(opcional)</span>
            </label>
            <Textarea
              {...form.register("description")}
              placeholder="Descrição da campanha..."
              rows={2}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-600">
                Data Início <span className="text-gray-400">(opcional)</span>
              </label>
              <Input type="date" {...form.register("startDate")} />
              {form.formState.errors.startDate && (
                <p className="text-xs text-red-700">
                  {form.formState.errors.startDate.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-600">
                Data Término <span className="text-gray-400">(opcional)</span>
              </label>
              <Input type="date" {...form.register("endDate")} />
              {form.formState.errors.endDate && (
                <p className="text-xs text-red-700">
                  {form.formState.errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-600">Status</label>
            <select
              {...form.register("status")}
              className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-0"
            >
              <option value="ACTIVE">Ativa</option>
              <option value="INACTIVE">Inativa</option>
              <option value="ARCHIVED">Arquivada</option>
            </select>
          </div>

          <DialogFooter showCloseButton>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="bg-[#1C1B21] hover:bg-orange-500 text-white transition-colors duration-300"
            >
              {form.formState.isSubmitting
                ? "Salvando..."
                : isEditing
                ? "Salvar"
                : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const { data: session } = useSession()
  const isViewer = session?.user?.role === "VIEWER"

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadCampaigns()
  }, [])

  async function loadCampaigns() {
    try {
      setLoading(true)
      const res = await fetch("/api/campaigns")
      if (!res.ok) throw new Error("Falha ao carregar campanhas")
      const data = await res.json()
      setCampaigns(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  function handleSaved(saved: Campaign) {
    setCampaigns((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao excluir")
      }
      const data = await res.json()
      if (data.archived) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: "ARCHIVED" } : c))
        )
        toast.warning("Campanha possui links e foi arquivada")
      } else {
        setCampaigns((prev) => prev.filter((c) => c.id !== id))
        toast.success("Campanha excluída")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setDeletingId(null)
    }
  }

  function openEdit(campaign: Campaign) {
    setEditingCampaign(campaign)
    setDialogOpen(true)
  }

  function openCreate() {
    setEditingCampaign(null)
    setDialogOpen(true)
  }

  const colCount = isViewer ? 7 : 8

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Campanhas</h1>
          <p className="text-sm text-gray-400 mt-1">
            Gerenciamento de campanhas de marketing
          </p>
        </div>
        {!isViewer && (
          <Button
            onClick={openCreate}
            className="bg-[#1C1B21] hover:bg-orange-500 text-white transition-colors duration-300"
          >
            <PlusIcon className="size-4" />
            Nova Campanha
          </Button>
        )}
      </div>

      {/* Dialog */}
      <CampaignDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) setEditingCampaign(null)
        }}
        campaign={editingCampaign}
        onSaved={handleSaved}
      />

      {/* Table */}
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-sm text-red-700">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Início
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Término
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Links
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Criado em
                  </th>
                  {!isViewer && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: colCount }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full max-w-[120px]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : campaigns.length === 0 ? (
                  <tr>
                    <td
                      colSpan={colCount}
                      className="px-4 py-12 text-center text-sm text-gray-400"
                    >
                      Nenhuma campanha cadastrada
                    </td>
                  </tr>
                ) : (
                  campaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {campaign.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">
                        {campaign.slug}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_COLORS[campaign.status]}>
                          {STATUS_LABELS[campaign.status] ?? campaign.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {campaign.startDate ? formatDate(campaign.startDate) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {campaign.endDate ? formatDate(campaign.endDate) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 tabular-nums">
                        {campaign._count.links}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {formatDate(campaign.createdAt)}
                      </td>
                      {!isViewer && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEdit(campaign)}
                              title="Editar"
                            >
                              <Pencil className="size-3.5" />
                            </Button>

                            <AlertDialog
                              open={deletingId === campaign.id}
                              onOpenChange={(o) => {
                                if (!o) setDeletingId(null)
                              }}
                            >
                              <AlertDialogTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    title="Excluir"
                                    onClick={() => setDeletingId(campaign.id)}
                                    className="text-gray-400 hover:text-red-700"
                                  />
                                }
                              >
                                <Trash2 className="size-3.5" />
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir campanha</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir{" "}
                                    <strong className="text-gray-800">
                                      {campaign.name}
                                    </strong>
                                    ?
                                    {campaign._count.links > 0 && (
                                      <span className="block mt-1 text-yellow-700">
                                        Esta campanha possui {campaign._count.links} link(s) e será arquivada em vez de excluída.
                                      </span>
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    variant="destructive"
                                    onClick={() => handleDelete(campaign.id)}
                                  >
                                    {campaign._count.links > 0 ? "Arquivar" : "Excluir"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
