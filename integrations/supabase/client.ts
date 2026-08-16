import { createBrowserClient } from "@supabase/ssr";

import { createSupabaseFetch } from "./fetch";
import type { Database } from "./types";

function readPublicEnv() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];

  if (!url || !key) {
    const missing = [
      ...(!url ? ["NEXT_PUBLIC_SUPABASE_URL"] : []),
      ...(!key ? ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}.`);
  }

  return { url, key };
}

function createSupabaseClient() {
  const { url, key } = readPublicEnv();
  return createBrowserClient<Database>(url, key, {
    global: {
      fetch: createSupabaseFetch(key),
    },
  });
}

let supabaseBrowserClient: ReturnType<typeof createSupabaseClient> | undefined;

export function getSupabaseBrowserClient() {
  if (!supabaseBrowserClient) supabaseBrowserClient = createSupabaseClient();
  return supabaseBrowserClient;
}

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    return Reflect.get(getSupabaseBrowserClient(), prop, receiver);
  },
});

