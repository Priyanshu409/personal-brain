import {
  describe,
  expect,
  test,
} from "bun:test";

import { GBrainService } from "../src/services/gbrainService";

describe("GBrain Service", () => {
  test(
    "can search the local brain",
    async () => {
      const service = new GBrainService();

      const result = await service.search("test");

      expect(result).toBeDefined();

      if (!result) {
        throw new Error("GBrain search returned no result");
      }

      expect(typeof result).toBe("object");

      expect(result.query).toBe("test");

      expect(typeof result.count).toBe("number");

      expect(Array.isArray(result.results)).toBe(true);

      const firstResult = result.results[0];

      if (firstResult) {
        expect(typeof firstResult.score).toBe("number");
        expect(typeof firstResult.id).toBe("string");

        expect(["gmail", "drive"]).toContain(
          firstResult.source
        );

        expect(typeof firstResult.title).toBe("string");
        expect(typeof firstResult.content).toBe("string");
      }
    },
    15000
  );
});