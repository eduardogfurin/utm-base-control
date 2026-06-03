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
  DialogTrigger,
  DialogFooter,
  DialogClose,
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

// ─── Enums ─────────────────────────────────────────────────────────────────────

const VEHICLE_CATEGORIES = [
  "PODCAST",
  "INFLUENCER",
  "AFFILIATE",
  "CRM",
  "META_ADS",
  "GOOGLE_ADS",
  "YOUTUBE",
  "PARTNER",
  "EVENT",
  "OTHER",
] as const

type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number]

const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  PODCAST: "Podcast",
  INFLUENCER: "Influencer",
  AFFILIATE: "Afiliado",
  CRM: "CRM",
  META_ADS: "Meta Ads",
  GOOGLE_ADS: "Google Ads",
  YOUTUBE: "YouTube",
  PARTNER: "Parceiro",
  EVENT: "Evento",
  OTHER: "Outros",
}

const CATEGORY_COLORS: Record<VehicleCategory, string> = {
  PODCAST: "bg-violet-50 text-violet-700 border-violet-200",
  INFLUENCER: "bg-pink-50 text-pink-700 border-pink-200",
  AFFILIATE: "bg-orange-50 text-orange-600 border-orange-200",
  CRM: "bg-cyan-50 text-cyan-700 border-cyan-200",
  META_ADS: "bg-blue-50 text-blue-700 border-blue-200",
  GOOGLE_ADS: "bg-red-50 text-red-700 border-red-200",
  YOUTUBE: "bg-rose-50 text-rose-700 border-rose-200",
  PARTNER: "bg-teal-50 text-teal-700 border-teal-200",
  EVENT: "bg-amber-50 text-amber-700 border-amber-200",
  OTHER: "bg-gray-100 text-gray-400 border-gray-200",
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-yellow-50 text-yellow-700 border-yellow-200",
  ARCHIVED: "bg-gray-100 text-gray-400 border-gray-200",
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  ARCHIVED: "Arquivado",
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string
  name: string
  slug: string
  category: VehicleCategory
  description: string | null
  status: string
  createdAt: string
  _count: { links: number }
}

// ─── Schema ────────────────────────────────────────────────────────────────────

const vehicleSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  slug: z.string().min(1, "Slug obrigatório").regex(/^[a-z0-9-]+$/, "Slug inválido"),
  category: z.enum(VEHICLE_CATEGORIES),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
})

type VehicleForm = z.infer<typeof vehicleSchema>

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

// ─── Vehicle Dialog ────────────────────────────────────────────────────────────

interface VehicleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle?: Vehicle | null
  onSaved: (v: Vehicle) => void
  isViewer: boolean
}

