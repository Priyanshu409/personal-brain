import {
  describe,
  expect,
  test,
  mock,
} from "bun:test";

const gmailState = {
  lastSearchQuery: "",
};

const driveState = {
  lastSearchQuery: "",
};

const { GmailConnector } = await import(
  "../src/connectors/GmailConnector"
);

const { DriveConnector } = await import(
  "../src/connectors/DriveConnector"
);

const gmailMessages = [
  {
    id: "gmail-001",
    threadId: "thread-001",
    payload: {
      headers: [
        {
          name: "Subject",
          value: "Backend Interview",
        },
        {
          name: "From",
          value: "recruiter@example.com",
        },
        {
          name: "To",
          value: "candidate@example.com",
        },
        {
          name: "Date",
          value: "Mon, 10 Aug 2026 10:00:00 +0000",
        },
      ],
      body: {
        data: Buffer.from(
          "Prepare Java, Spring Boot and SQL"
        )
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, ""),
      },
    },
  },
  {
    id: "gmail-002",
    threadId: "thread-002",
    payload: {
      headers: [
        {
          name: "Subject",
          value: "Project Discussion",
        },
        {
          name: "From",
          value: "team@example.com",
        },
        {
          name: "To",
          value: "candidate@example.com",
        },
        {
          name: "Date",
          value: "Tue, 11 Aug 2026 11:00:00 +0000",
        },
      ],
      body: {
        data: Buffer.from(
          "Discuss Personal Brain project"
        )
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, ""),
      },
    },
  },
];

const gmailDrafts: Array<{
  id: string;
  message: { id: string };
}> = [];

const fakeGmailClient = {
  users: {
    drafts: {
      list: async () => ({
        data: {
          drafts: gmailDrafts,
        },
      }),
    },

    messages: {
      list: async (options: {
        userId: string;
        maxResults: number;
        q?: string;
      }) => {
        gmailState.lastSearchQuery =
          options.q ?? "";

        /*
         * Real Gmail's messages.list never includes
         * drafts, so the fake filters them out the same
         * way to accurately model that behavior.
         */
        const draftMessageIds = new Set(
          gmailDrafts.map((draft) => draft.message.id)
        );

        return {
          data: {
            messages: options.q
              ? [
                  {
                    id: "gmail-001",
                  },
                ]
              : gmailMessages
                  .filter(
                    (message) =>
                      !draftMessageIds.has(message.id)
                  )
                  .map((message) => ({
                    id: message.id,
                  })),
          },
        };
      },

      get: async (options: {
        userId: string;
        id: string;
        format: string;
      }) => {
        const message = gmailMessages.find(
          (item) => item.id === options.id
        );

        return {
          data: message,
        };
      },
    },
  },
};

const driveFiles = [
  {
    id: "drive-001",
    name: "Resume.pdf",
    mimeType: "application/pdf",
    webViewLink:
      "https://drive.google.com/file/d/drive-001",
    createdTime: "2026-08-01T10:00:00Z",
    modifiedTime: "2026-08-05T12:00:00Z",
  },
  {
    id: "drive-002",
    name: "Interview Notes.md",
    mimeType: "text/markdown",
    webViewLink:
      "https://drive.google.com/file/d/drive-002",
    createdTime: "2026-08-02T10:00:00Z",
    modifiedTime: "2026-08-06T12:00:00Z",
  },
];

const fakeDriveClient = {
  files: {
    list: async (options: {
      pageSize: number;
      q: string;
      fields: string;
    }) => {
      driveState.lastSearchQuery = options.q;

      const isSearch =
        options.q.includes("name contains");

      return {
        data: {
          files: isSearch
            ? [driveFiles[0]]
            : driveFiles,
        },
      };
    },
  },
};

mock.module(
  "../src/services/gmailService",
  () => ({
    createGmailClient: async () =>
      fakeGmailClient,
  })
);

mock.module(
  "../src/services/driveService",
  () => ({
    createDriveClient: async () =>
      fakeDriveClient,

    getDriveFileContent: async (
      _drive: unknown,
      file: { id?: string }
    ) => {
      const contents: Record<string, string> = {
        "drive-001": "Resume content",
        "drive-002":
          "Interview notes and Spring Boot preparation",
      };

      return contents[file.id ?? ""] ?? "";
    },
  })
);

