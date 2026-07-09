import dotenv from "dotenv";
dotenv.config();

// ── Fail-fast: lanza error si una variable crítica no está definida ──────────
// Evita que la app arranque con secretos vacíos o predeterminados inseguros.
function requireEnv(key) {
  const val = process.env[key];
  if (!val || val.trim() === "") {
    throw new Error(
      `[FATAL] Variable de entorno requerida no definida: "${key}". ` +
      `Verifica el archivo .env del servidor antes de iniciar.`
    );
  }
  return val.trim();
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT:     Number(process.env.PORT || 5001),

  // Base de datos
  DB_HOST:     process.env.DB_HOST     || "127.0.0.1",
  DB_PORT:     Number(process.env.DB_PORT || 3306),
  DB_NAME:     requireEnv("DB_NAME"),
  DB_USER:     requireEnv("DB_USER"),
  DB_PASSWORD: requireEnv("DB_PASSWORD"),

  // JWT — NUNCA con fallback inseguro
  JWT_SECRET:     requireEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "8h",

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",

  // SMTP — NUNCA hardcodeados (credenciales reales eliminadas del código fuente)
  SMTP_HOST: requireEnv("SMTP_HOST"),
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: requireEnv("SMTP_USER"),
  SMTP_PASS: requireEnv("SMTP_PASS"),
  SMTP_FROM: requireEnv("SMTP_FROM"),
  HR_EMAIL:  requireEnv("HR_EMAIL"),
};