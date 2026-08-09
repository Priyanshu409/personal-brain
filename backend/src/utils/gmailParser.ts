import type { gmail_v1 } from "googleapis";

function decodeBase64Url(data?: string): string {
  if (!data) {
    return "";
  }

  const normalized = data
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  return Buffer.from(normalized, "base64").toString("utf-8");
}

function findHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string | undefined {
  return headers?.find(
    (header) =>
      header.name?.toLowerCase() === name.toLowerCase()
  )?.value ?? undefined;
}

function extractBody(
  payload?: gmail_v1.Schema$MessagePart
): string {
  if (!payload) {
    return "";
  }

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const result = extractBody(part);

      if (result) {
        return result;
      }
    }
  }

  return "";
}

export interface ParsedGmailMessage {
  id: string;
  threadId?: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
}

export function parseGmailMessage(
  message: gmail_v1.Schema$Message
): ParsedGmailMessage {
  const headers = message.payload?.headers;

  return {
    id: message.id ?? "",
    threadId: message.threadId ?? undefined,

    subject:
      findHeader(headers, "Subject") ??
      "(No subject)",

    from:
      findHeader(headers, "From") ??
      "(Unknown sender)",

    to:
      findHeader(headers, "To") ??
      "",

    date:
      findHeader(headers, "Date") ??
      "",

    body: extractBody(message.payload),
  };
}