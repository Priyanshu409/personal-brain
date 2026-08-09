import { spawn } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { BrainDocument } from "../types/brain";

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
          shell: true,
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
   * Search the local GBrain.
   *
   * Currently uses GBrain keyword search,
   * which does not require embeddings.
   */
  async search(query: string): Promise<string> {
    if (!query.trim()) {
      throw new Error(
        "Search query is required"
      );
    }

    return this.run([
      "search",
      query,
    ]);
  }

  /**
   * Ingest a BrainDocument into GBrain.
   *
   * We intentionally use:
   *
   *   gbrain import <directory> --no-embed
   *
   * because the current development environment
   * does not have OpenAI embedding credits.
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