describe("GmailConnector", () => {
  test("syncs Gmail messages into BrainDocuments", async () => {
    const connector =
      new GmailConnector();

    const documents =
      await connector.sync();

    expect(documents).toHaveLength(2);

    expect(documents[0]).toBeDefined();
    expect(documents[1]).toBeDefined();

    if (!documents[0] || !documents[1]) {
      throw new Error(
        "Expected Gmail documents"
      );
    }

    expect(documents[0].id).toBe(
      "gmail:gmail-001"
    );

    expect(documents[0].source).toBe(
      "gmail"
    );

    expect(documents[0].title).toBe(
      "Backend Interview"
    );

    expect(documents[0].content).toContain(
      "Prepare Java, Spring Boot and SQL"
    );

    expect(documents[0].metadata.messageId).toBe(
      "gmail-001"
    );

    expect(documents[1].title).toBe(
      "Project Discussion"
    );
  });

  test("searches Gmail using the provided query", async () => {
    const connector =
      new GmailConnector();

    const documents =
      await connector.search(
        "backend interview"
      );

    expect(
      gmailState.lastSearchQuery
    ).toBe("backend interview");

    expect(documents).toHaveLength(1);

    expect(documents[0]).toBeDefined();

    if (!documents[0]) {
      throw new Error(
        "Expected Gmail search result"
      );
    }

    expect(documents[0].title).toBe(
      "Backend Interview"
    );

    expect(documents[0].source).toBe(
      "gmail"
    );
  });

  test("returns the correct connector name", () => {
    const connector =
      new GmailConnector();

    expect(connector.getName()).toBe(
      "gmail"
    );
  });

  test("includes Gmail drafts alongside Inbox/Sent messages, tagged as a draft", async () => {
    gmailMessages.push({
      id: "gmail-draft-001",
      threadId: "thread-draft-001",
      payload: {
        headers: [
          {
            name: "Subject",
            value: "Contract",
          },
          {
            name: "From",
            value: "me@example.com",
          },
          {
            name: "To",
            value: "priya@example.com",
          },
          {
            name: "Date",
            value: "Wed, 12 Aug 2026 09:00:00 +0000",
          },
        ],
        body: {
          data: Buffer.from("Draft contract body")
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, ""),
        },
      },
    });

    gmailDrafts.push({
      id: "draft-001",
      message: {
        id: "gmail-draft-001",
      },
    });

    try {
      const connector = new GmailConnector();

      const documents = await connector.sync();

      const draftDocument = documents.find(
        (document) =>
          document.id === "gmail:gmail-draft-001"
      );

      expect(draftDocument).toBeDefined();
      expect(draftDocument?.title).toBe(
        "[Draft] Contract"
      );

      // Inbox/Sent messages are still present alongside the draft.
      expect(documents).toHaveLength(3);
    } finally {
      gmailDrafts.length = 0;
      gmailMessages.pop();
    }
  });

  test("falls back to a placeholder title when the Subject header is present but empty", async () => {
    const originalMessages = [...gmailMessages];

    gmailMessages.push({
      id: "gmail-003",
      threadId: "thread-003",
      payload: {
        headers: [
          {
            name: "Subject",
            value: "",
          },
          {
            name: "From",
            value: "noreply@example.com",
          },
          {
            name: "To",
            value: "candidate@example.com",
          },
          {
            name: "Date",
            value: "Wed, 12 Aug 2026 09:00:00 +0000",
          },
        ],
        body: {
          data: Buffer.from("No subject body")
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, ""),
        },
      },
    });

    try {
      const connector = new GmailConnector();

      const documents = await connector.sync();

      const emptySubjectDocument = documents.find(
        (document) => document.id === "gmail:gmail-003"
      );

      expect(emptySubjectDocument).toBeDefined();
      expect(emptySubjectDocument?.title).toBe(
        "(No subject)"
      );
    } finally {
      gmailMessages.length = 0;
      gmailMessages.push(...originalMessages);
    }
  });
});

describe("DriveConnector", () => {
  test("syncs Drive files into BrainDocuments", async () => {
    const connector =
      new DriveConnector();

    const documents =
      await connector.sync();

    expect(documents).toHaveLength(2);

    expect(documents[0]).toBeDefined();
    expect(documents[1]).toBeDefined();

    if (!documents[0] || !documents[1]) {
      throw new Error(
        "Expected Drive documents"
      );
    }

    expect(documents[0].id).toBe(
      "drive:drive-001"
    );

    expect(documents[0].source).toBe(
      "drive"
    );

    expect(documents[0].title).toBe(
      "Resume.pdf"
    );

    expect(documents[0].url).toBe(
      "https://drive.google.com/file/d/drive-001"
    );

    expect(
      documents[0].metadata.fileId
    ).toBe("drive-001");

    expect(documents[1].title).toBe(
      "Interview Notes.md"
    );
  });

  test("searches Drive using the provided query", async () => {
    const connector =
      new DriveConnector();

    const documents =
      await connector.search(
        "Resume"
      );

    expect(
      driveState.lastSearchQuery
    ).toContain(
      "name contains 'Resume'"
    );

    expect(documents).toHaveLength(1);

    expect(documents[0]).toBeDefined();

    if (!documents[0]) {
      throw new Error(
        "Expected Drive search result"
      );
    }

    expect(documents[0].title).toBe(
      "Resume.pdf"
    );

    expect(documents[0].source).toBe(
      "drive"
    );
  });

  test("escapes quotes in Drive search queries", async () => {
    const connector =
      new DriveConnector();

    await connector.search(
      "John's Resume"
    );

    expect(
      driveState.lastSearchQuery
    ).toContain(
      "name contains 'John\\'s Resume'"
    );
  });

  test("returns the correct connector name", () => {
    const connector =
      new DriveConnector();

    expect(connector.getName()).toBe(
      "drive"
    );
  });
});