import { createBrowserRouter, Navigate } from "react-router-dom";

import MainLayout     from "../components/layout/MainLayout";
import ProtectedRoute from "../components/layout/ProtectedRoute";

import Login        from "../pages/auth/Login";
import Dashboard    from "../pages/dashboard/Dashboard";
import Users        from "../pages/users/Users";
import Vehicles     from "../pages/vehicles/Vehicles";
import Sales        from "../pages/sales/Sales";
import Brands       from "../pages/brands/Brands";
import Branches     from "../pages/branches/Branches";
import BrandDetail  from "../pages/brands/BrandDetail";
import Runs         from "../pages/commissions/Runs";
import Statements   from "../pages/commissions/Statements";
import MyCommission from "../pages/advisor/MyCommission";
import Exports      from "../pages/reports/Exports";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/dashboard" replace /> },

  { path: "/login", element: <Login /> },

  {
    // Un único ProtectedRoute envuelve el layout — verifica auth UNA sola vez
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      // ── Compartidas ───────────────────────────────────────────────────
      { path: "/dashboard",  element: <Dashboard /> },
      { path: "/sales",      element: <Sales /> },

      // ── Admin + BrandOp ───────────────────────────────────────────────
      { path: "/vehicles",                  element: <Vehicles /> },
      { path: "/commissions/runs",          element: <Runs /> },
      { path: "/commissions/statements",    element: <Statements /> },
      { path: "/reports/exports",           element: <Exports /> },
      { path: "/users",                     element: <Users /> },


      // ── Solo Admin ───────────────────────────────────────────────────
      {
        path: "/branches",
        element: (
          <ProtectedRoute requiredRole="ADMIN">
            <Branches />
          </ProtectedRoute>
        ),
      },
      // ── Solo Admin (Marcas) ──────────────────────────────────────────
      {
        path: "/brands",
        element: (
          <ProtectedRoute requiredRole="ADMIN">
            <Brands />
          </ProtectedRoute>
        ),
      },
      {
        // /brands/:id accesible para ADMIN y brandOp (ProtectedRoute.canAccessRoute lo controla)
        path: "/brands/:id",
        element: (
          <ProtectedRoute>
            <BrandDetail />
          </ProtectedRoute>
        ),
      },

      // ── Solo Advisor ──────────────────────────────────────────────────
      {
        path: "/advisor/my-commission",
        element: (
          <ProtectedRoute requiredRole="ADVISOR">
            <MyCommission />
          </ProtectedRoute>
        ),
      },
      {
        path: "/advisor/profile",
        element: (
          <ProtectedRoute requiredRole="ADVISOR">
            <MyCommission /> {/* TODO: AdvisorProfile.jsx */}
          </ProtectedRoute>
        ),
      },
    ],
  },
]);