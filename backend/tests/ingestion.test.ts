import {
  describe,
  expect,
  test,
} from "bun:test";

import { GBrainService } from "../src/services/gbrainService";
import { IngestionService } from "../src/services/ingestionService";

describe("Brain Ingestion", () => {
  test(
    "ingests and retrieves a Gmail document",
    async () => {
      const brain = new GBrainService();

      const ingestion = new IngestionService(brain);

      await ingestion.ingest({
        id: "demo-001",

        source: "gmail",

        title: "Interview Preparation",

        content:
          "The backend interview is scheduled for Monday at 10 AM. Prepare Java, Spring Boot, SQL and system design.",

        metadata: {
          gmailMessageId: "demo-001",
          threadId: "thread-demo",
          from: "recruiter@example.com",
        },

        updatedAt: new Date().toISOString(),
      });

      const result = await brain.search(
        "backend interview Spring Boot"
      );

      expect(result).toContain(
        "Interview Preparation"
      );
    },
    15000
  );
});