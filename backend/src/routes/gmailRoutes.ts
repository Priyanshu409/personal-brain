import { Hono } from "hono";

import { GmailConnector } from "../connectors/GmailConnector";
import { GBrainService } from "../services/gbrainService";
import { IngestionService } from "../services/ingestionService";

const gmailRoutes = new Hono();

/**
 * Preview/fetch Gmail messages.
 *
 * This endpoint only reads Gmail.
 * It does NOT write anything to the brain.
 */
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

/**
 * Sync Gmail messages into the Personal Brain.
 *
 * Gmail → BrainDocument → GBrain
 */
gmailRoutes.post("/sync", async (c) => {
  try {
    const connector = new GmailConnector();

    const documents = await connector.sync();

    const brain = new GBrainService();

    const ingestion = new IngestionService(brain);

    const ingested = await ingestion.ingestMany(
      documents
    );

    return c.json({
      source: connector.getName(),
      fetched: documents.length,
      ingested,
      status: "success",
    });
  } catch (error) {
    console.error(
      "Gmail brain sync failed:",
      error
    );

    return c.json(
      {
        error: "Failed to ingest Gmail into brain",
      },
      500
    );
  }
});

/**
 * Search Gmail directly.
 *
 * This searches Gmail itself, not the local brain.
 */
gmailRoutes.get("/search", async (c) => {
  const query = c.req.query("q");

  if (!query) {
    return c.json(
      {
        error:
          "Query parameter 'q' is required",
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
    console.error(
      "Gmail search failed:",
      error
    );

    return c.json(
      {
        error: "Failed to search Gmail",
      },
      500
    );
  }
});

export default gmailRoutes;