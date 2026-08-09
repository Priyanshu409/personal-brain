import app from "./app";

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  idleTimeout: 120,
  fetch: app.fetch,
};

console.log(
  `Personal Brain API running on http://localhost:${port}`
);