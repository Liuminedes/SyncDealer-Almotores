import { HttpError } from "../utils/httpError.js";

export function notFoundMiddleware(req, res) {
  res.status(404).json({ message: "Ruta no encontrada" });
}

export function errorMiddleware(err, req, res, next) {
  const status = err.statusCode || 500;

  if (status >= 500) {
    // Log completo en servidor — NUNCA se envía al cliente
    console.error("🔥 Error interno:", {
      message: err.message,
      stack:   err.stack,
      sql:     err.parent?.sql     || undefined, // Error de Sequelize
      sqlMsg:  err.parent?.sqlMessage || undefined,
    });
  }

  // Solo HttpError son errores "de negocio" con mensajes seguros para el cliente.
  // Cualquier otro error (Sequelize, Node runtime, etc.) recibe mensaje genérico.
  const isOperational = err instanceof HttpError;
  const clientMessage = isOperational
    ? err.message
    : "Error interno del servidor. Contacta al administrador.";

  res.status(status).json({ message: clientMessage });
}
