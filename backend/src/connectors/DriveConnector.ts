import type { BrainDocument } from "../types/brain";
import type { PersonalDataConnector } from "./PersonalDataConnector";

import { createDriveClient } from "../services/driveService";
import { parseDriveMetadata } from "../utils/driveParser";
import { toBrainDocument } from "./driveDocumentMapper";

export class DriveConnector
  implements PersonalDataConnector
{
  getName(): string {
    return "drive";
  }

  async sync(): Promise<BrainDocument[]> {
    const drive = await createDriveClient();

    const response = await drive.files.list({
      pageSize: 50,
      q: "trashed = false",
      fields:
        "files(id,name,mimeType,webViewLink,createdTime,modifiedTime)",
    });

    const files = response.data.files ?? [];

    return files
      .filter((file) => file.id)
      .map((file) => {
        const parsed = parseDriveMetadata(file);
        return toBrainDocument(parsed);
      });
  }

  async search(
    query: string
  ): Promise<BrainDocument[]> {
    const drive = await createDriveClient();

    const response = await drive.files.list({
      pageSize: 20,

      q: [
        "trashed = false",
        `name contains '${escapeDriveQuery(query)}'`,
      ].join(" and "),

      fields:
        "files(id,name,mimeType,webViewLink,createdTime,modifiedTime)",
    });

    const files = response.data.files ?? [];

    return files
      .filter((file) => file.id)
      .map((file) => {
        const parsed = parseDriveMetadata(file);
        return toBrainDocument(parsed);
      });
  }
}

function escapeDriveQuery(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}