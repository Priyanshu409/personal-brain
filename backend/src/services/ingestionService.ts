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
      await this.ingest(document);
      count++;
    }

    return count;
  }
}