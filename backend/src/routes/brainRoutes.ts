import { Hono } from "hono";

import { BrainSearchService } from "../services/brainSearchService";
import { BrainSyncService } from "../services/brainSyncService";
import { BrainAnswerService } from "../services/brainAnswerService";

const brainRoutes = new Hono();

let syncRunning = false;

/*
 * Start background brain synchronization.
 */
brainRoutes.post("/sync", async (c) => {
  if (syncRunning) {
    return c.json(
      {
        status: "already_running",
        message:
          "Brain sync is already in progress",
      },
      409
    );
  }

  syncRunning = true;

  void (async () => {
    try {
      const syncService =
        new BrainSyncService();

      const results =
        await syncService.sync();

      const fetched =
        results.reduce(
          (total, result) =>
            total + result.fetched,
          0
        );

      const ingested =
        results.reduce(
          (total, result) =>
            total + result.ingested,
          0
        );

      console.log(
        "Brain sync completed:",
        {
          fetched,
          ingested,
          sources: results,
        }
      );
    } catch (error) {
      console.error(
        "Background brain sync failed:",
        error
      );
    } finally {
      syncRunning = false;
    }
  })();

  return c.json({
    status: "started",
    message:
      "Brain sync started in the background",
  });
});

/*
 * Check whether a brain synchronization
 * is currently running.
 */
brainRoutes.get(
  "/sync/status",
  (c) => {
    return c.json({
      running: syncRunning,
    });
  }
);

/*
 * Ask the Personal Brain a question.
 *
 * Example:
 * GET /brain/ask?q=What companies are hiring in Noida
 */
brainRoutes.get("/ask", async (c) => {
  const query = c.req.query("q");

  if (!query?.trim()) {
    return c.json(
      {
        error:
          "Query parameter 'q' is required",
      },
      400
    );
  }

  try {
    const answerService =
      new BrainAnswerService();

    const result =
      await answerService.ask(query);

    return c.json(result);
  } catch (error) {
    console.error(
      "Brain answer failed:",
      error
    );

    return c.json(
      {
        error:
          "Failed to generate Personal Brain answer",
      },
      500
    );
  }
});

/*
 * Search the Personal Brain.
 *
 * Example:
 * GET /brain/search?q=Java backend
 */
brainRoutes.get(
  "/search",
  async (c) => {
    const query = c.req.query("q");

    if (!query?.trim()) {
      return c.json(
        {
          error:
            "Query parameter 'q' is required",
        },
        400
      );
    }

    try {
      const searchService =
        new BrainSearchService();

      const result =
        await searchService.search(
          query
        );

      return c.json({
        query,
        result,
      });
    } catch (error) {
      console.error(
        "Brain search failed:",
        error
      );

      return c.json(
        {
          error:
            "Failed to search personal brain",
        },
        500
      );
    }
  }
);

export default brainRoutes;