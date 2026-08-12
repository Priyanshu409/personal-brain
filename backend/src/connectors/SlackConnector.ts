import type { BrainDocument } from "../types/brain";
import type { PersonalDataConnector } from "./PersonalDataConnector";

import {
  createSlackClient,
  resolveUserName,
} from "../services/slackService";

import { toBrainDocument } from "./slackDocumentMapper";

/*
 * Bound total messages synced per run (mirrors
 * MAX_GMAIL_SYNC_MESSAGES / MAX_DRIVE_SYNC_FILES) so a
 * busy DM history can't make a sync run indefinitely.
 */
const MAX_SLACK_SYNC_MESSAGES = Number(
  process.env.SLACK_SYNC_MAX_MESSAGES ?? 500
);

/*
 * Only sync recent history by default — DM content from
 * months/years ago is unlikely to be relevant and keeps
 * the corpus focused for "this week"-style questions.
 */
const SLACK_SYNC_LOOKBACK_DAYS = Number(
  process.env.SLACK_SYNC_LOOKBACK_DAYS ?? 30
);

interface SlackChannel {
  id: string;
  name: string;
  lastRead?: string;
}

export class SlackConnector
  implements PersonalDataConnector
{
  getName(): string {
    return "slack";
  }

  async sync(): Promise<BrainDocument[]> {
    const client = createSlackClient();

    const channels = await this.listDmChannels(client);

    const oldest = String(
      Date.now() / 1000 -
        SLACK_SYNC_LOOKBACK_DAYS * 24 * 60 * 60
    );

    const documents: BrainDocument[] = [];

    for (const channel of channels) {
      if (documents.length >= MAX_SLACK_SYNC_MESSAGES) {
        break;
      }

      const history =
        await client.conversations.history({
          channel: channel.id,
          oldest,
          limit: 100,
        });

      const messages = history.messages ?? [];

      for (const message of messages) {
        if (documents.length >= MAX_SLACK_SYNC_MESSAGES) {
          break;
        }

        if (!message.ts || !message.text || !message.user) {
          continue;
        }

        const senderName = await resolveUserName(
          client,
          message.user
        );

        const isUnread = Boolean(
          channel.lastRead &&
            Number(message.ts) > Number(channel.lastRead)
        );

        documents.push(
          toBrainDocument({
            channelId: channel.id,
            channelName: channel.name,
            ts: message.ts,
            senderName,
            text: message.text,
            isUnread,
          })
        );
      }
    }

    return documents;
  }

  async search(query: string): Promise<BrainDocument[]> {
    const client = createSlackClient();

    const channels = await this.listDmChannels(client);

    const lowerQuery = query.toLowerCase();

    const documents: BrainDocument[] = [];

    for (const channel of channels) {
      const history =
        await client.conversations.history({
          channel: channel.id,
          limit: 100,
        });

      const messages = history.messages ?? [];

      for (const message of messages) {
        if (!message.ts || !message.text || !message.user) {
          continue;
        }

        if (
          !message.text
            .toLowerCase()
            .includes(lowerQuery)
        ) {
          continue;
        }

        const senderName = await resolveUserName(
          client,
          message.user
        );

        const isUnread = Boolean(
          channel.lastRead &&
            Number(message.ts) > Number(channel.lastRead)
        );

        documents.push(
          toBrainDocument({
            channelId: channel.id,
            channelName: channel.name,
            ts: message.ts,
            senderName,
            text: message.text,
            isUnread,
          })
        );
      }
    }

    return documents;
  }

  /**
   * List direct-message and group-DM channels for the
   * authenticated user, resolving a human-readable name
   * for each.
   */
  private async listDmChannels(
    client: ReturnType<typeof createSlackClient>
  ): Promise<SlackChannel[]> {
    const response = await client.conversations.list({
      types: "im,mpim",
      exclude_archived: true,
      limit: 200,
    });

    const conversations = response.channels ?? [];

    const channels: SlackChannel[] = [];

    for (const conversation of conversations) {
      if (!conversation.id) {
        continue;
      }

      const info = await client.conversations.info({
        channel: conversation.id,
      });

      let name = conversation.name ?? conversation.id;

      if (conversation.is_im && conversation.user) {
        name = await resolveUserName(
          client,
          conversation.user
        );
      }

      channels.push({
        id: conversation.id,
        name,
        lastRead: info.channel?.last_read,
      });
    }

    return channels;
  }
}
