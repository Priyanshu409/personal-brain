import {
  describe,
  expect,
  test,
} from "bun:test";

import app from "../src/app";

describe("Brain Routes", () => {
  test(
    "GET /brain/search requires a query",
    async () => {
      const response =
        await app.request(
          "/brain/search"
        );

      expect(response.status).toBe(400);

      const body = (await response.json()) as {
        error: string;
      };

      expect(body.error).toBe(
        "Query parameter 'q' is required"
      );
    }
  );
});