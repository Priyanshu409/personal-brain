import type { BrainDocument } from "../types/brain";

export interface ParsedSlackMessage {
  channelId: string;
  channelName: string;
  ts: string;
  senderName: string;
  text: string;
  isUnread: boolean;
}

/*
 * BrainDocument ids get sanitized by GBrainService's
 * safeFileName (non alnum/dash chars become '-') before
 * being stored, so a Slack message timestamp's '.' would
 * otherwise be lost. Encode it as 'p' (reversible) so the
 * channel/ts pair can be recovered later to re-fetch the
 * live message content.
 */
export function encodeSlackDocumentId(
  channelId: string,
  ts: string
): string {
  return `slack:${channelId}-${ts.replace(".", "p")}`;
}

export function decodeSlackDocumentId(
  id: string
): { channelId: string; ts: string } | null {
  const match = id.match(
    /^slack\/slack-([A-Za-z0-9]+)-(\d+)p(\d+)$/
  );

  if (!match) {
    return null;
  }

  const [, channelId, tsSeconds, tsMicros] = match;

  return {
    channelId: channelId as string,
    ts: `${tsSeconds}.${tsMicros}`,
  };
}

export function toBrainDocument(
  message: ParsedSlackMessage
): BrainDocument {
  const date = new Date(
    Number(message.ts.split(".")[0]) * 1000
  ).toISOString();

  return {
    id: encodeSlackDocumentId(
      message.channelId,
      message.ts
    ),

    source: "slack",

    title: `DM from ${message.senderName}: ${message.text.slice(0, 60)}`,

    content: [
      `From: ${message.senderName}`,
      `Channel: ${message.channelName}`,
      `Date: ${date}`,
      `Unread: ${message.isUnread ? "Yes" : "No"}`,
      "",
      message.text,
    ].join("\n"),

    createdAt: date,

    metadata: {
      channelId: message.channelId,
      channelName: message.channelName,
      ts: message.ts,
      senderName: message.senderName,
      isUnread: message.isUnread,
    },
  };
}
