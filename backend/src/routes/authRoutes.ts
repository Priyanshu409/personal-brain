import { Hono } from "hono";
import {
  deleteCookie,
  getCookie,
  setCookie,
} from "hono/cookie";

import {
  exchangeCodeForTokens,
  generateGoogleAuthorizationUrl,
} from "../services/googleOAuthService";

import { saveGoogleTokens } from "../services/googleTokenStore";

import { generateOAuthState } from "../utils/oauthState";

const authRoutes = new Hono();

authRoutes.get("/google", (c) => {
  const state = generateOAuthState();

  setCookie(c, "oauth_state", state, {
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });

  const authorizationUrl =
    generateGoogleAuthorizationUrl(state);

  return c.redirect(authorizationUrl);
});

authRoutes.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");

  if (error) {
    return c.json(
      {
        error: "Google authorization was denied",
        details: error,
      },
      400
    );
  }

  if (!code || !state) {
    return c.json(
      {
        error: "Missing OAuth callback parameters",
      },
      400
    );
  }

  const storedState = getCookie(c, "oauth_state");

  if (!storedState || storedState !== state) {
    return c.json(
      {
        error: "Invalid OAuth state",
      },
      400
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    await saveGoogleTokens(tokens);

    deleteCookie(c, "oauth_state", {
      path: "/",
    });

    return c.json({
      success: true,
      message: "Google account connected successfully",
    });
  } catch (error) {
    console.error("Google OAuth token exchange failed:", error);

    return c.json(
      {
        error: "Failed to complete Google authorization",
      },
      500
    );
  }
});

export default authRoutes;