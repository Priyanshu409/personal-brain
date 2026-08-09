import { describe, expect, test } from "bun:test";
import app from "../src/app";

describe("Health API", () => {
  test("GET /health returns healthy status", async () => {
    const response = await app.fetch(
      new Request("http://localhost/health")
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toEqual({
      status: "ok",
      service: "personal-brain-api",
    });
  });

  test("GET / returns API information", async () => {
    const response = await app.fetch(
      new Request("http://localhost/")
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
    name: string;
    version: string;
    status: string;
    };

    expect(body.name).toBe("Personal Brain API");
    expect(body.version).toBe("0.1.0");
    expect(body.status).toBe("running");
  });
});