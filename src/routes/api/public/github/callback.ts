import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/github/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const back = `${url.origin}/repositories`;

        if (!code || !state) {
          return Response.redirect(`${back}?github=error`, 302);
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
          return Response.redirect(`${back}?github=connected`, 302);
        } catch (error) {
          console.error("GitHub OAuth callback failed", error);
          return Response.redirect(`${back}?github=error`, 302);
        }
      },
    },
  },
});
