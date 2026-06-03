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
    <aside className="w-60 min-h-screen bg-white border-r border-gray-100 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-sm">
            <Link2 size={13} className="text-white" />
          </div>
          <span className="font-semibold text-sm text-gray-800 tracking-tight">UTM Base Control</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        <p className="px-2 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          Principal
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150",
                active
                  ? "bg-orange-50 text-orange-700 font-medium"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              )}
            >
              <Icon
                size={15}
                className={active ? "text-orange-500" : "text-gray-400"}
              />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <p className="px-2 mt-5 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              Admin
            </p>
            {adminItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150",
                    active
                      ? "bg-orange-50 text-orange-700 font-medium"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  )}
                >
                  <Icon
                    size={15}
                    className={active ? "text-orange-500" : "text-gray-400"}
                  />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-gray-100 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-[10px] font-bold text-white uppercase flex-shrink-0 shadow-sm">
              {session?.user?.name?.[0] ?? session?.user?.email?.[0] ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">
                {session?.user?.name ?? "Usuário"}
              </p>
              <p className="text-[10px] text-gray-400 truncate">
                {session?.user?.email}
              </p>
            </div>
            <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-500 focus:text-red-500 focus:bg-red-50"
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
