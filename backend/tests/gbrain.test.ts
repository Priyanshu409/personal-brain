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
      expect(typeof result).toBe("string");
    },
    15000
  );
});