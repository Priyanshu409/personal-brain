import {
  describe,
  expect,
  test,
} from "bun:test";

import app from "../src/app";

describe("Application Routes", () => {
  test("GET / returns API information", async () => {
    const response = await app.request("/");

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      name: string;
      version: string;
      status: string;
    };

    expect(body.name).toBe(
      "Personal Brain API"
    );

    expect(body.version).toBe("0.1.0");

    expect(body.status).toBe("running");
  });

  test("GET /health returns healthy status", async () => {
    const response = await app.request(
      "/health"
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      status: string;
      service: string;
    };

    expect(body.status).toBe("ok");

    expect(body.service).toBe(
      "personal-brain-api"
    );
  });

  test("GET /gmail/search requires query", async () => {
    const response = await app.request(
      "/gmail/search"
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      error: string;
    };

    expect(body.error).toBe(
      "Query parameter 'q' is required"
    );
  });

  test("GET /drive/search requires query", async () => {
    const response = await app.request(
      "/drive/search"
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      error: string;
    };

    expect(body.error).toBe(
      "Query parameter 'q' is required"
    );
  });
});