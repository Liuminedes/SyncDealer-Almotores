import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { ENV } from "./config/env.js";
import routes from "./routes/index.js";
import { notFoundMiddleware } from "./middlewares/error.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

export function createApp() {
  const app = express();

  // Security & basics
  app.use(helmet());
  app.use(
    cors({
      origin: ENV.CORS_ORIGIN,
      credentials: true,
    })
  );

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use(morgan("dev"));

  // Rate limit (suave por ahora)
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // Health
  app.get("/health", (req, res) => {
    res.json({ ok: true, service: "sync-dealer-almotores-api" });
  });

  // API routes
  app.use("/api", routes);

  // Errors
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
