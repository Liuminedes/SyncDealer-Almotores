import { createBrowserRouter, Navigate } from "react-router-dom";

import MainLayout from "../components/layout/MainLayout";
import ProtectedRoute from "../components/layout/ProtectedRoute";

import Login from "../pages/auth/Login";
import Dashboard from "../pages/dashboard/Dashboard";
import Users from "../pages/users/Users";
import Vehicles from "../pages/vehicles/Vehicles";
import Sales from "../pages/sales/Sales";
import Brands from "../pages/brands/Brands";
import BrandDetail from "../pages/brands/BrandDetail";
import Runs from "../pages/commissions/Runs";
import RunDetail from "../pages/commissions/RunDetail";
import Statements from "../pages/commissions/Statements";
import MyCommission from "../pages/advisor/MyCommission";
import Exports from "../pages/reports/Exports";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/dashboard" replace /> },

  { path: "/login", element: <Login /> },

  {
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/users", element: <Users /> },
      { path: "/vehicles", element: <Vehicles /> },
      { path: "/sales", element: <Sales /> },
      { path: "/brands", element: <Brands /> },
      { path: "/brands/:id", element: <BrandDetail /> },

      { path: "/commissions/runs", element: <Runs /> },
      { path: "/commissions/runs/:id", element: <RunDetail /> },
      { path: "/commissions/statements", element: <Statements /> },

      { path: "/advisor/my-commission", element: <MyCommission /> },

      { path: "/reports/exports", element: <Exports /> },
    ],
  },
]);
