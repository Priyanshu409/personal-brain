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

function decodeBase64Url(data: string): string {
  return Buffer.from(
    data.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  ).toString("utf8");
}

function extractTextFromPayload(
  payload?: gmail_v1.Schema$MessagePart
): string {
  if (!payload) {
    return "";
  }

  // Direct plain-text body
  if (payload.body?.data) {
    const mimeType = payload.mimeType ?? "";

    if (mimeType === "text/plain") {
      return decodeBase64Url(payload.body.data);
    }
  }

  // Multipart email
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractTextFromPayload(part);

      if (text.trim()) {
        return text;
      }
    }
  }

  return "";
}

export async function getGmailMessageContent(
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<string> {
  try {
    const response = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const message = response.data;

    const text = extractTextFromPayload(message.payload);

    if (text.trim()) {
      return text;
    }

    // Fallback when no text/plain body is available
    if (message.snippet) {
      return message.snippet;
    }

    return "";
  } catch (error) {
    console.warn(
      `Skipping unreadable Gmail message: ${messageId}`,
      error
    );

    return "";
  }
}