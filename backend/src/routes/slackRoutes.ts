import { Hono } from "hono";

import { SlackConnector } from "../connectors/SlackConnector";

const slackRoutes = new Hono();

slackRoutes.get("/sync", async (c) => {
  try {
    const connector = new SlackConnector();

    const documents = await connector.sync();

    return c.json({
      source: connector.getName(),
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error("Slack sync failed:", error);

    return c.json(
      {
        error: "Failed to sync Slack",
      },
      500
    );
  }
});

slackRoutes.get("/search", async (c) => {
  const query = c.req.query("q");

  if (!query) {
    return c.json(
      {
        error: "Query parameter 'q' is required",
      },
      400
    );
  }

  try {
    const connector = new SlackConnector();

    const documents = await connector.search(query);

    return c.json({
      source: connector.getName(),
      query,
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error("Slack search failed:", error);

    return c.json(
      {
        error: "Failed to search Slack",
      },
      500
    );
  }
});

export default slackRoutes;
