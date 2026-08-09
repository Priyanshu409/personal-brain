import { Hono } from "hono";

import { BrainSyncService } from "../services/brainSyncService";

const brainRoutes = new Hono();

brainRoutes.post("/sync", async (c) => {
  try {
    const syncService =
      new BrainSyncService();

    const results =
      await syncService.sync();

    const fetched = results.reduce(
      (total, result) =>
        total + result.fetched,
      0
    );

    const ingested = results.reduce(
      (total, result) =>
        total + result.ingested,
      0
    );

    return c.json({
      status: "success",
      fetched,
      ingested,
      sources: results,
    });
  } catch (error) {
    console.error(
      "Brain sync failed:",
      error
    );

    return c.json(
      {
        error: "Failed to sync personal brain",
      },
      500
    );
  }
});

export default brainRoutes;