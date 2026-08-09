import { google, drive_v3 } from "googleapis";

import { createGoogleOAuthClient } from "./googleOAuthService";
import { getGoogleTokens } from "./googleTokenStore";

export async function createDriveClient(): Promise<drive_v3.Drive> {
  const tokens = await getGoogleTokens();

  if (!tokens) {
    throw new Error(
      "Google account is not connected. Please authorize Google first."
    );
  }

  const auth = createGoogleOAuthClient();

  auth.setCredentials(tokens);

  return google.drive({
    version: "v3",
    auth,
  });
}