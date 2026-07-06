// ---------------------------------------------------------------------------
// Grok (xAI) SuperGrok OAuth login — loopback PKCE flow.
//
// Browser-based OAuth 2.0 Authorization Code + PKCE, mirroring the flow used
// by xAI clients (same configuration verified working in the Hermes Agent).
// The local Studio server starts a temporary loopback HTTP listener; the
// user's browser hits auth.x.ai, approves, and xAI redirects back to the
// loopback with an authorization code, which we exchange for access + refresh
// tokens and persist to settings.
//
// References: xAI auth server is https://auth.x.ai; tokens come from
// https://auth.x.ai/oauth2/token; client_id "b1a00492-073a-47ea-816f-4c329264a828".
// redirect_uri MUST use 127.0.0.1 (not localhost) per xAI's registered client.
// ---------------------------------------------------------------------------

import { createServer, type Server } from "node:http";
import { randomBytes, createHash } from "node:crypto";
import { providerRegistry } from "@tavernos/core";
import { type ProviderCredential, withSettingsLock } from "../context";

/** Outcome of a login attempt, polled by the UI. */
interface LoginState {
  status: "idle" | "pending" | "success" | "error";
  message?: string;
}

const GROK_SERVICE = "grok";

// Singleton in-memory state for the in-flight login.
let loginState: LoginState = { status: "idle" };
let pendingServer: Server | null = null;
let expiryTimer: NodeJS.Timeout | null = null;

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

/** Base64-URL encode a buffer without padding (RFC 7636). */
function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Generate a cryptographically random code_verifier (43-128 chars). */
function generateVerifier(): string {
  return base64url(randomBytes(32));
}

/** Derive the S256 code_challenge from a code_verifier. */
function challengeFromVerifier(verifier: string): string {
  return base64url(createHash("sha256").update(verifier).digest());
}

/** Generate a random opaque state string for CSRF protection. */
function generateState(): string {
  return base64url(randomBytes(16));
}

/** Generate a random nonce for OpenID Connect replay protection. */
function generateNonce(): string {
  return base64url(randomBytes(16));
}

// ---------------------------------------------------------------------------
// State accessors
// ---------------------------------------------------------------------------

/** Read the current login state (for the UI status poll). */
export function getLoginState(): LoginState {
  return loginState;
}

/** Reset login state to idle (e.g. before starting a new login). */
function resetState(): void {
  loginState = { status: "idle" };
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

/** Exchange an authorization code for access + refresh tokens. */
async function exchangeCodeForToken(params: {
  code: string;
  redirectUri: string;
  verifier: string;
}): Promise<TokenResponse> {
  const cfg = providerRegistry.get(GROK_SERVICE)?.oauth;
  const tokenEndpoint = cfg?.tokenEndpoint ?? "https://auth.x.ai/oauth2/token";
  const clientId = cfg?.clientId ?? "b1a00492-073a-47ea-816f-4c329264a828";

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: clientId,
    code_verifier: params.verifier,
  });

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15000),
  });
  return (await res.json()) as TokenResponse;
}

/** Persist the obtained tokens into settings.json under providerCredentials.grok. */
async function persistTokens(tok: TokenResponse): Promise<void> {
  // Atomic read-merge-write under the settings mutex.
  await withSettingsLock(async (lock) => {
    const settings = await lock.load();
    const creds = { ...(settings.providerCredentials ?? {}) };
    const prev = creds[GROK_SERVICE] ?? {};
    const next: ProviderCredential = {
      ...prev,
      oauthToken: tok.access_token,
      refreshToken: tok.refresh_token ?? prev.refreshToken,
      expiresAt: tok.expires_in ? Date.now() + tok.expires_in * 1000 : undefined,
    };
    creds[GROK_SERVICE] = next;
    await lock.write({ ...settings, providerCredentials: creds });
  });
}

// ---------------------------------------------------------------------------
// Loopback callback server
// ---------------------------------------------------------------------------

