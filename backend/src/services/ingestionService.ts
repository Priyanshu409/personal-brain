import type { BrainDocument } from "../types/brain";

export interface BrainIngestionPort {
  ingest(document: BrainDocument): Promise<void>;
}

export class IngestionService {
  constructor(private readonly brain: BrainIngestionPort) {}

  async ingest(document: BrainDocument): Promise<void> {
    if (!document.id.trim()) {
      throw new Error("Document id is required");
    }

    if (!document.title.trim()) {
      throw new Error("Document title is required");
    }

    if (!document.content.trim()) {
      throw new Error("Document content is required");
    }

    await this.brain.ingest(document);
  }

  async ingestMany(documents: BrainDocument[]): Promise<number> {
    let count = 0;

    for (const document of documents) {
      try {
        await this.ingest(document);
        count++;
      } catch (error) {
        /*
         * One malformed document (e.g. missing title)
         * shouldn't abort the rest of the batch, since
         * BrainSyncService runs connectors sequentially
         * and an uncaught error here would silently skip
         * every connector after this one for the whole run.
         */
        console.warn(
          `Skipping document that failed to ingest: ${document.id}`,
          error
        );
      }
    }

    return count;
  }
}