import { Hono } from "hono";

import { BrainSearchService } from "../services/brainSearchService";
import { BrainSyncService } from "../services/brainSyncService";
import { BrainAnswerService } from "../services/brainAnswerService";

const brainRoutes = new Hono();

let syncRunning = false;

const BUSY_MESSAGE =
  "Personal Brain is currently syncing or busy with another request. Please try again in a moment.";

/*
 * Errors whose messages are already written to be shown
 * directly to the end user (as opposed to raw CLI/library
 * error text, which shouldn't leak to the client).
 */
const USER_SAFE_ERROR_MESSAGES = new Set([
  BUSY_MESSAGE,
  "The local model (Ollama) did not respond in time. It may be stuck or overloaded — try restarting Ollama and asking again.",
]);

function userSafeErrorMessage(
  error: unknown
): string | null {
  if (
    error instanceof Error &&
    USER_SAFE_ERROR_MESSAGES.has(error.message)
  ) {
    return error.message;
  }

  return null;
}

/**
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

/**
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

/**
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

    const safeMessage =
      userSafeErrorMessage(error);

    if (safeMessage) {
      return c.json(
        { error: safeMessage },
        503
      );
    }

    return c.json(
      {
        error:
          "Failed to generate Personal Brain answer",
      },
      500
    );
  }
});

/**
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

      const safeMessage =
        userSafeErrorMessage(error);

      if (safeMessage) {
        return c.json(
          { error: safeMessage },
          503
        );
      }

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