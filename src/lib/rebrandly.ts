const REBRANDLY_BASE = "https://api.rebrandly.com/v1";

interface RebrandlyConfig {
  apiKey: string;
  domain: string;
}

interface CreateLinkPayload {
  destination: string;
  slug?: string;
  domain?: { fullName: string };
  title?: string;
}

interface RebrandlyLinkResponse {
  id: string;
  shortUrl: string;
  slashtag: string;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

async function rebrandlyFetch(
  path: string,
  config: RebrandlyConfig,
  options: RequestInit = {}
) {
  const res = await fetch(`${REBRANDLY_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: config.apiKey,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Rebrandly API error: ${res.status}`);
  }

  return res.json();
}

export async function rebrandlyCreateLink(
  config: RebrandlyConfig,
  payload: CreateLinkPayload
): Promise<RebrandlyLinkResponse> {
  // Rebrandly API uses "slashtag" for the slug field
  const { slug, ...rest } = payload;
  return rebrandlyFetch("/links", config, {
    method: "POST",
    body: JSON.stringify({
      ...rest,
      ...(slug ? { slashtag: slug } : {}),
      domain: { fullName: config.domain },
    }),
  });
}

export async function rebrandlyGetLink(
  config: RebrandlyConfig,
  linkId: string
): Promise<RebrandlyLinkResponse> {
  return rebrandlyFetch(`/links/${linkId}`, config);
}

export async function rebrandlyDeleteLink(
  config: RebrandlyConfig,
  linkId: string
): Promise<void> {
  await rebrandlyFetch(`/links/${linkId}`, config, { method: "DELETE" });
}

export async function rebrandlyGetMetrics(
  config: RebrandlyConfig,
  linkId: string
): Promise<{ clicks: number }> {
  const data = await rebrandlyFetch(`/links/${linkId}`, config);
  return { clicks: data.clicks ?? 0 };
}

export async function rebrandlyTestConnection(
  config: RebrandlyConfig
): Promise<boolean> {
  try {
    await rebrandlyFetch("/account", config);
    return true;
  } catch {
    return false;
  }
}