/** Start the temporary loopback HTTP listener that receives the OAuth callback. */
function startLoopbackListener(port: number, verifier: string, state: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const redirectUri = `http://127.0.0.1:${port}/callback`;
    const server = createServer(async (req, res) => {
      const url = new URL(req.url ?? "", `http://127.0.0.1:${port}`);
      if (url.pathname !== "/callback") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
      }

      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");
      const err = url.searchParams.get("error");

      // Render a simple HTML page that tells the user to return to the app.
      const renderPage = (title: string, body: string) => {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#141414;color:#E8E8E8}
.box{text-align:center;padding:2rem}h1{font-weight:300;color:#C9A86C}a{color:#C9A86C}</style>
</head><body><div class="box"><h1>${title}</h1><p>${body}</p>
<p style="color:#666;font-size:.85em;margin-top:2rem">TavernOS · Grok OAuth</p></div></body></html>`);
      };

      if (err) {
        loginState = { status: "error", message: `xAI 返回错误: ${err}` };
        renderPage("登录失败", `xAI 拒绝了授权：${err}`);
        cleanup();
        return;
      }

      if (!code) {
        loginState = { status: "error", message: "回调缺少授权码" };
        renderPage("登录失败", "未收到授权码。");
        cleanup();
        return;
      }

      // CSRF: validate state.
      if (returnedState !== state) {
        loginState = { status: "error", message: "state 校验失败（可能的 CSRF）" };
        renderPage("登录失败", "state 不匹配，请重试。");
        cleanup();
        return;
      }

      // Exchange the code for tokens.
      try {
        const tok = await exchangeCodeForToken({ code, redirectUri, verifier });
        if (!tok.access_token) {
          loginState = {
            status: "error",
            message: tok.error_description ?? tok.error ?? "未返回 access_token",
          };
          renderPage("登录失败", "无法换取令牌：" + (loginState.message ?? ""));
          cleanup();
          return;
        }
        await persistTokens(tok);
        loginState = { status: "success", message: "Grok 登录成功" };
        renderPage("登录成功", "已连接 Grok，可以关闭此页面返回 TavernOS。");
      } catch (e) {
        loginState = {
          status: "error",
          message: e instanceof Error ? e.message : String(e),
        };
        renderPage("登录失败", "换取令牌时出错：" + loginState.message);
      }
      cleanup();
    });

    server.on("error", (e) => {
      loginState = { status: "error", message: `本地回调服务启动失败: ${e.message}` };
      pendingServer = null;
      reject(e);
    });

    server.listen(port, "127.0.0.1", () => {
      pendingServer = server;
      resolve();
    });
  });
}

/** Tear down the loopback listener and clear the expiry timer. */
function cleanup(): void {
  if (pendingServer) {
    pendingServer.close();
    pendingServer = null;
  }
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
  pendingVerifier = null;
  pendingRedirectUri = null;
}

// ---------------------------------------------------------------------------
// Public entry: start a login
// ---------------------------------------------------------------------------

/**
 * Start the Grok OAuth login flow. Generates PKCE + state, opens the loopback
 * listener, and returns the authorize URL the browser should navigate to.
 *
 * The caller (route handler) returns this URL to the frontend, which opens it
 * in a new tab. The user approves in the browser; xAI redirects to the
 * loopback listener which exchanges the code and persists the tokens.
 */
export async function startGrokLogin(): Promise<{ authorizeUrl: string }> {
  // Cancel any in-flight login first.
  cleanup();
  resetState();

  const cfg = providerRegistry.get(GROK_SERVICE);
  const oauth = cfg?.oauth;
  if (!oauth?.authorizeUrl) {
    throw new Error("Grok OAuth 未配置 authorizeUrl");
  }
  const port = oauth.loopbackPort ?? 56121;
  const clientId = oauth.clientId ?? "b1a00492-073a-47ea-816f-4c329264a828";
  const scope = oauth.scope ?? "openid profile email offline_access grok-cli:access api:access";
  const redirectUri = `http://127.0.0.1:${port}/callback`;

  const verifier = generateVerifier();
  const challenge = challengeFromVerifier(verifier);
  const state = generateState();
  const nonce = generateNonce();

  // Start the loopback listener before constructing the URL.
  await startLoopbackListener(port, verifier, state);

  // Save PKCE params for manual code submission fallback.
  pendingVerifier = verifier;
  pendingRedirectUri = redirectUri;

  // Auto-expire the login after 180s (matches Hermes default).
  expiryTimer = setTimeout(() => {
    if (loginState.status === "pending") {
      loginState = { status: "error", message: "登录超时（180s），请重试" };
    }
    cleanup();
  }, 180_000);

  loginState = { status: "pending", message: "等待浏览器授权…" };

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    nonce,
    scope,
  });

  return { authorizeUrl: `${oauth.authorizeUrl}?${params.toString()}` };
}

// ---------------------------------------------------------------------------
// Manual code submission (fallback when xAI shows a code instead of redirecting)
// ---------------------------------------------------------------------------

/** Pending PKCE verifier + redirect URI from the in-flight login. */
let pendingVerifier: string | null = null;
let pendingRedirectUri: string | null = null;

/**
 * Submit an authorization code manually. Used when xAI's OAuth page shows
 * a code instead of redirecting back to the loopback listener.
 *
 * The code shown on xAI's page IS the authorization code. We exchange it
 * using the same PKCE verifier from the startGrokLogin call.
 */
export async function submitGrokCode(code: string): Promise<void> {
  if (!pendingVerifier || !pendingRedirectUri) {
    throw new Error("没有正在进行的登录会话，请先点击「一键网页登录」");
  }

  const trimmed = code.trim();
  if (!trimmed) {
    throw new Error("代码不能为空");
  }

  try {
    const tok = await exchangeCodeForToken({
      code: trimmed,
      redirectUri: pendingRedirectUri,
      verifier: pendingVerifier,
    });
    if (!tok.access_token) {
      throw new Error(tok.error_description ?? tok.error ?? "未返回 access_token");
    }
    await persistTokens(tok);
    loginState = { status: "success", message: "Grok 登录成功" };
  } catch (e) {
    loginState = {
      status: "error",
      message: e instanceof Error ? e.message : String(e),
    };
    throw e;
  } finally {
    cleanup();
  }
}

/** Clear all stored Grok OAuth credentials (logout). */
export async function logoutGrok(): Promise<void> {
  cleanup();
  // Atomic read-merge-write under the settings mutex.
  await withSettingsLock(async (lock) => {
    const settings = await lock.load();
    const creds = { ...(settings.providerCredentials ?? {}) };
    delete creds[GROK_SERVICE];
    await lock.write({ ...settings, providerCredentials: creds });
  });
  loginState = { status: "idle" };
}
