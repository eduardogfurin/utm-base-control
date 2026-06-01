import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export function buildUtmUrl(
  baseUrl: string,
  params: {
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmContent?: string | null;
    utmTerm?: string | null;
  }
): string {
  try {
    const url = new URL(baseUrl);
    if (params.utmSource) url.searchParams.set("utm_source", params.utmSource);
    if (params.utmMedium) url.searchParams.set("utm_medium", params.utmMedium);
    if (params.utmCampaign) url.searchParams.set("utm_campaign", params.utmCampaign);
    if (params.utmContent) url.searchParams.set("utm_content", params.utmContent);
    if (params.utmTerm) url.searchParams.set("utm_term", params.utmTerm);
    return url.toString();
  } catch {
    return baseUrl;
  }
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
