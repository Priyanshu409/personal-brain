import {
  describe,
  expect,
  test,
} from "bun:test";

import type { BrainDocument } from "../src/types/brain";

import {
  BrainSyncService,
} from "../src/services/brainSyncService";

function createDocument(
  id: string,
  source: "gmail" | "drive",
  title: string
): BrainDocument {
  return {
    id,
    source,
    title,
    content: `${title} content`,
    metadata: {
      test: true,
    },
  };
}

describe("BrainSyncService", () => {
  test("syncs multiple sources into the brain", async () => {
    const gmailDocuments = [
      createDocument(
        "gmail:001",
        "gmail",
        "Interview Email"
      ),
      createDocument(
        "gmail:002",
        "gmail",
        "Project Email"
      ),
    ];

    const driveDocuments = [
      createDocument(
        "drive:001",
        "drive",
        "Resume"
      ),
    ];

    const connectors = [
      {
        getName: () => "gmail",

        async sync() {
          return gmailDocuments;
        },
      },
      {
        getName: () => "drive",

        async sync() {
          return driveDocuments;
        },
      },
    ];

    const ingestedDocuments: BrainDocument[] = [];

    const ingestion = {
      async ingestMany(
        documents: BrainDocument[]
      ): Promise<number> {
        ingestedDocuments.push(
          ...documents
        );

        return documents.length;
      },
    };

    const syncService =
      new BrainSyncService(
        connectors,
        ingestion
      );

    const results =
      await syncService.sync();

    expect(results).toHaveLength(2);

    expect(results[0]).toEqual({
      source: "gmail",
      fetched: 2,
      ingested: 2,
    });

    expect(results[1]).toEqual({
      source: "drive",
      fetched: 1,
      ingested: 1,
    });

    expect(
      ingestedDocuments
    ).toHaveLength(3);
  });

  test("returns zero counts when sources are empty", async () => {
    const connectors = [
      {
        getName: () => "gmail",

        async sync() {
          return [];
        },
      },
      {
        getName: () => "drive",

        async sync() {
          return [];
        },
      },
    ];

    const ingestion = {
      async ingestMany(
        documents: BrainDocument[]
      ): Promise<number> {
        return documents.length;
      },
    };

    const syncService =
      new BrainSyncService(
        connectors,
        ingestion
      );

    const results =
      await syncService.sync();

    expect(results).toEqual([
      {
        source: "gmail",
        fetched: 0,
        ingested: 0,
      },
      {
        source: "drive",
        fetched: 0,
        ingested: 0,
      },
    ]);
  });

  test("preserves source-specific document counts", async () => {
    const connectors = [
      {
        getName: () => "gmail",

        async sync() {
          return [
            createDocument(
              "gmail:001",
              "gmail",
              "Email"
            ),
          ];
        },
      },
      {
        getName: () => "drive",

        async sync() {
          return [
            createDocument(
              "drive:001",
              "drive",
              "File 1"
            ),
            createDocument(
              "drive:002",
              "drive",
              "File 2"
            ),
            createDocument(
              "drive:003",
              "drive",
              "File 3"
            ),
          ];
        },
      },
    ];

    const ingestion = {
      async ingestMany(
        documents: BrainDocument[]
      ): Promise<number> {
        return documents.length;
      },
    };

    const syncService =
      new BrainSyncService(
        connectors,
        ingestion
      );

    const results =
      await syncService.sync();

    expect(results[0]?.fetched).toBe(1);
    expect(results[0]?.ingested).toBe(1);

    expect(results[1]?.fetched).toBe(3);
    expect(results[1]?.ingested).toBe(3);
  });
});