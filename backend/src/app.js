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

  // ── Seguridad de cabeceras HTTP ────────────────────────────────────────────
  app.use(helmet());

  // ── CORS con whitelist estricta ────────────────────────────────────────────
  // Soporta múltiples orígenes separados por coma en CORS_ORIGIN
  const ALLOWED_ORIGINS = ENV.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Permitir requests sin Origin (Postman, apps móviles internas, health checks)
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error(`CORS: origen no permitido: ${origin}`));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ── Logging: dev en local, combinado en producción ─────────────────────────
  if (ENV.NODE_ENV !== "production") {
    app.use(morgan("dev"));
  } else {
    // Formato combinado omite query strings con tokens en logs de VPS
    app.use(morgan("combined"));
  }

  // ── Rate limiting por capas ────────────────────────────────────────────────

  // Capa 1: límite estricto SOLO para autenticación (anti brute-force)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 15,                   // 15 intentos por IP por ventana
    message: { message: "Demasiados intentos de acceso. Inténtalo en 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // No penaliza logins exitosos
  });

  // Capa 2: límite general para el resto de la API
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(generalLimiter);

  // ── Health ─────────────────────────────────────────────────────────────────
  app.get("/health", (req, res) => {
    res.json({ ok: true, service: "sync-dealer-almotores-api" });
  });

  // ── Aplicar rate limit de auth ANTES del router general ───────────────────
  app.use("/api/auth/login", authLimiter);

  // ── API routes ────────────────────────────────────────────────────────────
  app.use("/api", routes);

  // ── Manejo de errores ─────────────────────────────────────────────────────
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