function VehicleDialog({ open, onOpenChange, vehicle, onSaved }: VehicleDialogProps) {
  const isEditing = !!vehicle

  const form = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      name: "",
      slug: "",
      category: "OTHER",
      description: "",
      status: "ACTIVE",
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (vehicle) {
      form.reset({
        name: vehicle.name,
        slug: vehicle.slug,
        category: vehicle.category,
        description: vehicle.description ?? "",
        status: vehicle.status as "ACTIVE" | "INACTIVE" | "ARCHIVED",
      })
    } else {
      form.reset({
        name: "",
        slug: "",
        category: "OTHER",
        description: "",
        status: "ACTIVE",
      })
    }
  }, [vehicle, form])

  const onSubmit = async (values: VehicleForm) => {
    try {
      const url = isEditing ? `/api/vehicles/${vehicle!.id}` : "/api/vehicles"
      const method = isEditing ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao salvar")
      }

      const saved: Vehicle = await res.json()
      onSaved(saved)
      onOpenChange(false)
      toast.success(isEditing ? "Veículo atualizado" : "Veículo criado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro desconhecido")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Veículo" : "Novo Veículo"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-600">Nome</label>
            <Input
              {...form.register("name", {
                onChange: (e) => {
                  if (!isEditing) {
                    form.setValue("slug", slugify(e.target.value), { shouldValidate: true })
                  }
                },
              })}
              placeholder="Ex: Podcast Diário"
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
              placeholder="ex: podcast-diario"
              className="font-mono text-xs"
            />
            {form.formState.errors.slug && (
              <p className="text-xs text-red-700">{form.formState.errors.slug.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-600">Categoria</label>
            <select
              {...form.register("category")}
              className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-0"
            >
              {VEHICLE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
            {form.formState.errors.category && (
              <p className="text-xs text-red-700">{form.formState.errors.category.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-600">
              Descrição <span className="text-gray-400">(opcional)</span>
            </label>
            <Textarea
              {...form.register("description")}
              placeholder="Descrição do veículo..."
              rows={3}
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-600">Status</label>
            <select
              {...form.register("status")}
              className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-0"
            >
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
              <option value="ARCHIVED">Arquivado</option>
            </select>
          </div>

          <DialogFooter showCloseButton>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="bg-[#1C1B21] hover:bg-orange-500 text-white transition-colors duration-300"
            >
              {form.formState.isSubmitting ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function VehiclesPage() {
  const { data: session } = useSession()
  const isViewer = session?.user?.role === "VIEWER"

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadVehicles()
  }, [])

  async function loadVehicles() {
    try {
      setLoading(true)
      const res = await fetch("/api/vehicles")
      if (!res.ok) throw new Error("Falha ao carregar veículos")
      const data = await res.json()
      setVehicles(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  function handleSaved(saved: Vehicle) {
    setVehicles((prev) => {
      const idx = prev.findIndex((v) => v.id === saved.id)
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
      const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao excluir")
      }
      const data = await res.json()
      if (data.archived) {
        // Vehicle was archived (had links)
        setVehicles((prev) =>
          prev.map((v) =>
            v.id === id ? { ...v, status: "ARCHIVED" } : v
          )
        )
        toast.warning("Veículo possui links e foi arquivado")
      } else {
        setVehicles((prev) => prev.filter((v) => v.id !== id))
        toast.success("Veículo excluído")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setDeletingId(null)
    }
  }

  function openEdit(vehicle: Vehicle) {
    setEditingVehicle(vehicle)
    setDialogOpen(true)
  }

  function openCreate() {
    setEditingVehicle(null)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Veículos</h1>
          <p className="text-sm text-gray-400 mt-1">
            Canais de distribuição de tráfego
          </p>
        </div>
        {!isViewer && (
          <Button
            onClick={openCreate}
            className="bg-[#1C1B21] hover:bg-orange-500 text-white transition-colors duration-300"
          >
            <PlusIcon className="size-4" />
            Novo Veículo
          </Button>
        )}
      </div>

      {/* Dialog */}
      <VehicleDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) setEditingVehicle(null)
        }}
        vehicle={editingVehicle}
        onSaved={handleSaved}
        isViewer={isViewer}
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
                    Categoria
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
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
                      {Array.from({ length: isViewer ? 6 : 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full max-w-[120px]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : vehicles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isViewer ? 6 : 7}
                      className="px-4 py-12 text-center text-sm text-gray-400"
                    >
                      Nenhum veículo cadastrado
                    </td>
                  </tr>
                ) : (
                  vehicles.map((vehicle) => (
                    <tr
                      key={vehicle.id}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {vehicle.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">
                        {vehicle.slug}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={CATEGORY_COLORS[vehicle.category]}>
                          {CATEGORY_LABELS[vehicle.category]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_COLORS[vehicle.status]}>
                          {STATUS_LABELS[vehicle.status] ?? vehicle.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-400 tabular-nums">
                        {vehicle._count.links}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {formatDate(vehicle.createdAt)}
                      </td>
                      {!isViewer && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEdit(vehicle)}
                              title="Editar"
                            >
                              <Pencil className="size-3.5" />
                            </Button>

                            <AlertDialog
                              open={deletingId === vehicle.id}
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
                                    onClick={() => setDeletingId(vehicle.id)}
                                    className="text-gray-400 hover:text-red-700"
                                  />
                                }
                              >
                                <Trash2 className="size-3.5" />
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir veículo</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir{" "}
                                    <strong className="text-gray-800">{vehicle.name}</strong>?
                                    {vehicle._count.links > 0 && (
                                      <span className="block mt-1 text-yellow-700">
                                        Este veículo possui {vehicle._count.links} link(s) e será arquivado em vez de excluído.
                                      </span>
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    variant="destructive"
                                    onClick={() => handleDelete(vehicle.id)}
                                  >
                                    {vehicle._count.links > 0 ? "Arquivar" : "Excluir"}
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
