import { Outlet } from "react-router-dom";
import { Box, Toolbar } from "@mui/material";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export const DRAWER_WIDTH = 280;

export default function MainLayout() {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Topbar />

      <Sidebar />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        {/* Espacio del AppBar */}
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
