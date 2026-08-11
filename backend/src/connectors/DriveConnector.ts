import type { BrainDocument } from "../types/brain";
import type { PersonalDataConnector } from "./PersonalDataConnector";

import {
  createDriveClient,
  getDriveFileContent,
} from "../services/driveService";

import { parseDriveMetadata } from "../utils/driveParser";
import { toBrainDocument } from "./driveDocumentMapper";

/*
 * A single Drive list page tops out at 1000, but fetching
 * each file's content is a separate request, so cap total
 * files synced per run at a generous but finite number
 * instead of a single 50-file page (which silently ignored
 * the rest of the Drive).
 */
const MAX_DRIVE_SYNC_FILES = Number(
  process.env.DRIVE_SYNC_MAX_FILES ?? 1000
);

export class DriveConnector
  implements PersonalDataConnector
{
  getName(): string {
    return "drive";
  }

  async sync(): Promise<BrainDocument[]> {
    const drive = await createDriveClient();

    const documents: BrainDocument[] = [];

    let pageToken: string | undefined;

    do {
      const response =
        await drive.files.list({
          pageSize: 100,
          pageToken,

          q: [
            "trashed = false",
            "mimeType != 'application/vnd.google-apps.folder'",
          ].join(" and "),

          fields:
            "nextPageToken, files(id,name,mimeType,webViewLink,createdTime,modifiedTime)",
        });

      const files =
        response.data.files ?? [];

      for (const file of files) {
        if (!file.id) {
          continue;
        }

        if (
          documents.length >=
          MAX_DRIVE_SYNC_FILES
        ) {
          break;
        }

        const content =
          await getDriveFileContent(
            drive,
            file
          );

        // Skip files whose content
        // cannot currently be extracted.
        if (!content.trim()) {
          console.log(
            `Skipping Drive file: ${
              file.name ?? file.id
            }`
          );

          continue;
        }

        const parsed =
          parseDriveMetadata(
            file,
            content
          );

        documents.push(
          toBrainDocument(parsed)
        );
      }

      pageToken =
        response.data.nextPageToken ??
        undefined;
    } while (
      pageToken &&
      documents.length < MAX_DRIVE_SYNC_FILES
    );

    return documents;
  }

  async search(
    query: string
  ): Promise<BrainDocument[]> {
    const drive = await createDriveClient();

    const response =
      await drive.files.list({
        pageSize: 20,

        q: [
          "trashed = false",
          "mimeType != 'application/vnd.google-apps.folder'",
          `name contains '${escapeDriveQuery(
            query
          )}'`,
        ].join(" and "),

        fields:
          "files(id,name,mimeType,webViewLink,createdTime,modifiedTime)",
      });

    const files =
      response.data.files ?? [];

    const documents: BrainDocument[] = [];

    for (const file of files) {
      if (!file.id) {
        continue;
      }

      const content =
        await getDriveFileContent(
          drive,
          file
        );

      if (!content.trim()) {
        continue;
      }

      const parsed =
        parseDriveMetadata(
          file,
          content
        );

      documents.push(
        toBrainDocument(parsed)
      );
    }

    return documents;
  }
}

function escapeDriveQuery(
  value: string
): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}