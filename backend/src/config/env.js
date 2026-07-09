import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 5001),

  DB_HOST:     process.env.DB_HOST     || "localhost",
  DB_PORT:     Number(process.env.DB_PORT || 3306),
  DB_NAME:     process.env.DB_NAME     || "sync_dealer_almotores",
  DB_USER:     process.env.DB_USER     || "root",
  DB_PASSWORD: process.env.DB_PASSWORD || "",

  JWT_SECRET:     process.env.JWT_SECRET     || "change_me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1d",

  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",

  // SMTP — añadir al .env del servidor
  SMTP_HOST: process.env.SMTP_HOST || "162.222.203.106",
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER || "syncdealer@almotores.com",
  SMTP_PASS: process.env.SMTP_PASS || "bWSzxMI!odnP*HL,",
  SMTP_FROM: process.env.SMTP_FROM || "SyncDealer | Desprendibles <syncdealer@almotores.com>",
  HR_EMAIL:  process.env.HR_EMAIL  || "auxinformatica2@almotores.com",
};