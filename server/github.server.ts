const GH = "https://api.github.com";

export type GithubUser = {
  login: string;
  name: string | null;
  avatar_url: string;
};

export type GithubRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  private: boolean;
  fork: boolean;
  stargazers_count: number;
  pushed_at: string | null;
};

async function gh<T>(token: string, path: string): Promise<T> {
  const res = await fetch(path.startsWith("http") ? path : `${GH}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "commit-cv-app",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    const error = new Error(
      `GitHub request failed [${res.status}] ${path}: ${body.slice(0, 400)}`,
    ) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return (await res.json()) as T;
}

/** 409 = empty repository, 404/403 = no access. None of these are real failures. */
function isSkippableRepoError(error: unknown) {
  const status = (error as { status?: number } | null)?.status;
  return status === 409 || status === 404 || status === 403 || status === 451;
}

export function getViewer(token: string) {
  return gh<GithubUser>(token, "/user");
}

export async function listAllRepos(token: string): Promise<GithubRepo[]> {
  const out: GithubRepo[] = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await gh<GithubRepo[]>(
      token,
      `/user/repos?per_page=100&page=${page}&sort=pushed&affiliation=owner,collaborator,organization_member`,
    );
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

export type CommitSummary = {
  sha: string;
  message: string;
  url: string;
  date: string;
};

export async function listCommits(
  token: string,
  fullName: string,
  author: string,
  since: string,
  until: string,
  maxPages = 3,
): Promise<CommitSummary[]> {
  const out: CommitSummary[] = [];
  for (let page = 1; page <= maxPages; page++) {
    let batch: Array<{
      sha: string;
      html_url: string;
      commit: { message: string; author: { date: string } | null };
    }> = [];
    try {
      batch = await gh<typeof batch>(
        token,
        `/repos/${fullName}/commits?author=${encodeURIComponent(author)}&since=${since}&until=${until}&per_page=100&page=${page}`,
      );
    } catch (error) {
      if (isSkippableRepoError(error)) return out;
      throw error;
    }
    out.push(
      ...batch.map((c) => ({
        sha: c.sha,
        message: c.commit.message,
        url: c.html_url,
        date: c.commit.author?.date ?? until,
      })),
    );
    if (batch.length < 100) break;
  }
  return out;
}

export async function getCommitStats(token: string, fullName: string, sha: string) {
  const data = await gh<{
    stats?: { additions: number; deletions: number };
    files?: Array<{ filename: string }>;
  }>(token, `/repos/${fullName}/commits/${sha}`);
  return {
    additions: data.stats?.additions ?? 0,
    deletions: data.stats?.deletions ?? 0,
    files: data.files?.length ?? 0,
    filenames: (data.files ?? []).slice(0, 15).map((f) => f.filename),
  };
}

export type PullSummary = {
  number: number;
  title: string;
  body: string | null;
  url: string;
  mergedAt: string;
  additions: number;
  deletions: number;
  changedFiles: number;
};

export async function listMergedPulls(
  token: string,
  fullName: string,
  author: string,
  since: string,
  until: string,
): Promise<PullSummary[]> {
  const q = `repo:${fullName}+type:pr+author:${author}+merged:${since.slice(0, 10)}..${until.slice(0, 10)}`;
  let search: { items: Array<{ number: number }> } = { items: [] };
  try {
    search = await gh<{ items: Array<{ number: number }> }>(
      token,
      `/search/issues?q=${q}&per_page=50`,
    );
  } catch (error) {
    if (isSkippableRepoError(error)) return [];
    throw error;
  }
  const results: PullSummary[] = [];
  for (const item of search.items.slice(0, 30)) {
    try {
      const pr = await gh<{
        number: number;
        title: string;
        body: string | null;
        html_url: string;
        merged_at: string | null;
        additions: number;
        deletions: number;
        changed_files: number;
      }>(token, `/repos/${fullName}/pulls/${item.number}`);
      if (!pr.merged_at) continue;
      results.push({
        number: pr.number,
        title: pr.title,
        body: pr.body,
        url: pr.html_url,
        mergedAt: pr.merged_at,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changed_files,
      });
    } catch {
      // skip individual PR failures
    }
  }
  return results;
}

export async function exchangeOAuthCode(code: string, redirectUri: string) {
  const clientId = process.env["GITHUB_CLIENT_ID"];
  const clientSecret = process.env["GITHUB_CLIENT_SECRET"];
  if (!clientId || !clientSecret) throw new Error("GitHub OAuth is not configured");
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    scope?: string;
    error_description?: string;
  };
  if (!data.access_token) {
    throw new Error(data.error_description ?? "GitHub did not return an access token");
  }
  return { accessToken: data.access_token, scope: data.scope ?? "" };
}
