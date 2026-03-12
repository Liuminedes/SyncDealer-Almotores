// backend/src/middlewares/permissions.middleware.js
import { sequelize } from "../config/db.js";
import { HttpError }  from "../utils/httpError.js";

// ── Constantes de roles ────────────────────────────────────────────────────
export const ROLES = {
  ADMIN:           "ADMIN",
  ASSISTANT_SALES: "ASSISTANT_SALES",
  BRAND_MANAGER:   "BRAND_MANAGER",
  ADVISOR:         "ADVISOR",
};

// Roles que operan sobre una sola marca asignada
export const BRAND_OP_ROLES = [ROLES.ASSISTANT_SALES, ROLES.BRAND_MANAGER];

// Helper interno
const role = (user) => String(user?.role || "").toUpperCase();
const isAdmin       = (user) => role(user) === ROLES.ADMIN;
const isBrandOp     = (user) => BRAND_OP_ROLES.includes(role(user));
const isAdvisor     = (user) => role(user) === ROLES.ADVISOR;

// ── 1) requireAuth ya existe en auth.middleware — este es el de ROLES ──────
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role) return next(new HttpError(401, "No autenticado"));
    const allowed = roles.map((r) => String(r).toUpperCase());
    if (!allowed.includes(role(req.user)))
      return next(new HttpError(403, "No autorizado para esta acción"));
    next();
  };
}

// ── 2) Admin o brand operator (ASST/BM) ───────────────────────────────────
export function requireAdminOrBrandOp() {
  return requireRole(ROLES.ADMIN, ROLES.ASSISTANT_SALES, ROLES.BRAND_MANAGER);
}

// ── 3) requireBrandPermission — verifica acceso a una marca ───────────────
//    Admin: bypass automático (accede a todo)
//    BrandOp: verifica user_brand_access Y que el brand_id coincida
//    Advisor: sin acceso a rutas de marca (usar requireOwnAdvisor)
export function requireBrandPermission(action, getBrandCodeFromReq) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user?.id) throw new HttpError(401, "No autenticado");

      const brandCode = (getBrandCodeFromReq?.(req) || "").toUpperCase();
      if (!brandCode) throw new HttpError(400, "Marca requerida (?brand=CODE)");

      // Admin tiene acceso total
      if (isAdmin(user)) {
        req.brand = { code: brandCode, can_view: true, can_generate: true };
        return next();
      }

      // Advisor no accede a rutas de marca
      if (isAdvisor(user)) throw new HttpError(403, "Sin acceso a esta marca");

      // BrandOp — verificar en user_brand_access
      const [rows] = await sequelize.query(
        `SELECT uba.can_view, uba.can_generate
         FROM user_brand_access uba
         JOIN brands b ON b.id = uba.brand_id
         WHERE uba.user_id = :userId AND b.code = :brandCode
         LIMIT 1`,
        { replacements: { userId: user.id, brandCode } }
      );

      const access = rows?.[0];
      if (!access) throw new HttpError(403, "Sin acceso a esta marca");

      if (action === "view" && !access.can_view)
        throw new HttpError(403, "Sin permiso de lectura para esta marca");
      if (action === "generate" && !access.can_generate)
        throw new HttpError(403, "Sin permiso de operación para esta marca");

      req.brand = {
        code:         brandCode,
        can_view:     !!access.can_view,
        can_generate: !!access.can_generate,
      };
      next();
    } catch (err) { next(err); }
  };
}

// ── 4) requireOwnAdvisor — solo el propio asesor (o admin) accede ──────────
//    Útil para: ver mi comisión, mis ventas, aprobar mi corrida
export function requireOwnAdvisor(getAdvisorIdFromReq) {
  return (req, res, next) => {
    const user = req.user;
    if (!user?.id) return next(new HttpError(401, "No autenticado"));
    if (isAdmin(user)) return next(); // admin puede ver todo

    if (!isAdvisor(user))
      return next(new HttpError(403, "Solo asesores pueden acceder a esta ruta"));

    const advisorId = getAdvisorIdFromReq?.(req);
    if (advisorId && Number(advisorId) !== Number(user.id))
      return next(new HttpError(403, "Solo puedes acceder a tu propia información"));

    next();
  };
}

// ── 5) requireBrandOpForAdvisor — BrandOp puede ver/editar asesores ────────
//    de su propia marca ÚNICAMENTE, y solo el campo de vacaciones
export function requireBrandOpForAdvisor() {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user?.id) throw new HttpError(401, "No autenticado");
      if (isAdmin(user)) return next();
      if (!isBrandOp(user)) throw new HttpError(403, "No autorizado");

      // Verificar que el asesor objetivo pertenece a la marca del BrandOp
      const advisorId = Number(req.params.id || req.params.advisorId);
      if (!advisorId) throw new HttpError(400, "ID de asesor requerido");

      const [rows] = await sequelize.query(
        `SELECT uba_advisor.user_id
         FROM user_brand_access uba_op
         JOIN user_brand_access uba_advisor ON uba_advisor.brand_id = uba_op.brand_id
         JOIN users u ON u.id = uba_advisor.user_id
         JOIN roles r ON r.id = u.role_id
         WHERE uba_op.user_id = :opUserId
           AND uba_advisor.user_id = :advisorId
           AND r.name = 'ADVISOR'
           AND u.is_active = 1
         LIMIT 1`,
        { replacements: { opUserId: user.id, advisorId } }
      );

      if (!rows?.[0]) throw new HttpError(403, "Este asesor no pertenece a tu marca");
      next();
    } catch (err) { next(err); }
  };
}

// ── 6) requireAdminOnly — acceso exclusivo Admin ───────────────────────────
export function requireAdminOnly() {
  return requireRole(ROLES.ADMIN);
}

// ── 7) requireNotAdvisor — cualquier rol excepto ADVISOR ──────────────────
export function requireNotAdvisor() {
  return (req, res, next) => {
    if (!req.user?.role) return next(new HttpError(401, "No autenticado"));
    if (isAdvisor(req.user)) return next(new HttpError(403, "No autorizado"));
    next();
  };
}