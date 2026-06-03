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

const subtitles: Record<string, string> = {
  "/dashboard": "Visão geral de performance",
  "/vehicles": "Gerencie seus veículos de distribuição",
  "/campaigns": "Organize e acompanhe campanhas",
  "/links": "Crie e monitore links rastreados",
  "/templates": "Padrões de parâmetros UTM",
  "/qrcodes": "Gere QR Codes para seus links",
  "/import": "Importe links via arquivo CSV",
  "/history": "Registro completo de alterações",
  "/settings": "Configurações da plataforma",
  "/users": "Gerenciar usuários e permissões",
};

export function Header() {
  const pathname = usePathname();
  const base = "/" + pathname.split("/")[1];
  const title = titles[base] ?? "UTM Base Control";
  const subtitle = subtitles[base];

  return (
    <header className="h-16 border-b border-gray-100 flex items-center px-6 bg-white/80 backdrop-blur sticky top-0 z-10">
      <div>
        <h1 className="text-sm font-semibold text-gray-800">{title}</h1>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
    </header>
  );
}
