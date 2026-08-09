import type { BrainDocument } from "../types/brain";

import { DriveConnector } from "../connectors/DriveConnector";
import { GmailConnector } from "../connectors/GmailConnector";

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

export class BrainSyncService {
  constructor(
    private readonly connectors: BrainSyncConnector[] = [
      new GmailConnector(),
      new DriveConnector(),
    ],
    private readonly ingestion: BrainSyncIngestion =
      new IngestionService(
        new GBrainService()
      )
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

    return results;
  }
}