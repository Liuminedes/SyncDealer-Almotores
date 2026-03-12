// frontend/src/app/hooks/usePermissions.js
import { useAuthStore } from "../store/auth.store";

// ── Constantes de roles ────────────────────────────────────────────────────
export const ROLES = {
  ADMIN:           "ADMIN",
  ASSISTANT_SALES: "ASSISTANT_SALES",
  BRAND_MANAGER:   "BRAND_MANAGER",
  ADVISOR:         "ADVISOR",
};

const BRAND_OP_ROLES = [ROLES.ASSISTANT_SALES, ROLES.BRAND_MANAGER];

export function usePermissions() {
  const { user } = useAuthStore();
  const role = String(user?.role || "").toUpperCase();

  const is = {
    admin:     role === ROLES.ADMIN,
    brandOp:   BRAND_OP_ROLES.includes(role),
    advisor:   role === ROLES.ADVISOR,
  };

  // ── Dashboard ──────────────────────────────────────────────────────────
  const dashboard = {
    viewGlobal:     is.admin,
    viewOwnBrand:   is.admin || is.brandOp,
    viewOwn:        is.advisor,
    canSelectPeriod: is.admin || is.brandOp,
  };

  // ── Usuarios ───────────────────────────────────────────────────────────
  const users = {
    viewAll:          is.admin,
    viewBrandAdvisors: is.brandOp,
    create:           is.admin,
    editFull:         is.admin,
    editVacationOnly: is.brandOp,
    editOwnProfile:   true, // todos pueden editar su propio perfil
    toggleStatus:     is.admin,
    manageBrands:     is.admin,
  };

  // ── Vehículos ──────────────────────────────────────────────────────────
  const vehicles = {
    view:   is.admin || is.brandOp,
    create: is.admin || is.brandOp,
    edit:   is.admin || is.brandOp,
    delete: is.admin,
  };

  // ── Ventas ─────────────────────────────────────────────────────────────
  const sales = {
    viewAll:   is.admin,
    viewBrand: is.brandOp,
    viewOwn:   is.advisor,
    create:    is.admin || is.brandOp,
    edit:      is.admin || is.brandOp,
    delete:    is.admin,
  };

  // ── Parámetros de marca ────────────────────────────────────────────────
  const brandParams = {
    view:            is.admin || is.brandOp,
    changeMotorType: is.admin,          // RANGES ↔ PERCENTAGES solo Admin
    editTiers:       is.admin || is.brandOp,
    manageRules:     is.admin || is.brandOp,
    manageBrands:    is.admin,          // crear/eliminar marcas
  };

  // ── Corridas de comisión ───────────────────────────────────────────────
  const runs = {
    viewBrand:      is.admin || is.brandOp,
    viewOwn:        is.advisor,
    create:         is.admin || is.brandOp,
    calculate:      is.admin || is.brandOp,
    delete:         is.admin || is.brandOp,   // solo DRAFT/CALCULATED
    // Flujo de aprobación
    advisorApprove: is.advisor,
    advisorReject:  is.advisor,
    asstValidate:   is.admin || is.brandOp,   // tras ADVISOR_APPROVED
    sendToHR:       is.admin || is.brandOp,   // tras ASST_VALIDATED
    // Estado genérico (admin fuerza cualquier estado)
    forceStatus:    is.admin,
  };

  // ── Exportaciones ──────────────────────────────────────────────────────
  const exports = {
    downloadOwn:    is.advisor,   // solo su PDF cuando está APPROVED
    downloadBrand:  is.admin || is.brandOp,
    downloadZip:    is.admin || is.brandOp,
    sendToHR:       is.admin,
  };

  return {
    role,
    is,
    dashboard,
    users,
    vehicles,
    sales,
    brandParams,
    runs,
    exports,
  };
}