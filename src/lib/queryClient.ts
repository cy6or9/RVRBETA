// src/lib/queryClient.ts
"use client";

import {
  QueryClient,
  type QueryKey,
  type QueryFunctionContext,
} from "@tanstack/react-query";

async function throwIfResNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
}

/** NEVER return a Promise from an effect */
async function apiFetch<T = unknown>(
  key: QueryKey,
  unauthorizedBehavior: "throw" | "returnNull" = "throw"
): Promise<T | null> {
  const url = Array.isArray(key) ? key[0] : key;
  const res = await fetch(url.toString(), { credentials: "include" });

  if (unauthorizedBehavior === "returnNull" && res.status === 401) {
    return null; // <-- FIXED, not undefined
  }

  await throwIfResNotOk(res);
  return (await res.json()) as T;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 2,
      // 🚀 FIX: return a function, NOT a Promise
      queryFn: async ({ queryKey }: QueryFunctionContext) =>
        await apiFetch(queryKey),
    },
  },
});

export function fetchQuery<T = unknown>(
  key: QueryKey,
  unauthorizedBehavior?: "throw" | "returnNull"
): Promise<T | null> {
  return apiFetch<T>(key, unauthorizedBehavior);
}
