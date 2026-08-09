import type { BrainDocument } from "../types/brain";

import type { ParsedGmailMessage } from "../utils/gmailParser";

export function toBrainDocument(
  message: ParsedGmailMessage
): BrainDocument {
  return {
    id: `gmail:${message.id}`,

    source: "gmail",

    title: message.subject,

    content: [
      `From: ${message.from}`,
      `To: ${message.to}`,
      `Date: ${message.date}`,
      `Subject: ${message.subject}`,
      "",
      message.body,
    ].join("\n"),

    createdAt: message.date
      ? new Date(message.date).toISOString()
      : undefined,

    metadata: {
      messageId: message.id,
      threadId: message.threadId,
      from: message.from,
      to: message.to,
      subject: message.subject,
    },
  };
}