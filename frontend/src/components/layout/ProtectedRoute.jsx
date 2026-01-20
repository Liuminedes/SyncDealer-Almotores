import { Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { CircularProgress, Box } from "@mui/material";
import { useAuthStore } from "../../app/store/auth.store";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { token, user, isAuthLoading, init } = useAuthStore();

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (isAuthLoading || !user) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return children;
}
