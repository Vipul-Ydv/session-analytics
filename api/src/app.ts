import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { eventsRouter } from "./routes/events.js";
import { readRouter } from "./routes/read.js";

type AppOptions = {
  /** Runs before every API request, e.g. to open the database connection on a cold start. */
  beforeRequest?: () => Promise<unknown>;
};

export function createApp(options: AppOptions = {}) {
  const app = express();
  app.disable("x-powered-by");
  // Open CORS: the tracker is embedded on arbitrary sites, and the dashboard lives on another origin.
  app.use(cors());
  app.use(express.json({ limit: "200kb" }));
  app.use(express.text({ type: "text/plain", limit: "200kb" }));

  if (options.beforeRequest) {
    const hook = options.beforeRequest;
    app.use("/api", (_req, _res, next) => {
      hook().then(() => next(), next);
    });
  }

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/api/events", eventsRouter);
  app.use("/api", readRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Always answer with JSON; never leave a serverless function in a broken state.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = typeof err === "object" && err !== null && "status" in err ? Number((err as { status: number }).status) : 500;
    if (status >= 500) console.error(err);
    res.status(status >= 400 && status < 600 ? status : 500).json({ error: status >= 500 ? "Internal server error" : "Bad request" });
  });

  return app;
}
