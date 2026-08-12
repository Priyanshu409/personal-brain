import type { BrainDocument } from "../types/brain";

import { DriveConnector } from "../connectors/DriveConnector";
import { GmailConnector } from "../connectors/GmailConnector";
import { SlackConnector } from "../connectors/SlackConnector";

import {
  GBrainService,
} from "./gbrainService";

import {
  IngestionService,
} from "./ingestionService";

export interface SyncResult {
  source: string;
  fetched: number;
  ingested: number;
}

export interface BrainSyncConnector {
  getName(): string;
  sync(): Promise<BrainDocument[]>;
}

export interface BrainSyncIngestion {
  ingestMany(
    documents: BrainDocument[]
  ): Promise<number>;
}

export interface BrainSyncEmbedder {
  embedStale(): Promise<void>;
}

export class BrainSyncService {
  constructor(
    private readonly connectors: BrainSyncConnector[] = [
      new GmailConnector(),
      new DriveConnector(),
      new SlackConnector(),
    ],
    private readonly ingestion: BrainSyncIngestion =
      new IngestionService(
        new GBrainService()
      ),
    private readonly embedder: BrainSyncEmbedder = new GBrainService()
  ) {}

  async sync(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const connector of this.connectors) {
      const documents =
        await connector.sync();

      const ingested =
        await this.ingestion.ingestMany(
          documents
        );

      results.push({
        source: connector.getName(),
        fetched: documents.length,
        ingested,
      });
    }

    /*
     * Documents are imported with --no-embed for speed;
     * generate embeddings for everything stale now so
     * newly synced documents are actually searchable.
     */
    const totalIngested =
      results.reduce(
        (total, result) => total + result.ingested,
        0
      );

    if (totalIngested > 0) {
      await this.embedder.embedStale();
    }

    return results;
  }
}