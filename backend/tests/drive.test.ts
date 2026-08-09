import {
  describe,
  expect,
  test,
} from "bun:test";

import {
  parseDriveMetadata,
} from "../src/utils/driveParser";

import {
  toBrainDocument,
} from "../src/connectors/driveDocumentMapper";

describe("Google Drive", () => {
  test("parses Drive file metadata", () => {
    const parsed = parseDriveMetadata({
      id: "file-001",
      name: "Resume.pdf",
      mimeType: "application/pdf",
      webViewLink:
        "https://drive.google.com/file/d/file-001",
      createdTime: "2026-08-01T10:00:00Z",
      modifiedTime: "2026-08-05T12:00:00Z",
    });

    expect(parsed.id).toBe("file-001");

    expect(parsed.name).toBe(
      "Resume.pdf"
    );

    expect(parsed.mimeType).toBe(
      "application/pdf"
    );

    expect(parsed.webViewLink).toBe(
      "https://drive.google.com/file/d/file-001"
    );

    expect(parsed.createdTime).toBe(
      "2026-08-01T10:00:00Z"
    );

    expect(parsed.modifiedTime).toBe(
      "2026-08-05T12:00:00Z"
    );

    expect(parsed.content).toBe("");
  });

  test("uses default values for missing Drive metadata", () => {
    const parsed = parseDriveMetadata({});

    expect(parsed.id).toBe("");

    expect(parsed.name).toBe(
      "(Unnamed file)"
    );

    expect(parsed.mimeType).toBe(
      "application/octet-stream"
    );

    expect(parsed.webViewLink).toBeUndefined();

    expect(parsed.createdTime).toBeUndefined();

    expect(parsed.modifiedTime).toBeUndefined();

    expect(parsed.content).toBe("");
  });

  test("preserves Drive file content", () => {
    const parsed = parseDriveMetadata(
      {
        id: "file-002",
        name: "Interview Notes.txt",
        mimeType: "text/plain",
      },
      "Java, Spring Boot, SQL and System Design"
    );

    expect(parsed.content).toBe(
      "Java, Spring Boot, SQL and System Design"
    );
  });

  test("maps Drive file to BrainDocument", () => {
    const parsed = parseDriveMetadata(
      {
        id: "file-003",
        name: "Interview Notes.txt",
        mimeType: "text/plain",
        webViewLink:
          "https://drive.google.com/file/d/file-003",
        createdTime: "2026-08-01T10:00:00Z",
        modifiedTime: "2026-08-05T12:00:00Z",
      },
      "Prepare Java and Spring Boot"
    );

    const document =
      toBrainDocument(parsed);

    expect(document.id).toBe(
      "drive:file-003"
    );

    expect(document.source).toBe(
      "drive"
    );

    expect(document.title).toBe(
      "Interview Notes.txt"
    );

    expect(document.content).toContain(
      "File: Interview Notes.txt"
    );

    expect(document.content).toContain(
      "Type: text/plain"
    );

    expect(document.content).toContain(
      "Created: 2026-08-01T10:00:00Z"
    );

    expect(document.content).toContain(
      "Modified: 2026-08-05T12:00:00Z"
    );

    expect(document.content).toContain(
      "Prepare Java and Spring Boot"
    );

    expect(document.url).toBe(
      "https://drive.google.com/file/d/file-003"
    );

    expect(document.createdAt).toBe(
      "2026-08-01T10:00:00Z"
    );

    expect(document.updatedAt).toBe(
      "2026-08-05T12:00:00Z"
    );
  });

  test("stores Drive metadata inside BrainDocument", () => {
    const parsed = parseDriveMetadata({
      id: "file-004",
      name: "Project Notes.md",
      mimeType: "text/markdown",
      webViewLink:
        "https://drive.google.com/file/d/file-004",
    });

    const document =
      toBrainDocument(parsed);

    expect(
      document.metadata.fileId
    ).toBe("file-004");

    expect(
      document.metadata.name
    ).toBe("Project Notes.md");

    expect(
      document.metadata.mimeType
    ).toBe("text/markdown");

    expect(
      document.metadata.webViewLink
    ).toBe(
      "https://drive.google.com/file/d/file-004"
    );
  });
});