import type { BrainDocument } from "../types/brain";
import type { ParsedDriveFile } from "../utils/driveParser";

export function toBrainDocument(
  file: ParsedDriveFile
): BrainDocument {
  return {
    id: `drive:${file.id}`,

    source: "drive",

    title: file.name,

    content: [
      `File: ${file.name}`,
      `Type: ${file.mimeType}`,
      `Created: ${file.createdTime ?? "Unknown"}`,
      `Modified: ${file.modifiedTime ?? "Unknown"}`,
      "",
      file.content,
    ].join("\n"),

    url: file.webViewLink,

    createdAt: file.createdTime,

    updatedAt: file.modifiedTime,

    metadata: {
      fileId: file.id,
      mimeType: file.mimeType,
      name: file.name,
      webViewLink: file.webViewLink,
    },
  };
}