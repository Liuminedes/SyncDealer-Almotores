import { HttpError } from "../utils/httpError.js";

export function validate(schema) {
  return (req, res, next) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err) {
      const message =
        err?.errors?.[0]?.message ||
        "Solicitud inválida (validación)";
      next(new HttpError(400, message));
    }
  };
}
