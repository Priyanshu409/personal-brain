import { toBrainDocument } from "./gmailDocumentMapper";

import type { gmail_v1 } from "googleapis";

import type { BrainDocument } from "../types/brain";

import type { PersonalDataConnector } from "./PersonalDataConnector";

import { createGmailClient } from "../services/gmailService";

import { parseGmailMessage } from "../utils/gmailParser";

export class GmailConnector
  implements PersonalDataConnector
{
  getName(): string {
    return "gmail";
  }

  async sync(): Promise<BrainDocument[]> {
    const gmail = await createGmailClient();

    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 50,
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