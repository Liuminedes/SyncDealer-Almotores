import { Navigate, useLocation } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import { useAuthStore } from "../../app/store/auth.store";
import { usePermissions, ROLES } from "../../app/hooks/usePermissions";

// ── Mapa: ruta → qué permiso la protege ──────────────────────────────────
function canAccessRoute(pathname, perms) {
  if (pathname.startsWith("/branches"))            return perms.is.admin;
  if (pathname === "/brands")                      return perms.is.admin;          // lista solo admin
  if (pathname.startsWith("/brands/"))             return perms.is.admin || perms.is.brandOp; // detalle también brandOp
  if (pathname.startsWith("/users"))               return perms.is.admin || perms.is.brandOp;
  if (pathname.startsWith("/vehicles"))            return perms.vehicles.view;
  if (pathname.startsWith("/commissions"))         return perms.runs.viewBrand;
  if (pathname.startsWith("/reports"))             return perms.is.admin || perms.is.brandOp;
  if (pathname.startsWith("/sales"))               return true; // filtrado internamente
  if (pathname === "/dashboard")                   return true; // cada rol ve su propia vista
  if (pathname.startsWith("/advisor"))             return perms.is.advisor;
  return true;
}

function defaultRoute(role) {
  if (role === ROLES.ADVISOR) return "/advisor/my-commission";
  return "/dashboard";
}

// requiredRole: string | string[] | undefined
export default function ProtectedRoute({ children, requiredRole }) {
  const location = useLocation();
  const { token, user, isAuthLoading } = useAuthStore(); // ❌ NO llamar init() aquí
  const perms = usePermissions();

  // No autenticado → login
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Esperando que main.jsx termine de llamar init()
  if (isAuthLoading || !user) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Rol explícito requerido en la ruta
  if (requiredRole) {
    const allowed = (Array.isArray(requiredRole) ? requiredRole : [requiredRole])
      .map((r) => r.toUpperCase());
    if (!allowed.includes(perms.role)) {
      return <Navigate to={defaultRoute(perms.role)} replace />;
    }
  }

  // Verificación automática por pathname
  if (!canAccessRoute(location.pathname, perms)) {
    return <Navigate to={defaultRoute(perms.role)} replace />;
  }

  return children;
}