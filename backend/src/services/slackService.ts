import { WebClient } from "@slack/web-api";

import { getSlackConfig } from "../config/slack";

export function createSlackClient(): WebClient {
  const config = getSlackConfig();

  return new WebClient(config.userToken);
}

const userNameCache = new Map<string, string>();

/**
 * Resolve a Slack user ID into a display name,
 * caching results for the lifetime of the process.
 */
export async function resolveUserName(
  client: WebClient,
  userId: string
): Promise<string> {
  const cached = userNameCache.get(userId);

  if (cached) {
    return cached;
  }

  try {
    const response = await client.users.info({
      user: userId,
    });

    const name =
      response.user?.profile?.real_name ??
      response.user?.real_name ??
      response.user?.name ??
      userId;

    userNameCache.set(userId, name);

    return name;
  } catch (error) {
    console.warn(
      `Failed to resolve Slack user name: ${userId}`,
      error
    );

    return userId;
  }
}

/**
 * Re-fetch a single DM message's text directly from Slack.
 *
 * Needed because, like Gmail/Drive, `gbrain query` only
 * returns id/title/score — the actual content must be
 * re-hydrated from the source after retrieval.
 */
export async function getSlackMessageContent(
  client: WebClient,
  channelId: string,
  ts: string
): Promise<string> {
  try {
    const response = await client.conversations.history({
      channel: channelId,
      latest: ts,
      oldest: ts,
      inclusive: true,
      limit: 1,
    });

    const message = response.messages?.[0];

    return message?.text ?? "";
  } catch (error) {
    console.warn(
      `Skipping unreadable Slack message: ${channelId}/${ts}`,
      error
    );

    return "";
  }
}
