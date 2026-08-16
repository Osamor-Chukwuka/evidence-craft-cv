"use server";

import { z } from "zod";

import { requireUser } from "@/integrations/supabase/server";

export async function getGithubStatusAction() {
  const { userId } = await requireUser();
  const { getConnection } = await import("@/server/sync.server");
  const conn = await getConnection(userId);
  const clientId = process.env["GITHUB_CLIENT_ID"]?.trim();
  const clientSecret = process.env["GITHUB_CLIENT_SECRET"]?.trim();

  return {
    connected: Boolean(conn),
    login: conn?.github_login ?? null,
    name: conn?.github_name ?? null,
    avatarUrl: conn?.avatar_url ?? null,
    oauthAvailable: Boolean(clientId && clientSecret),
  };
}

export async function connectGithubTokenAction(input: unknown) {
  const data = z.object({ token: z.string().min(20) }).parse(input);
  const { userId } = await requireUser();
  const { saveConnection } = await import("@/server/sync.server");
  return saveConnection(userId, data.token.trim(), "pat");
}

export async function disconnectGithubAction() {
  const { userId } = await requireUser();
  const { removeConnection } = await import("@/server/sync.server");
  await removeConnection(userId);
  return { ok: true };
}

export async function importReposAction() {
  const { userId } = await requireUser();
  const { importRepositories } = await import("@/server/sync.server");
  return importRepositories(userId);
}

export async function syncContributionsAction(input: unknown) {
  const data = z.object({ from: z.string().min(10), to: z.string().min(10) }).parse(input);
  const { userId } = await requireUser();
  const { runSync } = await import("@/server/sync.server");
  return runSync(userId, data.from, data.to);
}

export async function startGithubOAuthAction(input: unknown) {
  const data = z.object({ origin: z.string().url() }).parse(input);
  const { userId } = await requireUser();
  const clientId = process.env["GITHUB_CLIENT_ID"]?.trim();

  if (!clientId) throw new Error("GitHub OAuth is not configured");

  const { signState } = await import("@/server/crypto.server");
  const state = signState(userId);
  const redirectUri = `${data.origin}/api/public/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent("read:user repo")}&state=${encodeURIComponent(state)}`;

  return { url };
}
