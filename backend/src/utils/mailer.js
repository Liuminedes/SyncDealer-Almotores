// backend/src/utils/mailer.js
import { createRequire } from "module";
import { ENV } from "../config/env.js";

const require     = createRequire(import.meta.url);
const nodemailer  = require("nodemailer");

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host:   ENV.SMTP_HOST,
    port:   ENV.SMTP_PORT,
    secure: ENV.SMTP_PORT === 465,
    auth: {
      user: ENV.SMTP_USER,
      pass: ENV.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false }, // útil en servidores internos sin cert válido
  });
  return _transporter;
}

/**
 * Envía el ZIP de comisiones a Talento Humano.
 * @param {Buffer} zipBuffer
 * @param {{ month: number, year: number, brand?: string, count: number }} meta
 */
export async function sendCommissionsToHR(zipBuffer, meta) {
  const MONTHS_ES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  const monthLabel = MONTHS_ES[meta.month] || meta.month;
  const subject    = meta.brand
    ? `Comisiones ${meta.brand} — ${monthLabel} ${meta.year}`
    : `Comisiones de ventas — ${monthLabel} ${meta.year}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#C0504D">Almotores S.A. — Comisiones de ventas</h2>
      <p>Se adjuntan <strong>${meta.count}</strong> liquidación(es) correspondiente(s) a
         <strong>${monthLabel} ${meta.year}</strong>${meta.brand ? ` · <strong>${meta.brand}</strong>` : ""}.</p>
      <p>El archivo ZIP contiene un PDF por cada asesor liquidado.</p>
      <hr style="border-color:#eee"/>
      <p style="font-size:12px;color:#888">
        Generado automáticamente por SyncDealer · ${new Date().toLocaleString("es-CO")}
      </p>
    </div>
  `;

  const filename = `comisiones_${meta.brand ? meta.brand + "_" : ""}${meta.year}_${String(meta.month).padStart(2,"0")}.zip`;

  await getTransporter().sendMail({
    from:    ENV.SMTP_FROM,
    to:      ENV.HR_EMAIL,
    subject,
    html,
    attachments: [{ filename, content: zipBuffer, contentType: "application/zip" }],
  });
}