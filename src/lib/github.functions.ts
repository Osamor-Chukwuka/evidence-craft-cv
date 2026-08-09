import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getGithubStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnection } = await import("@/server/sync.server");
    const conn = await getConnection(context.userId);
    return {
      connected: Boolean(conn),
      login: conn?.github_login ?? null,
      name: conn?.github_name ?? null,
      avatarUrl: conn?.avatar_url ?? null,
      oauthAvailable: Boolean(process.env["GITHUB_CLIENT_ID"] && process.env["GITHUB_CLIENT_SECRET"]),
    };
  });

export const connectGithubToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ token: z.string().min(20) }).parse(data))
  .handler(async ({ data, context }) => {
    const { saveConnection } = await import("@/server/sync.server");
    return saveConnection(context.userId, data.token.trim(), "pat");
  });

export const disconnectGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { removeConnection } = await import("@/server/sync.server");
    await removeConnection(context.userId);
    return { ok: true };
  });

export const importRepos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { importRepositories } = await import("@/server/sync.server");
    return importRepositories(context.userId);
  });

export const syncContributions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ from: z.string().min(10), to: z.string().min(10) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { runSync } = await import("@/server/sync.server");
    return runSync(context.userId, data.from, data.to);
  });

export const startGithubOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ origin: z.string().url() }).parse(data))
  .handler(async ({ data, context }) => {
    const clientId = process.env["GITHUB_CLIENT_ID"];
    if (!clientId) throw new Error("GitHub OAuth is not configured");
    const state = `${context.userId}.${crypto.randomUUID()}`;
    const redirectUri = `${data.origin}/api/public/github/callback`;
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent("read:user repo")}&state=${encodeURIComponent(state)}`;
    return { url };
  });
