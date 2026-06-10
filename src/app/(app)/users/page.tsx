"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    className: "bg-orange-50 text-orange-700 border-orange-200",
  },
  MARKETING: {
    label: "Marketing",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  VIEWER: {
    label: "Viewer",
    className: "bg-gray-100 text-gray-600 border-gray-200",
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
        <TableRow key={i} className="border-gray-100">
          <TableCell><Skeleton className="h-4 w-32 bg-gray-100" /></TableCell>
          <TableCell><Skeleton className="h-4 w-44 bg-gray-100" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20 bg-gray-100" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24 bg-gray-100" /></TableCell>
          <TableCell><Skeleton className="h-7 w-20 bg-gray-100" /></TableCell>
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

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({
    name: "",
    email: "",
    password: "",
    role: "MARKETING",
  });
  const [createLoading, setCreateLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", role: "MARKETING" });
  const [editLoading, setEditLoading] = useState(false);

  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

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
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <Users size={16} className="text-gray-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Usuários</h1>
            <p className="text-sm text-gray-500">
              Gerencie os membros e suas permissões
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="bg-[#1C1B21] hover:bg-orange-500 text-white transition-colors duration-300"
        >
          <Plus size={14} className="mr-1.5" />
          Novo Usuário
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-100 hover:bg-transparent bg-gray-50">
              <TableHead className="text-gray-500 font-medium">Nome</TableHead>
              <TableHead className="text-gray-500 font-medium">Email</TableHead>
              <TableHead className="text-gray-500 font-medium">Role</TableHead>
              <TableHead className="text-gray-500 font-medium">Criado em</TableHead>
              <TableHead className="text-gray-500 font-medium w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows />
            ) : users.length === 0 ? (
              <TableRow className="border-gray-100 hover:bg-card">
                <TableCell colSpan={5} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <Users size={32} className="text-gray-300" />
                    <p className="text-sm text-gray-400">Nenhum usuário encontrado</p>
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
                    className="border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <TableCell className="text-gray-900 font-medium text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600 uppercase flex-shrink-0">
                          {(user.name ?? user.email ?? "U")[0]}
                        </div>
                        {user.name ?? "—"}
                        {isSelf && (
                          <span className="text-[10px] text-gray-400">(você)</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
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
                    <TableCell className="text-gray-400 text-sm">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                          onClick={() => openEdit(user)}
                        >
                          <Pencil size={13} />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger
                            disabled={isSelf || isDeleting}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
                          >
                            {isDeleting ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-gray-200">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-gray-900">
                                Remover usuário?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-500">
                                Esta ação é irreversível. O usuário{" "}
                                <span className="font-medium text-gray-700">
                                  {user.name ?? user.email}
                                </span>{" "}
                                será permanentemente removido do sistema.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-gray-200 text-gray-700 hover:bg-gray-50">
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(user.id)}
                                className="bg-red-500 hover:bg-red-600 text-white"
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
        <DialogContent className="bg-card border-gray-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <ShieldCheck size={16} className="text-orange-500" />
              Novo Usuário
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-gray-700">Nome</Label>
              <Input
                placeholder="Ex: João Silva"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                className="bg-card border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-orange-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-700">Email</Label>
              <Input
                type="email"
                placeholder="joao@empresa.com"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                }
                className="bg-card border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-orange-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-700">Senha</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, password: e.target.value }))
                }
                className="bg-card border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-orange-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-700">Role</Label>
              <select
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, role: e.target.value as UserRole }))
                }
                className="w-full h-9 rounded-lg border border-gray-200 bg-card px-3 text-sm text-gray-900 outline-none focus:border-orange-400"
              >
                <option value="ADMIN">Admin</option>
                <option value="MARKETING">Marketing</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createLoading}
                className="bg-[#1C1B21] hover:bg-orange-500 text-white transition-colors duration-300"
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
        <DialogContent className="bg-card border-gray-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <Pencil size={15} className="text-gray-400" />
              Editar Usuário
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-gray-700">Nome</Label>
              <Input
                placeholder="Nome completo"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                className="bg-card border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-orange-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-500 text-sm">
                Email{" "}
                <span className="text-gray-400 text-xs">(não editável)</span>
              </Label>
              <Input
                value={editTarget?.email ?? ""}
                disabled
                className="bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-700">Role</Label>
              <select
                value={editForm.role}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, role: e.target.value as UserRole }))
                }
                className="w-full h-9 rounded-lg border border-gray-200 bg-card px-3 text-sm text-gray-900 outline-none focus:border-orange-400"
              >
                <option value="ADMIN">Admin</option>
                <option value="MARKETING">Marketing</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={editLoading}
                className="bg-[#1C1B21] hover:bg-orange-500 text-white transition-colors duration-300"
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
