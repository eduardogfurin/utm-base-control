"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import {
  Home,
  Radio,
  Megaphone,
  Link2,
  Puzzle,
  UploadCloud,
  History,
  Settings,
  Users,
  LogOut,
  ChevronDown,
  UserCircle,
  BarChart2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Nav structure ─────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  basePath: string;
  children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

const topNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/links", label: "Links", icon: Link2 },
];

const trackingGroup: NavGroup = {
  label: "Acompanhamento",
  icon: BarChart2,
  basePath: "/tracking",
  children: [
    { href: "/tracking", label: "Relatórios", icon: BarChart2 },
    { href: "/vehicles", label: "Veículos", icon: Radio },
    { href: "/campaigns", label: "Campanhas", icon: Megaphone },
  ],
};

const settingsGroup: NavGroup = {
  label: "Configurações",
  icon: Settings,
  basePath: "/settings",
  children: [
    { href: "/templates", label: "Templates", icon: Puzzle },
    { href: "/import", label: "Importar lista", icon: UploadCloud },
    { href: "/history", label: "Histórico", icon: History },
  ],
};

// ─── Sidebar ───────────────────────────────────────────────────────────────────

function NavLink({ href, label, icon: Icon, pathname }: NavItem & { pathname: string }) {
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150",
        active
          ? "bg-orange-50 text-orange-700 font-medium"
          : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
      )}
    >
      <Icon size={15} className={active ? "text-orange-500" : "text-gray-400"} />
      {label}
    </Link>
  );
}

function NavGroupSection({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const isGroupActive = pathname.startsWith(group.basePath) ||
    group.children.some((c) => pathname === c.href || (c.href !== "/" && pathname.startsWith(c.href)));
  const [open, setOpen] = useState(isGroupActive);
  const Icon = group.icon;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150",
          isGroupActive
            ? "text-orange-700 font-medium"
            : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
        )}
      >
        <Icon size={15} className={isGroupActive ? "text-orange-500" : "text-gray-400"} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronRight
          size={12}
          className={cn(
            "text-gray-400 transition-transform duration-200",
            open && "rotate-90"
          )}
        />
      </button>
      {open && (
        <div className="ml-3.5 mt-0.5 pl-3 border-l border-gray-100 space-y-0.5">
          {group.children.map((child) => {
            const ChildIcon = child.icon;
            const active = pathname === child.href || (child.href !== "/" && pathname.startsWith(child.href) && child.href !== "/tracking");
            const activeTracking = child.href === "/tracking" && pathname === "/tracking";
            const isActive = active || activeTracking;
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150",
                  isActive
                    ? "bg-orange-50 text-orange-700 font-medium"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                )}
              >
                <ChildIcon size={13} className={isActive ? "text-orange-500" : "text-gray-400"} />
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
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
        {topNav.map((item) => (
          <NavLink key={item.href} {...item} pathname={pathname} />
        ))}

        <div className="pt-1" />
        <NavGroupSection group={trackingGroup} pathname={pathname} />

        <div className="pt-1" />
        <NavGroupSection group={settingsGroup} pathname={pathname} />

        {isAdmin && (
          <>
            <p className="px-2 mt-5 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              Admin
            </p>
            {[
              { href: "/settings", label: "Configurações", icon: Settings },
              { href: "/users", label: "Usuários", icon: Users },
            ].map((item) => (
              <NavLink key={item.href} {...item} pathname={pathname} />
            ))}
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
            {isAdmin && (
              <>
                <DropdownMenuItem onClick={() => router.push("/users")}>
                  <Users size={14} className="text-gray-400" />
                  Usuários
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings size={14} className="text-gray-400" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => router.push("/integrations")}>
              <UserCircle size={14} className="text-gray-400" />
              Meu Perfil / Integrações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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
