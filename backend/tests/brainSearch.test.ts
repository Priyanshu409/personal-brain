import {
  describe,
  expect,
  test,
} from "bun:test";

import {
  BrainSearchService,
  type BrainSearchResponse,
} from "../src/services/brainSearchService";

function createFakeResponse(
  query: string
): BrainSearchResponse {
  return {
    query,
    count: 1,
    results: [
      {
        score: 0.95,
        id: "gmail/test-123",
        source: "gmail",
        title: "Java Backend Interview",
        content:
          "Java and Spring Boot interview preparation",
      },
    ],
  };
}

describe("BrainSearchService", () => {
  test("searches the brain", async () => {
    const fakeBrain = {
      async search(query: string): Promise<BrainSearchResponse> {
        return createFakeResponse(query);
      },
    };

    const service = new BrainSearchService(fakeBrain);

    const result = await service.search(
      "backend interview"
    );

    expect(result.query).toBe(
      "backend interview"
    );

    expect(result.count).toBe(1);

    expect(result.results).toHaveLength(1);

    expect(result.results[0]?.score).toBe(0.95);

    expect(result.results[0]?.id).toBe(
      "gmail/test-123"
    );

    expect(result.results[0]?.source).toBe(
      "gmail"
    );

    expect(result.results[0]?.title).toBe(
      "Java Backend Interview"
    );

    expect(result.results[0]?.content).toBe(
      "Java and Spring Boot interview preparation"
    );
  });

  test("rejects an empty query", async () => {
    const fakeBrain = {
      async search(
        query: string
      ): Promise<BrainSearchResponse> {
        return createFakeResponse(query);
      },
    };

    const service = new BrainSearchService(fakeBrain);

    await expect(
      service.search("")
    ).rejects.toThrow(
      "Search query is required"
    );
  });

  test("rejects a whitespace-only query", async () => {
    const fakeBrain = {
      async search(
        query: string
      ): Promise<BrainSearchResponse> {
        return createFakeResponse(query);
      },
    };

    const service = new BrainSearchService(fakeBrain);

    await expect(
      service.search("   ")
    ).rejects.toThrow(
      "Search query is required"
    );
  });
});