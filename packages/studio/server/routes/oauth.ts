// ---------------------------------------------------------------------------
// OAuth routes — Grok (xAI) one-click browser login.
// ---------------------------------------------------------------------------

import { Hono } from "hono";
import { startGrokLogin, getLoginState, logoutGrok, submitGrokCode } from "../oauth/grok";

export function createOAuthRouter(): Hono {
  const router = new Hono();

  // Start a Grok OAuth login — returns the authorize URL to open in a browser.
  router.post("/api/oauth/grok/start", async (c) => {
    try {
      const { authorizeUrl } = await startGrokLogin();
      return c.json({ authorizeUrl });
    } catch (e) {
      console.error("[oauth] grok start failed:", e);
      return c.json({ error: "OAuth login initiation failed, please check server logs" }, 500);
    }
  });

  // Poll the login state (pending → success / error). The loopback listener
  // updates this state in-memory when xAI redirects back with the code.
  router.get("/api/oauth/grok/status", (c) => {
    return c.json(getLoginState());
  });

  // Submit an authorization code manually — used when xAI's OAuth page
  // shows a code instead of redirecting back to the loopback listener.
  router.post("/api/oauth/grok/submit-code", async (c) => {
    try {
      const { code } = await c.req.json<{ code: string }>();
      if (!code) return c.json({ error: "Missing code parameter" }, 400);
      await submitGrokCode(code);
      return c.json({ success: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return c.json({ error: msg }, 500);
    }
  });

  // Log out of Grok — clears stored OAuth tokens.
  router.post("/api/oauth/grok/logout", async (c) => {
    try {
      await logoutGrok();
      return c.json({ success: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[oauth] logout failed:", e);
      return c.json({ error: msg }, 500);
    }
  });

  return router;
}
