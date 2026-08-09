import { Hono } from "hono";

import { GmailConnector } from "../connectors/GmailConnector";

const gmailRoutes = new Hono();

gmailRoutes.get("/sync", async (c) => {
  try {
    const connector = new GmailConnector();

    const documents = await connector.sync();

    return c.json({
      source: connector.getName(),
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error("Gmail sync failed:", error);

    return c.json(
      {
        error: "Failed to sync Gmail",
      },
      500
    );
  }
});

gmailRoutes.get("/search", async (c) => {
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
    const connector = new GmailConnector();

    const documents =
      await connector.search(query);

    return c.json({
      source: connector.getName(),
      query,
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error("Gmail search failed:", error);

    return c.json(
      {
        error: "Failed to search Gmail",
      },
      500
    );
  }
});

export default gmailRoutes;