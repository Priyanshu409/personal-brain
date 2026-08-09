import { describe, expect, test } from "bun:test";

import {
  normalizeDriveFile,
  normalizeGmailMessage,
} from "../src/services/documentNormalizer";

describe("Document Normalizer", () => {
  test("normalizes Gmail message", () => {
    const document = normalizeGmailMessage({
      id: "123",
      threadId: "thread-1",
      subject: "Interview Update",
      from: "recruiter@example.com",
      to: "candidate@example.com",
      body: "Your interview is scheduled for Monday.",
      date: "2026-08-09T10:00:00Z",
    });

    expect(document.id).toBe("gmail:123");
    expect(document.source).toBe("gmail");
    expect(document.title).toBe("Interview Update");
    expect(document.content).toContain(
      "Your interview is scheduled for Monday."
    );
  });

  test("normalizes Drive file", () => {
    const document = normalizeDriveFile({
      id: "456",
      name: "Resume.pdf",
      mimeType: "application/pdf",
      webViewLink: "https://drive.google.com/file/456",
      text: "Software Engineer Resume",
      createdTime: "2026-08-01T10:00:00Z",
      modifiedTime: "2026-08-09T10:00:00Z",
    });

    expect(document.id).toBe("drive:456");
    expect(document.source).toBe("drive");
    expect(document.title).toBe("Resume.pdf");
    expect(document.content).toBe("Software Engineer Resume");
  });
});