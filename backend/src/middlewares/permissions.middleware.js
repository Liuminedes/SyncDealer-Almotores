import { sequelize } from "../config/db.js";
import { HttpError } from "../utils/httpError.js";

// ✅ Roles (ADMIN, etc.)
export function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.user;
    if (!user?.role) return next(new HttpError(401, "No autenticado"));

    const allowed = roles.map((r) => String(r).toUpperCase());
    const current = String(user.role).toUpperCase();

    if (!allowed.includes(current)) {
      return next(new HttpError(403, "No autorizado"));
    }
    next();
  };
}

// action: "view" | "generate"
export function requireBrandPermission(action, getBrandCodeFromReq) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user?.id) throw new HttpError(401, "No autenticado");

      const brandCode = (getBrandCodeFromReq?.(req) || "").toUpperCase();
      if (!brandCode) throw new HttpError(400, "Marca requerida");

      // Admin bypass (si lo quieres)
      // if (String(user.role).toUpperCase() === "ADMIN") return next();

      const [rows] = await sequelize.query(
        `
        SELECT uba.can_view, uba.can_generate
        FROM user_brand_access uba
        JOIN brands b ON b.id = uba.brand_id
        WHERE uba.user_id = :userId AND b.code = :brandCode
        LIMIT 1
        `,
        { replacements: { userId: user.id, brandCode } }
      );

      const access = rows?.[0];
      if (!access) throw new HttpError(403, "Sin acceso a esta marca");

      if (action === "view" && !access.can_view) {
        throw new HttpError(403, "Sin permiso de lectura para esta marca");
      }
      if (action === "generate" && !access.can_generate) {
        throw new HttpError(403, "Sin permiso de generación para esta marca");
      }

      req.brand = {
        code: brandCode,
        can_view: !!access.can_view,
        can_generate: !!access.can_generate,
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
