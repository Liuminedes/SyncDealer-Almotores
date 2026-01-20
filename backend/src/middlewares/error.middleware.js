export function notFoundMiddleware(req, res) {
  res.status(404).json({ message: "Ruta no encontrada" });
}

export function errorMiddleware(err, req, res, next) {
  const status = err.statusCode || 500;
  const message = err.message || "Error interno";

  if (status >= 500) {
    console.error("🔥 Error:", err);
  }

  res.status(status).json({ message });
}
