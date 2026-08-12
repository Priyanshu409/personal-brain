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

function extractPlainTextBody(
  payload?: gmail_v1.Schema$MessagePart
): string {
  if (!payload) {
    return "";
  }

  if (
    payload.body?.data &&
    (payload.mimeType ?? "") === "text/plain"
  ) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const result = extractPlainTextBody(part);

      if (result) {
        return result;
      }
    }
  }

  return "";
}

function extractAnyBody(
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
      const result = extractAnyBody(part);

      if (result) {
        return result;
      }
    }
  }

  return "";
}

/**
 * Prefer text/plain content (matches gmailService's
 * query-time enrichment) so ingested/embedded content
 * doesn't diverge from what's shown when a result is
 * enriched. Falls back to any available body.
 */
function extractBody(
  payload?: gmail_v1.Schema$MessagePart
): string {
  return (
    extractPlainTextBody(payload) ||
    extractAnyBody(payload)
  );
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
      findHeader(headers, "Subject")?.trim() ||
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