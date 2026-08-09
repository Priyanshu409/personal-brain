import { Hono } from "hono";
import authRoutes from "./routes/authRoutes";
import gmailRoutes from "./routes/gmailRoutes";
import driveRoutes from "./routes/driveRoutes";
import brainRoutes from "./routes/brainRoutes";

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

app.route("/drive", driveRoutes);

app.route("/brain", brainRoutes);

export default app;