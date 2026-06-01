"use client";

import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/vehicles": "Veículos",
  "/campaigns": "Campanhas",
  "/links": "Links",
  "/templates": "Templates UTM",
  "/qrcodes": "QR Codes",
  "/import": "Importação CSV",
  "/history": "Histórico de Alterações",
  "/settings": "Configurações",
  "/users": "Usuários",
};

export function Header() {
  const pathname = usePathname();
  const base = "/" + pathname.split("/")[1];
  const title = titles[base] ?? "UTM Base Control";

  return (
    <header className="h-14 border-b border-zinc-800 flex items-center px-6 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
      <h1 className="text-sm font-medium text-zinc-200">{title}</h1>
    </header>
  );
}
