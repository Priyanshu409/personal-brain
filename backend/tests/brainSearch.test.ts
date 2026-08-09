import {
  describe,
  expect,
  test,
} from "bun:test";

import {
  BrainSearchService,
} from "../src/services/brainSearchService";

describe("BrainSearchService", () => {
  test("searches the brain", async () => {
    const fakeBrain = {
      async search(query: string) {
        return `Search results for: ${query}`;
      },
    };

    const service =
      new BrainSearchService(fakeBrain);

    const result =
      await service.search(
        "backend interview"
      );

    expect(result).toBe(
      "Search results for: backend interview"
    );
  });

  test("rejects an empty query", async () => {
    const fakeBrain = {
      async search() {
        return "should not be called";
      },
    };

    const service =
      new BrainSearchService(fakeBrain);

    await expect(
      service.search("")
    ).rejects.toThrow(
      "Search query is required"
    );
  });

  test("rejects a whitespace-only query", async () => {
    const fakeBrain = {
      async search() {
        return "should not be called";
      },
    };

    const service =
      new BrainSearchService(fakeBrain);

    await expect(
      service.search("   ")
    ).rejects.toThrow(
      "Search query is required"
    );
  });
});