import {
  describe,
  expect,
  test,
  mock,
} from "bun:test";

const { SlackConnector } = await import(
  "../src/connectors/SlackConnector"
);

const NOW = Math.floor(Date.now() / 1000);

const dmChannels = [
  {
    id: "D001",
    is_im: true,
    user: "U001",
  },
  {
    id: "G001",
    is_im: false,
    is_mpim: true,
    name: "mpdm-alice--bob-1",
  },
];

const channelInfo: Record<
  string,
  { last_read: string }
> = {
  D001: {
    last_read: String(NOW - 60 * 60),
  },
  G001: {
    last_read: String(NOW - 60 * 60),
  },
};

const channelHistory: Record<
  string,
  Array<{ ts: string; text: string; user: string }>
> = {
  D001: [
    {
      ts: `${NOW - 30 * 60}.000100`,
      text: "Are we still on for tomorrow?",
      user: "U001",
    },
    {
      ts: `${NOW - 2 * 60 * 60}.000200`,
      text: "Already read this one",
      user: "U001",
    },
  ],
  G001: [
    {
      ts: `${NOW - 10 * 60}.000300`,
      text: "Group DM message",
      user: "U002",
    },
  ],
};

const userNames: Record<string, string> = {
  U001: "Priya Sharma",
  U002: "Bob Lee",
};

const fakeSlackClient = {
  conversations: {
    list: async () => ({
      channels: dmChannels,
    }),

    info: async (options: { channel: string }) => ({
      channel: channelInfo[options.channel],
    }),

    history: async (options: {
      channel: string;
      oldest?: string;
    }) => ({
      messages: channelHistory[options.channel] ?? [],
    }),
  },

  users: {
    info: async (options: { user: string }) => ({
      user: {
        real_name: userNames[options.user],
      },
    }),
  },
};

mock.module(
  "../src/services/slackService",
  () => ({
    createSlackClient: () => fakeSlackClient,

    resolveUserName: async (
      _client: unknown,
      userId: string
    ) => userNames[userId] ?? userId,
  })
);

describe("SlackConnector", () => {
  test("syncs DM and group-DM messages into BrainDocuments", async () => {
    const connector = new SlackConnector();

    const documents = await connector.sync();

    expect(documents).toHaveLength(3);

    const unreadDoc = documents.find((doc) =>
      doc.content.includes("Are we still on for tomorrow?")
    );

    expect(unreadDoc).toBeDefined();
    expect(unreadDoc?.source).toBe("slack");
    expect(unreadDoc?.content).toContain("Unread: Yes");
    expect(unreadDoc?.content).toContain(
      "From: Priya Sharma"
    );

    const readDoc = documents.find((doc) =>
      doc.content.includes("Already read this one")
    );

    expect(readDoc?.content).toContain("Unread: No");

    const groupDoc = documents.find((doc) =>
      doc.content.includes("Group DM message")
    );

    expect(groupDoc?.content).toContain("From: Bob Lee");
  });

  test("searches Slack DMs using the provided query", async () => {
    const connector = new SlackConnector();

    const documents = await connector.search("tomorrow");

    expect(documents).toHaveLength(1);
    expect(documents[0]?.content).toContain(
      "Are we still on for tomorrow?"
    );
  });

  test("returns the correct connector name", () => {
    const connector = new SlackConnector();

    expect(connector.getName()).toBe("slack");
  });
});
