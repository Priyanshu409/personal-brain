import type { drive_v3 } from "googleapis";

export interface ParsedDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  content: string;
}

export function parseDriveMetadata(
  file: drive_v3.Schema$File,
  content = ""
): ParsedDriveFile {
  return {
    id: file.id ?? "",
    name: file.name ?? "(Unnamed file)",
    mimeType: file.mimeType ?? "application/octet-stream",
    webViewLink: file.webViewLink ?? undefined,
    createdTime: file.createdTime ?? undefined,
    modifiedTime: file.modifiedTime ?? undefined,
    content,
  };
}