import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { createSupabaseFetch } from "./fetch";
import type { Database } from "./types";

function readServerPublicEnv() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? process.env["SUPABASE_URL"];
  const key =
    process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["SUPABASE_PUBLISHABLE_KEY"];

  if (!url || !key) {
    const missing = [
      ...(!url ? ["NEXT_PUBLIC_SUPABASE_URL"] : []),
      ...(!key ? ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}.`);
  }

  return { url, key };
}

export async function createSupabaseServerClient() {
  const { url, key } = readServerPublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    global: {
      fetch: createSupabaseFetch(key),
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies; Proxy/actions can.
        }
      },
    },
  });
}

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    throw new Error("Unauthorized");
  }

  return {
    supabase,
    userId: data.claims.sub,
    claims: data.claims,
  };
}
