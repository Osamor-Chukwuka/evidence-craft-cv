import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/integrations/supabase/server";

function resolveNextUrl(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/dashboard";

  try {
    const target = new URL(next, url.origin);
    if (target.origin === url.origin) return target;
  } catch {
    // Fall through to the default dashboard redirect.
  }

  return new URL("/dashboard", url.origin);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const redirectTo = resolveNextUrl(request);

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }

  return NextResponse.redirect(new URL("/auth?confirmed=error", url.origin));
}
