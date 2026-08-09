import {
  describe,
  expect,
  test,
} from "bun:test";

import { toBrainDocument } from "../src/connectors/gmailDocumentMapper";
import { IngestionService } from "../src/services/ingestionService";
import type { BrainDocument } from "../src/types/brain";

describe("Brain Ingestion", () => {
  test("ingests a Gmail document", async () => {
    const storedDocuments: BrainDocument[] = [];

    const fakeBrain = {
      async ingest(
        document: BrainDocument
      ): Promise<void> {
        storedDocuments.push(document);
      },
    };

    const ingestion =
      new IngestionService(fakeBrain);

    const gmailDocument = toBrainDocument({
      id: "demo-001",
      threadId: "thread-demo",
      from: "recruiter@example.com",
      to: "candidate@example.com",
      subject: "Interview Preparation",
      date: "2026-08-10T10:00:00Z",
      body:
        "The backend interview is scheduled for Monday at 10 AM. Prepare Java, Spring Boot, SQL and system design.",
    });

    await ingestion.ingest(gmailDocument);

    expect(storedDocuments).toHaveLength(1);

    const storedDocument = storedDocuments[0];

    expect(storedDocument).toBeDefined();

    if (!storedDocument) {
      throw new Error(
        "Expected an ingested document to be stored"
      );
    }

    expect(storedDocument.id).toBe(
      "gmail:demo-001"
    );

    expect(storedDocument.source).toBe(
      "gmail"
    );

    expect(storedDocument.title).toBe(
      "Interview Preparation"
    );

    expect(storedDocument.content).toContain(
      "Spring Boot"
    );

    expect(
      storedDocument.metadata.messageId
    ).toBe("demo-001");

    expect(
      storedDocument.metadata.threadId
    ).toBe("thread-demo");
  });

  test("ingests multiple documents", async () => {
    const storedDocuments: BrainDocument[] = [];

    const fakeBrain = {
      async ingest(
        document: BrainDocument
      ): Promise<void> {
        storedDocuments.push(document);
      },
    };

    const ingestion =
      new IngestionService(fakeBrain);

    const documents: BrainDocument[] = [
      {
        id: "gmail:001",
        source: "gmail",
        title: "First Email",
        content: "First email content",
        metadata: {
          messageId: "001",
          threadId: "thread-001",
        },
      },
      {
        id: "gmail:002",
        source: "gmail",
        title: "Second Email",
        content: "Second email content",
        metadata: {
          messageId: "002",
          threadId: "thread-002",
        },
      },
    ];

    const count =
      await ingestion.ingestMany(documents);

    expect(count).toBe(2);
    expect(storedDocuments).toHaveLength(2);

    const firstDocument = storedDocuments[0];
    const secondDocument = storedDocuments[1];

    expect(firstDocument).toBeDefined();
    expect(secondDocument).toBeDefined();

    if (!firstDocument || !secondDocument) {
      throw new Error(
        "Expected both documents to be stored"
      );
    }

    expect(firstDocument.title).toBe(
      "First Email"
    );

    expect(secondDocument.title).toBe(
      "Second Email"
    );

    expect(
      firstDocument.metadata.messageId
    ).toBe("001");

    expect(
      secondDocument.metadata.messageId
    ).toBe("002");
  });

  test("rejects a document without an id", async () => {
    const fakeBrain = {
      async ingest(
        _document: BrainDocument
      ): Promise<void> {},
    };

    const ingestion =
      new IngestionService(fakeBrain);

    const document: BrainDocument = {
      id: "   ",
      source: "gmail",
      title: "Test Email",
      content: "Test content",
      metadata: {
        messageId: "test-001",
        threadId: "thread-test",
      },
    };

    await expect(
      ingestion.ingest(document)
    ).rejects.toThrow(
      "Document id is required"
    );
  });

  test("rejects a document without a title", async () => {
    const fakeBrain = {
      async ingest(
        _document: BrainDocument
      ): Promise<void> {},
    };

    const ingestion =
      new IngestionService(fakeBrain);

    const document: BrainDocument = {
      id: "gmail:001",
      source: "gmail",
      title: "   ",
      content: "Test content",
      metadata: {
        messageId: "001",
        threadId: "thread-001",
      },
    };

    await expect(
      ingestion.ingest(document)
    ).rejects.toThrow(
      "Document title is required"
    );
  });

  test("rejects a document without content", async () => {
    const fakeBrain = {
      async ingest(
        _document: BrainDocument
      ): Promise<void> {},
    };

    const ingestion =
      new IngestionService(fakeBrain);

    const document: BrainDocument = {
      id: "gmail:001",
      source: "gmail",
      title: "Test Email",
      content: "   ",
      metadata: {
        messageId: "001",
        threadId: "thread-001",
      },
    };

    await expect(
      ingestion.ingest(document)
    ).rejects.toThrow(
      "Document content is required"
    );
  });
});