import { APP_CONFIG } from "@/config/constants";

export async function request<T>(path: string, options: RequestInit): Promise<T> {
  const res = await fetch(`${APP_CONFIG.API_BASE}${path}`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Backend error ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}