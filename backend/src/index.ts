import app from "./app";

const port = Number(process.env.PORT ?? 3000);

/*
 * Bun kills a request's underlying connection after
 * `idleTimeout` seconds with no response sent, aborting
 * any in-flight fetch (e.g. to Ollama) with a
 * DOMException TimeoutError. Local LLM inference on
 * CPU-only hardware can take well over 120s for
 * multi-source answers, so the brain query routes get
 * an unlimited per-request timeout; everything else
 * keeps the 120s safety net.
 */
const UNTIMED_PATH_PREFIXES = ["/brain/ask", "/brain/search"];

export default {
  port,
  idleTimeout: 120,

  fetch(request: Request, server: import("bun").Server<unknown>) {
    const { pathname } = new URL(request.url);

    if (
      UNTIMED_PATH_PREFIXES.some((prefix) =>
        pathname.startsWith(prefix)
      )
    ) {
      server.timeout(request, 0);
    }

    return app.fetch(request, server);
  },
};

console.log(
  `Personal Brain API running on http://localhost:${port}`
);