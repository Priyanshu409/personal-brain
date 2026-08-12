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

  /*
   * `users.messages.list` with no labelIds/q filter already
   * returns mail across Inbox, Sent, and any other labels
   * (it only excludes Spam/Trash, which need
   * includeSpamTrash: true). Drafts are the one folder it
   * never includes — a draft only shows up via the separate
   * Drafts API — so they're fetched explicitly below and
   * merged in.
   */
  async sync(): Promise<BrainDocument[]> {
    const gmail = await createGmailClient();

    const documents: BrainDocument[] = [];
    const seenMessageIds = new Set<string>();

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

        seenMessageIds.add(message.id);

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

    if (documents.length < MAX_GMAIL_SYNC_MESSAGES) {
      const draftDocuments = await this.syncDrafts(
        gmail,
        seenMessageIds,
        MAX_GMAIL_SYNC_MESSAGES - documents.length
      );

      documents.push(...draftDocuments);
    }

    return documents;
  }

  /**
   * Fetch Gmail drafts and normalize them the same way as
   * regular messages, tagging each as a draft so the LLM
   * can distinguish "drafted but never sent" from "sent".
   */
  private async syncDrafts(
    gmail: gmail_v1.Gmail,
    seenMessageIds: Set<string>,
    remainingCapacity: number
  ): Promise<BrainDocument[]> {
    const documents: BrainDocument[] = [];

    let pageToken: string | undefined;

    do {
      const response = await gmail.users.drafts.list({
        userId: "me",
        maxResults: 100,
        pageToken,
      });

      const drafts = response.data.drafts ?? [];

      for (const draft of drafts) {
        const messageId = draft.message?.id;

        if (
          !messageId ||
          seenMessageIds.has(messageId)
        ) {
          continue;
        }

        if (documents.length >= remainingCapacity) {
          break;
        }

        const fullMessage =
          await gmail.users.messages.get({
            userId: "me",
            id: messageId,
            format: "full",
          });

        const parsed = parseGmailMessage(
          fullMessage.data
        );

        seenMessageIds.add(messageId);

        documents.push(
          toBrainDocument({
            ...parsed,
            subject: `[Draft] ${parsed.subject}`,
          })
        );
      }

      pageToken =
        response.data.nextPageToken ?? undefined;
    } while (
      pageToken &&
      documents.length < remainingCapacity
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