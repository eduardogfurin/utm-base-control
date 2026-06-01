"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Radio,
  Megaphone,
  Link2,
  Puzzle,
  QrCode,
  UploadCloud,
  History,
  Settings,
  Users,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vehicles", label: "Veículos", icon: Radio },
  { href: "/campaigns", label: "Campanhas", icon: Megaphone },
  { href: "/links", label: "Links", icon: Link2 },
  { href: "/templates", label: "Templates UTM", icon: Puzzle },
  { href: "/qrcodes", label: "QR Codes", icon: QrCode },
  { href: "/import", label: "Importação CSV", icon: UploadCloud },
  { href: "/history", label: "Histórico", icon: History },
];

const adminItems = [
  { href: "/settings", label: "Configurações", icon: Settings },
  { href: "/users", label: "Usuários", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <aside className="w-60 min-h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-violet-600 rounded-md flex items-center justify-center">
            <Link2 size={14} className="text-white" />
          </div>
          <span className="font-semibold text-sm text-white">UTM Base Control</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        <div className="px-2 mb-2">
          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
            Principal
          </p>
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
                active
                  ? "bg-violet-600/15 text-violet-400"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              )}
            >
              <Icon size={15} />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="px-2 mt-4 mb-2">
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Admin
              </p>
            </div>
            {adminItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
                    active
                      ? "bg-violet-600/15 text-violet-400"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                  )}
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-zinc-800 p-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-zinc-800/60 transition-colors text-left cursor-pointer">
              <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-[10px] font-bold text-white uppercase flex-shrink-0">
                {session?.user?.name?.[0] ?? session?.user?.email?.[0] ?? "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-200 truncate">
                  {session?.user?.name ?? "Usuário"}
                </p>
                <p className="text-[10px] text-zinc-500 truncate">
                  {session?.user?.email}
                </p>
              </div>
              <ChevronDown size={12} className="text-zinc-500 flex-shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-400 focus:text-red-400"
            >
              <LogOut size={14} className="mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
