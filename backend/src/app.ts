import { Hono } from "hono";
import authRoutes from "./routes/authRoutes";
import gmailRoutes from "./routes/gmailRoutes";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    name: "Personal Brain API",
    version: "0.1.0",
    status: "running",
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "personal-brain-api",
  });
});

app.route("/auth", authRoutes);

app.route("/gmail", gmailRoutes);

export default app;