import { spawn } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type {
  BrainDocument,
  BrainSearchResult,
} from "../types/brain";

import {
  createGmailClient,
  getGmailMessageContent,
} from "./gmailService";

import {
  createDriveClient,
  getDriveFileContent,
} from "./driveService";

export class GBrainService {
  private readonly gbrainCommand = "gbrain";

  /**
   * Execute a GBrain CLI command.
   */
  private run(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(
        this.gbrainCommand,
        args,
        {
          shell: false,
          windowsHide: true,
          env: {
            ...process.env,
          },
        }
      );

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("error", (error) => {
        reject(error);
      });

      child.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `GBrain command failed (${code}): ${
                stderr || stdout
              }`
            )
          );
          return;
        }

        resolve(stdout.trim());
      });
    });
}

  /**
   * Search the local GBrain and enrich
   * Gmail/Drive results with their real content.
   */
  async search(
    query: string
  ): Promise<{
    query: string;
    count: number;
    results: BrainSearchResult[];
  }> {
    if (!query.trim()) {
      throw new Error("Search query is required");
    }

    const raw = await this.run([
      "search",
      query,
    ]);

    const results = this.parseResults(raw);

    const gmail = await createGmailClient();
    const drive = await createDriveClient();

    for (const result of results) {
      try {
        /*
         * Gmail enrichment
         */
        if (result.source === "gmail") {
          const messageId = result.id.replace(
            /^gmail\/gmail-/,
            ""
          );

          result.content =
            await getGmailMessageContent(
              gmail,
              messageId
            );
        }

        /*
         * Google Drive enrichment
         */
        if (result.source === "drive") {
          const fileId = result.id
            .replace(/^drive\//, "")
            .replace(/^drive-/, "");

          console.log(
            "Trying Google Drive file ID:",
            fileId
          );

          try {
            /*
             * First try the ID stored in GBrain.
             */
            const response =
              await drive.files.get({
                fileId,
                fields:
                  "id,name,mimeType,webViewLink,createdTime,modifiedTime",
              });

            const file = response.data;

            console.log(
              "Drive file found by ID:",
              {
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
              }
            );

            result.content =
              await getDriveFileContent(
                drive,
                file
              );
          } catch (error: any) {
            /*
             * If GBrain contains a stale/inaccessible
             * Drive ID, try finding the file by title.
             */
            if (
              error?.code !== 404 &&
              error?.response?.status !== 404
            ) {
              throw error;
            }

            console.warn(
              `Drive ID not accessible: ${fileId}`
            );

            console.log(
              `Trying Drive filename lookup: ${result.title}`
            );

            const escapedTitle =
              result.title.replace(
                /'/g,
                "\\'"
              );

            const lookup =
              await drive.files.list({
                q: `'root' in parents and name = '${escapedTitle}' and trashed = false`,
                fields:
                  "files(id,name,mimeType,webViewLink,createdTime,modifiedTime)",
                pageSize: 10,
              });

            const files =
              lookup.data.files ?? [];

            /*
             * If root lookup doesn't find it,
             * search across accessible Drive files.
             */
            let matchingFile =
              files.find(
                (file) =>
                  file.name === result.title
              );

            if (!matchingFile) {
              const broadLookup =
                await drive.files.list({
                  q: `name = '${escapedTitle}' and trashed = false`,
                  fields:
                    "files(id,name,mimeType,webViewLink,createdTime,modifiedTime)",
                  pageSize: 10,
                });

              matchingFile =
                (
                  broadLookup.data.files ?? []
                ).find(
                  (file) =>
                    file.name ===
                    result.title
                );
            }

            if (!matchingFile?.id) {
              console.warn(
                `Drive file not found by title: ${result.title}`
              );

              result.content = "";
              continue;
            }

            console.log(
              "Drive file found by title:",
              {
                id: matchingFile.id,
                name: matchingFile.name,
                mimeType:
                  matchingFile.mimeType,
              }
            );

            result.content =
              await getDriveFileContent(
                drive,
                matchingFile
              );
          }
        }
      } catch (error) {
        console.warn(
          `Failed to enrich ${result.id}:`,
          error
        );

        result.content = "";
      }
    }

    return {
      query,
      count: results.length,
      results,
    };
  }

  /**
   * Parse GBrain CLI search output.
   */
  private parseResults(
    raw: string
  ): BrainSearchResult[] {
    const lines = raw.split("\n");

    const results: BrainSearchResult[] = [];

    for (const line of lines) {
      const match = line.match(
        /^\[([\d.]+)\]\s+(\S+)\s+--\s+#\s+(.+)$/
      );

      if (!match) {
        continue;
      }

      const scoreText = match[1];
      const id = match[2];
      const title = match[3];

      if (!scoreText || !id || !title) {
        continue;
      }

      const score = Number(scoreText);

      if (Number.isNaN(score)) {
        continue;
      }

      const source =
        id.startsWith("gmail/")
          ? "gmail"
          : id.startsWith("drive/")
            ? "drive"
            : null;

      if (!source) {
        continue;
      }

      results.push({
        score,
        id,
        source,
        title,
        content: "",
      });
    }

    return results;
  }

  /**
   * Ingest a BrainDocument into GBrain.
   *
   * Embeddings are generated separately with:
   *
   * gbrain embed --stale
   */
  async ingest(
    document: BrainDocument
  ): Promise<void> {
    const markdown =
      this.toMarkdown(document);

    const tempDirectory =
      await mkdtemp(
        join(
          tmpdir(),
          "personal-brain-gbrain-"
        )
      );

    const sourceDirectory =
      join(
        tempDirectory,
        document.source
      );

    const tempFile = join(
      sourceDirectory,
      `${this.safeFileName(
        document.id
      )}.md`
    );

    try {
      await mkdir(
        sourceDirectory,
        {
          recursive: true,
        }
      );

      await writeFile(
        tempFile,
        markdown,
        "utf8"
      );

      await this.run([
        "import",
        tempDirectory,
        "--no-embed",
      ]);
    } finally {
      await rm(
        tempDirectory,
        {
          recursive: true,
          force: true,
        }
      );
    }
  }

  /**
   * Convert an ID into a safe filename.
   */
  private safeFileName(
    value: string
  ): string {
    return value
      .toLowerCase()
      .replace(
        /[^a-z0-9_-]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        "");
  }

  /**
   * Convert BrainDocument into
   * GBrain-compatible Markdown.
   */
  private toMarkdown(
    document: BrainDocument
  ): string {
    const metadata: Record<
      string,
      string
    > = {
      title: document.title,
      source: document.source,
      source_id: document.id,
    };

    if (document.url) {
      metadata.url =
        document.url;
    }

    if (document.mimeType) {
      metadata.mime_type =
        document.mimeType;
    }

    if (document.createdAt) {
      metadata.created_at =
        document.createdAt;
    }

    if (document.updatedAt) {
      metadata.updated_at =
        document.updatedAt;
    }

    const frontmatter =
      Object.entries(metadata)
        .map(
          ([key, value]) =>
            `${key}: ${this.yamlString(
              value
            )}`
        )
        .join("\n");

    return `---
${frontmatter}
---

# ${document.title}

${document.content}
`;
  }

  /**
   * Safely encode a YAML value.
   */
  private yamlString(
    value: unknown
  ): string {
    return JSON.stringify(
      String(value)
    );
  }
}