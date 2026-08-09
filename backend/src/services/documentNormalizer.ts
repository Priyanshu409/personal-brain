import type { BrainDocument } from "../types/brain";

export interface RawGmailMessage {
  id: string;
  threadId?: string;
  subject?: string;
  from?: string;
  to?: string;
  body?: string;
  date?: string;
}

export interface RawDriveFile {
  id: string;
  name?: string;
  mimeType?: string;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  text?: string;
}

export function normalizeGmailMessage(
  message: RawGmailMessage
): BrainDocument {
  return {
    id: `gmail:${message.id}`,
    source: "gmail",

    title: message.subject || "(No subject)",

    content: [
      `From: ${message.from ?? ""}`,
      `To: ${message.to ?? ""}`,
      `Subject: ${message.subject ?? ""}`,
      "",
      message.body ?? "",
    ].join("\n"),

    metadata: {
      gmailMessageId: message.id,
      threadId: message.threadId,
      from: message.from,
      to: message.to,
    },

    updatedAt: message.date,
  };
}

export function normalizeDriveFile(
  file: RawDriveFile
): BrainDocument {
  return {
    id: `drive:${file.id}`,
    source: "drive",

    title: file.name || "(Untitled)",

    content: file.text ?? "",

    url: file.webViewLink,

    mimeType: file.mimeType,

    createdAt: file.createdTime,
    updatedAt: file.modifiedTime,

    metadata: {
      driveFileId: file.id,
      mimeType: file.mimeType,
    },
  };
}