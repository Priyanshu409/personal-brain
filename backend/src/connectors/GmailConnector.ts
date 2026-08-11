import { toBrainDocument } from "./gmailDocumentMapper";

import type { gmail_v1 } from "googleapis";

import type { BrainDocument } from "../types/brain";

import type { PersonalDataConnector } from "./PersonalDataConnector";

import { createGmailClient } from "../services/gmailService";

import { parseGmailMessage } from "../utils/gmailParser";

/*
 * A single Gmail list page tops out at 500 messages, and
 * fetching each message's full body is one request each,
 * so an unbounded sync of a large mailbox could take a
 * very long time / burn a lot of quota. Cap total messages
 * synced per run at a generous but finite number instead of
 * a single 50-message page (which silently ignored the rest
 * of the mailbox entirely).
 */
const MAX_GMAIL_SYNC_MESSAGES = Number(
  process.env.GMAIL_SYNC_MAX_MESSAGES ?? 1000
);

export class GmailConnector
  implements PersonalDataConnector
{
  getName(): string {
    return "gmail";
  }

  async sync(): Promise<BrainDocument[]> {
    const gmail = await createGmailClient();

    const documents: BrainDocument[] = [];

    let pageToken: string | undefined;

    do {
      const response =
        await gmail.users.messages.list({
          userId: "me",
          maxResults: 100,
          pageToken,
        });

      const messages =
        response.data.messages ?? [];

      for (const message of messages) {
        if (!message.id) {
          continue;
        }

        if (
          documents.length >=
          MAX_GMAIL_SYNC_MESSAGES
        ) {
          break;
        }

        const fullMessage =
          await gmail.users.messages.get({
            userId: "me",
            id: message.id,
            format: "full",
          });

        const parsed = parseGmailMessage(
          fullMessage.data
        );

        documents.push(
          toBrainDocument(parsed)
        );
      }

      pageToken =
        response.data.nextPageToken ??
        undefined;
    } while (
      pageToken &&
      documents.length < MAX_GMAIL_SYNC_MESSAGES
    );

    return documents;
  }

  async search(
    query: string
  ): Promise<BrainDocument[]> {
    const gmail = await createGmailClient();

    const response =
      await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 20,
      });

    const messages = response.data.messages ?? [];

    const documents: BrainDocument[] = [];

    for (const message of messages) {
      if (!message.id) {
        continue;
      }

      const fullMessage =
        await gmail.users.messages.get({
          userId: "me",
          id: message.id,
          format: "full",
        });

      const parsed = parseGmailMessage(
        fullMessage.data
      );

      documents.push(
        toBrainDocument(parsed)
        );
    }

    return documents;
  }
}