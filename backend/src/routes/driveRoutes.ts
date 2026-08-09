import { Hono } from "hono";

import { DriveConnector } from "../connectors/DriveConnector";

const driveRoutes = new Hono();

driveRoutes.get("/sync", async (c) => {
  try {
    const connector = new DriveConnector();

    const documents = await connector.sync();

    return c.json({
      source: connector.getName(),
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error("Drive sync failed:", error);

    return c.json(
      {
        error: "Failed to sync Google Drive",
      },
      500
    );
  }
});

driveRoutes.get("/search", async (c) => {
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
    const connector = new DriveConnector();

    const documents = await connector.search(query);

    return c.json({
      source: connector.getName(),
      query,
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error("Drive search failed:", error);

    return c.json(
      {
        error: "Failed to search Google Drive",
      },
      500
    );
  }
});

export default driveRoutes;