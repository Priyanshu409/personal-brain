import { google, gmail_v1 } from "googleapis";

import { createGoogleOAuthClient } from "./googleOAuthService";
import { getGoogleTokens } from "./googleTokenStore";

export async function createGmailClient(): Promise<gmail_v1.Gmail> {
  const tokens = await getGoogleTokens();

  if (!tokens) {
    throw new Error(
      "Google account is not connected. Please authorize Google first."
    );
  }

  const auth = createGoogleOAuthClient();

  auth.setCredentials(tokens);

  return google.gmail({
    version: "v1",
    auth,
  });
}