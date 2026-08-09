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

export async function getDriveFileContent(
  drive: drive_v3.Drive,
  file: drive_v3.Schema$File
): Promise<string> {
  if (!file.id) {
    return "";
  }

  const mimeType = file.mimeType ?? "";

  console.log("Drive enrichment:", {
    id: file.id,
    name: file.name,
    mimeType,
  });

  try {
    // Google Docs
    if (mimeType === "application/vnd.google-apps.document") {
      const response = await drive.files.export({
        fileId: file.id,
        mimeType: "text/plain",
      });

      const content =
        typeof response.data === "string"
          ? response.data
          : "";

      console.log("Google Docs export:", {
        length: content.length,
      });

      return content;
    }

    // Google Slides
    if (
      mimeType ===
      "application/vnd.google-apps.presentation"
    ) {
      const response = await drive.files.export({
        fileId: file.id,
        mimeType: "text/plain",
      });

      const content =
        typeof response.data === "string"
          ? response.data
          : "";

      console.log("Google Slides export:", {
        length: content.length,
      });

      return content;
    }

    // Google Sheets
    if (
      mimeType ===
      "application/vnd.google-apps.spreadsheet"
    ) {
      console.log("Attempting Google Sheets CSV export...");

      const response = await drive.files.export({
        fileId: file.id,
        mimeType: "text/csv",
      });

      const content =
        typeof response.data === "string"
          ? response.data
          : "";

      console.log("Google Sheets export:", {
        length: content.length,
        preview: content.slice(0, 300),
      });

      return content;
    }

    // Regular text files
    if (
      mimeType.startsWith("text/") ||
      mimeType === "application/json"
    ) {
      const response = await drive.files.get({
        fileId: file.id,
        alt: "media",
      });

      const content =
        typeof response.data === "string"
          ? response.data
          : "";

      console.log("Text file read:", {
        length: content.length,
      });

      return content;
    }

    console.log(
      "Unsupported Drive MIME type:",
      mimeType
    );

    return "";
  } catch (error: any) {
    console.error(
      "Drive content extraction failed:",
      {
        fileId: file.id,
        name: file.name,
        mimeType,
        code: error?.code,
        status: error?.response?.status,
        message: error?.message,
      }
    );

    return "";
  }
}