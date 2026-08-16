import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const back = `${url.origin}/repositories`;

  if (!code || !state) {
    return NextResponse.redirect(`${back}?github=error`);
  }

  try {
    const { verifyState } = await import("@/server/crypto.server");
    const { exchangeOAuthCode } = await import("@/server/github.server");
    const { saveConnection } = await import("@/server/sync.server");

    const userId = verifyState(state);
    const { accessToken, scope } = await exchangeOAuthCode(
      code,
      `${url.origin}/api/public/github/callback`,
    );
    await saveConnection(userId, accessToken, scope);
    return NextResponse.redirect(`${back}?github=connected`);
  } catch (error) {
    console.error("GitHub OAuth callback failed", error);
    return NextResponse.redirect(`${back}?github=error`);
  }
}
