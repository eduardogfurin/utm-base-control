"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Users, Plus, Pencil, Trash2, Loader2, ShieldCheck } from "lucide-react";

type UserRole = "ADMIN" | "MARKETING" | "VIEWER";

interface AppUser {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  createdAt: string;
}

const ROLE_BADGE: Record<UserRole, { label: string; className: string }> = {
  ADMIN: {
    label: "Admin",
    className: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  },
  MARKETING: {
    label: "Marketing",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  VIEWER: {
    label: "Viewer",
    className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  },
};

interface CreateForm {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

interface EditForm {
  name: string;
  role: UserRole;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="border-zinc-800">
          <TableCell>
            <Skeleton className="h-4 w-32 bg-zinc-800" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-44 bg-zinc-800" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20 bg-zinc-800" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24 bg-zinc-800" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-7 w-20 bg-zinc-800" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({
    name: "",
    email: "",
    password: "",
    role: "MARKETING",
  });
  const [createLoading, setCreateLoading] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", role: "MARKETING" });
  const [editLoading, setEditLoading] = useState(false);

  // Delete loading per user
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || session.user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Erro ao carregar usuários");
      const data = await res.json();
      setUsers(data);
    } catch {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetchUsers();
    }
  }, [session, fetchUsers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error("Preencha todos os campos");
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar usuário");
      toast.success("Usuário criado com sucesso");
      setCreateOpen(false);
      setCreateForm({ name: "", email: "", password: "", role: "MARKETING" });
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar usuário");
    } finally {
      setCreateLoading(false);
    }
  }

  function openEdit(user: AppUser) {
    setEditTarget(user);
    setEditForm({ name: user.name ?? "", role: user.role });
    setEditOpen(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/users/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao atualizar usuário");
      toast.success("Usuário atualizado");
      setEditOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar usuário");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(userId: string) {
    setDeleteLoadingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao deletar usuário");
      toast.success("Usuário removido");
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao deletar usuário");
    } finally {
      setDeleteLoadingId(null);
    }
  }

  if (status === "loading" || (session?.user?.role !== "ADMIN" && status === "authenticated")) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={20} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
            <Users size={16} className="text-zinc-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Usuários</h1>
            <p className="text-sm text-zinc-500">
              Gerencie os membros e suas permissões
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="bg-violet-600 hover:bg-violet-500 text-white"
        >
          <Plus size={14} className="mr-1.5" />
          Novo Usuário
        </Button>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400 font-medium">Nome</TableHead>
              <TableHead className="text-zinc-400 font-medium">Email</TableHead>
              <TableHead className="text-zinc-400 font-medium">Role</TableHead>
              <TableHead className="text-zinc-400 font-medium">Criado em</TableHead>
              <TableHead className="text-zinc-400 font-medium w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows />
            ) : users.length === 0 ? (
              <TableRow className="border-zinc-800 hover:bg-zinc-900">
                <TableCell colSpan={5} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <Users size={32} className="text-zinc-700" />
                    <p className="text-sm text-zinc-500">Nenhum usuário encontrado</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const badge = ROLE_BADGE[user.role];
                const isSelf = session?.user?.id === user.id;
                const isDeleting = deleteLoadingId === user.id;
                return (
                  <TableRow
                    key={user.id}
                    className="border-zinc-800 hover:bg-zinc-800/40 transition-colors"
                  >
                    <TableCell className="text-zinc-200 font-medium text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-violet-600/70 flex items-center justify-center text-[10px] font-bold text-white uppercase flex-shrink-0">
                          {(user.name ?? user.email ?? "U")[0]}
                        </div>
                        {user.name ?? "—"}
                        {isSelf && (
                          <span className="text-[10px] text-zinc-500">(você)</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm">
                      {user.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-500 text-sm">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
                          onClick={() => openEdit(user)}
                        >
                          <Pencil size={13} />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger
                            disabled={isSelf || isDeleting}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition-colors"
                          >
                            {isDeleting ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-zinc-900 border-zinc-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-zinc-100">
                                Remover usuário?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-zinc-400">
                                Esta ação é irreversível. O usuário{" "}
                                <span className="font-medium text-zinc-200">
                                  {user.name ?? user.email}
                                </span>{" "}
                                será permanentemente removido do sistema.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(user.id)}
                                className="bg-red-600 hover:bg-red-500 text-white"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-violet-400" />
              Novo Usuário
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Nome</Label>
              <Input
                placeholder="Ex: João Silva"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Email</Label>
              <Input
                type="email"
                placeholder="joao@empresa.com"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                }
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Senha</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, password: e.target.value }))
                }
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Role</Label>
              <Select
                value={createForm.role}
                onValueChange={(val) =>
                  setCreateForm((f) => ({ ...f, role: (val ?? "MARKETING") as UserRole }))
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="ADMIN" className="text-zinc-200">
                    Admin
                  </SelectItem>
                  <SelectItem value="MARKETING" className="text-zinc-200">
                    Marketing
                  </SelectItem>
                  <SelectItem value="VIEWER" className="text-zinc-200">
                    Viewer
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateOpen(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createLoading}
                className="bg-violet-600 hover:bg-violet-500 text-white"
              >
                {createLoading && (
                  <Loader2 size={14} className="animate-spin mr-1.5" />
                )}
                Criar Usuário
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil size={15} className="text-zinc-400" />
              Editar Usuário
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Nome</Label>
              <Input
                placeholder="Nome completo"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-sm">
                Email{" "}
                <span className="text-zinc-600 text-xs">(não editável)</span>
              </Label>
              <Input
                value={editTarget?.email ?? ""}
                disabled
                className="bg-zinc-800/50 border-zinc-700 text-zinc-500 cursor-not-allowed"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(val) =>
                  setEditForm((f) => ({ ...f, role: (val ?? "MARKETING") as UserRole }))
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="ADMIN" className="text-zinc-200">
                    Admin
                  </SelectItem>
                  <SelectItem value="MARKETING" className="text-zinc-200">
                    Marketing
                  </SelectItem>
                  <SelectItem value="VIEWER" className="text-zinc-200">
                    Viewer
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditOpen(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={editLoading}
                className="bg-violet-600 hover:bg-violet-500 text-white"
              >
                {editLoading && (
                  <Loader2 size={14} className="animate-spin mr-1.5" />
                )}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
