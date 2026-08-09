import { decryptToken, encryptToken } from "./crypto.server";
import {
  getCommitStats,
  getViewer,
  listAllRepos,
  listCommits,
  listMergedPulls,
} from "./github.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function saveConnection(userId: string, token: string, scope = "") {
  const viewer = await getViewer(token);
  const db = await admin();
  const { error } = await db.from("github_connections").upsert(
    {
      user_id: userId,
      github_login: viewer.login,
      github_name: viewer.name,
      avatar_url: viewer.avatar_url,
      token_ciphertext: encryptToken(token),
      scopes: scope,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
  return { login: viewer.login, name: viewer.name, avatarUrl: viewer.avatar_url };
}

export async function getConnection(userId: string) {
  const db = await admin();
  const { data, error } = await db
    .from("github_connections")
    .select("github_login, github_name, avatar_url, token_ciphertext, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function requireToken(userId: string) {
  const conn = await getConnection(userId);
  if (!conn) throw new Error("GitHub is not connected yet.");
  return { token: decryptToken(conn.token_ciphertext), login: conn.github_login };
}

export async function removeConnection(userId: string) {
  const db = await admin();
  const { error } = await db.from("github_connections").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function importRepositories(userId: string) {
  const { token } = await requireToken(userId);
  const repos = await listAllRepos(token);
  const db = await admin();
  const rows = repos.map((r) => ({
    user_id: userId,
    github_id: r.id,
    full_name: r.full_name,
    name: r.name,
    description: r.description,
    primary_language: r.language,
    is_private: r.private,
    is_fork: r.fork,
    stars: r.stargazers_count,
    pushed_at: r.pushed_at,
  }));
  if (rows.length) {
    const { error } = await db
      .from("repositories")
      .upsert(rows, { onConflict: "user_id,github_id", ignoreDuplicates: false });
    if (error) throw new Error(error.message);
  }
  return { imported: rows.length };
}

export async function runSync(userId: string, from: string, to: string) {
  const { token, login } = await requireToken(userId);
  const db = await admin();

  const { data: repos, error: repoError } = await db
    .from("repositories")
    .select("id, full_name")
    .eq("user_id", userId)
    .eq("selected", true);
  if (repoError) throw new Error(repoError.message);
  if (!repos?.length) throw new Error("Select at least one repository before syncing.");

  const { data: run } = await db
    .from("sync_runs")
    .insert({
      user_id: userId,
      period_start: from,
      period_end: to,
      repos_count: repos.length,
      status: "running",
    })
    .select("id")
    .single();

  const since = new Date(from).toISOString();
  const until = new Date(`${to}T23:59:59Z`).toISOString();
  let commitCount = 0;
  let prCount = 0;

  try {
    for (const repo of repos) {
      const commits = await listCommits(token, repo.full_name, login, since, until);
      const detailed = commits.slice(0, 60);
      const rows = [];
      for (const commit of detailed) {
        let stats = { additions: 0, deletions: 0, files: 0, filenames: [] as string[] };
        try {
          stats = await getCommitStats(token, repo.full_name, commit.sha);
        } catch {
          /* stats are best effort */
        }
        rows.push({
          user_id: userId,
          repository_id: repo.id,
          kind: "commit" as const,
          external_id: commit.sha,
          title: commit.message.split("\n")[0].slice(0, 300),
          body: [commit.message, stats.filenames.join(", ")].filter(Boolean).join("\n\nFiles: "),
          url: commit.url,
          files_changed: stats.files,
          additions: stats.additions,
          deletions: stats.deletions,
          occurred_at: commit.date,
        });
      }
      if (rows.length) {
        const { error } = await db
          .from("contributions")
          .upsert(rows, { onConflict: "user_id,repository_id,kind,external_id" });
        if (error) throw new Error(error.message);
        commitCount += rows.length;
      }

      const pulls = await listMergedPulls(token, repo.full_name, login, since, until);
      const prRows = pulls.map((pr) => ({
        user_id: userId,
        repository_id: repo.id,
        kind: "pull_request" as const,
        external_id: String(pr.number),
        title: pr.title.slice(0, 300),
        body: pr.body?.slice(0, 4000) ?? null,
        url: pr.url,
        files_changed: pr.changedFiles,
        additions: pr.additions,
        deletions: pr.deletions,
        occurred_at: pr.mergedAt,
      }));
      if (prRows.length) {
        const { error } = await db
          .from("contributions")
          .upsert(prRows, { onConflict: "user_id,repository_id,kind,external_id" });
        if (error) throw new Error(error.message);
        prCount += prRows.length;
      }

      await db
        .from("repositories")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", repo.id);
    }

    if (run) {
      await db
        .from("sync_runs")
        .update({ status: "completed", commits_count: commitCount, prs_count: prCount })
        .eq("id", run.id);
    }
    return { commits: commitCount, pullRequests: prCount, repos: repos.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    if (run) {
      await db.from("sync_runs").update({ status: "failed", error: message }).eq("id", run.id);
    }
    throw new Error(message);
  }
}
