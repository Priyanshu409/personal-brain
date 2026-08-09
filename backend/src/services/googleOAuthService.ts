import { google } from "googleapis";
import { getGoogleConfig } from "../config/google";

export function createGoogleOAuthClient() {
  const config = getGoogleConfig();

  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );
}

export function generateGoogleAuthorizationUrl(state: string): string {
  const config = getGoogleConfig();
  const oauth2Client = createGoogleOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: config.scopes,
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createGoogleOAuthClient();

  const { tokens } = await oauth2Client.getToken(code);

  return tokens;
}