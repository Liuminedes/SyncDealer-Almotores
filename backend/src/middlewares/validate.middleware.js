// src/middlewares/validate.middleware.js
import { HttpError } from "../utils/httpError.js";

/**
 * validate(schemaOrParts, where?)
 *
 * Soporta:
 * 1) validate(zodSchema) -> valida { body, query, params }
 * 2) validate({ query: z.object(...), body: z.object(...), params: z.object(...) })
 *
 * NO reescribe req.query / req.params / req.body (evita el error de getter-only).
 * Guarda el resultado en req.validated.
 */
export function validate(schema) {
  return (req, _res, next) => {
    try {
      if (!schema) throw new HttpError(500, "Schema de validación no definido");

      // Helper para mapear errores Zod
      const zodIssues = (err) =>
        err?.issues?.map((i) => ({
          path: Array.isArray(i.path) ? i.path.join(".") : String(i.path || ""),
          message: i.message,
        })) || [];

      // ✅ Caso A: schema Zod directo (tiene safeParse)
      if (typeof schema.safeParse === "function") {
        const result = schema.safeParse({
          body: req.body,
          query: req.query,
          params: req.params,
        });

        if (!result.success) {
          throw new HttpError(400, "Solicitud inválida (validación)", {
            issues: zodIssues(result.error),
          });
        }

        // Guardamos validated (sin mutar req.query)
        req.validated = result.data;
        return next();
      }

      // ✅ Caso B: schema por partes { query, body, params }
      const validated = {
        body: req.body,
        query: req.query,
        params: req.params,
      };

      if (schema.body) {
        if (typeof schema.body.safeParse !== "function") {
          throw new HttpError(500, "schema.body no es un Zod schema");
        }
        const r = schema.body.safeParse(req.body);
        if (!r.success) {
          throw new HttpError(400, "Body inválido", { issues: zodIssues(r.error) });
        }
        validated.body = r.data;
      }

      if (schema.query) {
        if (typeof schema.query.safeParse !== "function") {
          throw new HttpError(500, "schema.query no es un Zod schema");
        }
        const r = schema.query.safeParse(req.query);
        if (!r.success) {
          throw new HttpError(400, "Query inválida", { issues: zodIssues(r.error) });
        }
        validated.query = r.data;
      }

      if (schema.params) {
        if (typeof schema.params.safeParse !== "function") {
          throw new HttpError(500, "schema.params no es un Zod schema");
        }
        const r = schema.params.safeParse(req.params);
        if (!r.success) {
          throw new HttpError(400, "Params inválidos", { issues: zodIssues(r.error) });
        }
        validated.params = r.data;
      }

      req.validated = validated;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
