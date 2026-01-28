import { cookies } from "next/headers";

type TokenPayload = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
};

const tokenUrl =
  process.env.EXTERNAL_AUTH_TOKEN_URL ||
  "https://api-dev-pg.altech.hk/uaa/oauth2/token";
const basic = process.env.EXTERNAL_AUTH_BASIC;
const accessTokenCookie = "external_access_token";
const refreshTokenCookie = "external_refresh_token";
const expiresAtCookie = "external_token_expires_at";
const issuedAtCookie = "external_token_issued_at";

const cookieMaxAge = 60 * 60 * 24 * 7;

let cachedToken: string | null = null;
let cachedRefresh: string | null = null;
let expiresAt = 0;
let issuedAt = 0;

const bufferMs = 60_000;

const formatBasic = () => {
  if (!basic) return null;
  return basic.startsWith("Basic ") ? basic : `Basic ${basic}`;
};

const requestToken = async (
  params: URLSearchParams
): Promise<TokenPayload | null> => {
  const authHeader = formatBasic();
  if (!authHeader) return null;
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data?.accessToken) return null;
  return {
    accessToken: json.data.accessToken,
    refreshToken: json.data.refreshToken,
    expiresIn: Number(json.data.expiresIn || 0),
  };
};

const persistCookies = () => {
  try {
    const store = cookies();
    if (cachedToken) {
      store.set(accessTokenCookie, cachedToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: cookieMaxAge,
        path: "/",
      });
    }
    if (cachedRefresh) {
      store.set(refreshTokenCookie, cachedRefresh, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: cookieMaxAge,
        path: "/",
      });
    }
    if (expiresAt) {
      store.set(expiresAtCookie, String(expiresAt), {
        httpOnly: true,
        sameSite: "lax",
        maxAge: cookieMaxAge,
        path: "/",
      });
    }
    if (issuedAt) {
      store.set(issuedAtCookie, String(issuedAt), {
        httpOnly: true,
        sameSite: "lax",
        maxAge: cookieMaxAge,
        path: "/",
      });
    }
  } catch {
    // ignore if cookies() is not available
  }
};

const applyToken = (payload: TokenPayload) => {
  cachedToken = payload.accessToken;
  if (payload.refreshToken) cachedRefresh = payload.refreshToken;
  const ttl = Number(payload.expiresIn || 0);
  const now = Date.now();
  expiresAt = ttl > 0 ? now + ttl * 1000 : now + 10 * 60 * 1000;
  issuedAt = now;
  persistCookies();
};

const hydrateFromCookies = () => {
  try {
    const store = cookies();
    const token = store.get(accessTokenCookie)?.value;
    const refresh = store.get(refreshTokenCookie)?.value;
    const exp = store.get(expiresAtCookie)?.value;
    const issued = store.get(issuedAtCookie)?.value;
    if (!token && !refresh) {
      cachedToken = null;
      cachedRefresh = null;
      expiresAt = 0;
      issuedAt = 0;
      return;
    }
    if (token && token !== cachedToken) cachedToken = token;
    if (refresh && refresh !== cachedRefresh) cachedRefresh = refresh;
    if (exp) {
      const parsed = Number(exp);
      if (!Number.isNaN(parsed)) expiresAt = parsed;
    }
    if (issued) {
      const parsed = Number(issued);
      if (!Number.isNaN(parsed)) issuedAt = parsed;
    }
  } catch {
    // ignore if cookies() is not available
  }
};

const refreshToken = async () => {
  if (!cachedRefresh) return false;
  const params = new URLSearchParams();
  params.set("grant_type", "refresh_token");
  params.set("refresh_token", cachedRefresh);
  const payload = await requestToken(params);
  if (!payload) return false;
  applyToken(payload);
  return true;
};

export const getAccessToken = async () => {
  hydrateFromCookies();
  if (cachedToken && expiresAt && Date.now() < expiresAt - bufferMs)
    return cachedToken;
  if (expiresAt === 0 && !cachedToken && cachedRefresh) {
    if (await refreshToken()) return cachedToken;
  } else if (Date.now() >= expiresAt - bufferMs && cachedRefresh) {
    if (await refreshToken()) return cachedToken;
  }
  return cachedToken;
};

export const getAuthHeader = async () => {
  const token = await getAccessToken();
  return token ? `Bearer ${token}` : null;
};

export const getAccessTokenState = async () => {
  hydrateFromCookies();
  if (cachedToken && expiresAt && Date.now() < expiresAt - bufferMs) {
    return {
      accessToken: cachedToken,
      refreshToken: cachedRefresh,
      expiresAt,
      issuedAt,
    };
  }
  if (cachedRefresh && (expiresAt === 0 || Date.now() >= expiresAt - bufferMs)) {
    if (await refreshToken()) {
      return {
        accessToken: cachedToken,
        refreshToken: cachedRefresh,
        expiresAt,
        issuedAt,
      };
    }
  }
  return { accessToken: null, refreshToken: cachedRefresh, expiresAt, issuedAt };
};
