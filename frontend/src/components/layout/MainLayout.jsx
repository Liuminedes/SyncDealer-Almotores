import { Outlet } from "react-router-dom";
import { Box, Toolbar } from "@mui/material";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export const DRAWER_WIDTH = 280;

export default function MainLayout() {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      <Topbar />

      {/* NAV (reserva espacio del sidebar en desktop) */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Sidebar />
      </Box>

      {/* MAIN */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
          width: { xs: "100%", md: `calc(100% - ${DRAWER_WIDTH}px)` },
          bgcolor: "background.default",
          overflowX: "hidden",
        }}
      >
        <Toolbar />

        <Box sx={{ px: { xs: 2, md: 3 }, py: 3, width: "100%" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
