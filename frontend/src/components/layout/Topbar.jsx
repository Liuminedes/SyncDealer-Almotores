import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  Divider,
  ListItemIcon,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

import { useUiStore } from "../../app/store/ui.store";
import { useAuthStore } from "../../app/store/auth.store";
import { DRAWER_WIDTH } from "./MainLayout";

const titleByPath = (pathname) => {
  if (pathname.startsWith("/users")) return "Usuarios";
  if (pathname.startsWith("/sales")) return "Ventas";
  if (pathname.startsWith("/commissions/runs")) return "Comisiones";
  if (pathname.startsWith("/commissions/statements")) return "Statements";
  if (pathname.startsWith("/reports/exports")) return "Exportaciones";
  return "Dashboard";
};

export default function Topbar() {
  const theme = useTheme();
  const { user, logout } = useAuthStore();
  const { themeMode, toggleTheme } = useUiStore();
  const location = useLocation();

  const pageTitle = useMemo(
    () => titleByPath(location.pathname),
    [location.pathname]
  );

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const subTitle = "Sync Dealer Almotores · Beta v1.0";

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        ml: { md: `${DRAWER_WIDTH}px` },
        borderBottom: `1px solid ${theme.palette.divider}`,
        bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.75 : 0.85),
        backdropFilter: "blur(10px)",
        backgroundImage: "none",
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        {/* Left */}
        <Box>
          <Typography sx={{ fontWeight: 900, lineHeight: 1 }}>
            {pageTitle}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {subTitle}
          </Typography>
        </Box>

        {/* Right */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title={themeMode === "dark" ? "Modo claro" : "Modo oscuro"}>
            <IconButton onClick={toggleTheme} size="small">
              {themeMode === "dark" ? (
                <LightModeRoundedIcon fontSize="small" />
              ) : (
                <DarkModeRoundedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>

          <Tooltip title="Cuenta">
            <IconButton
              size="small"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                ml: 0.5,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {(user?.full_name || "U").slice(0, 1).toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            PaperProps={{
              elevation: 0,
              sx: {
                mt: 1,
                minWidth: 240,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: "background.paper",
                backgroundImage: "none",
                borderRadius: 2,
                overflow: "hidden",
              },
            }}
          >
            {/* Header */}
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography sx={{ fontWeight: 900, lineHeight: 1.2 }}>
                {user?.full_name || "—"}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {user?.email || "—"} · Rol: <b>{user?.role || "—"}</b>
              </Typography>
            </Box>

            <Divider />

            {/* Items (como template) */}
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                // TODO: cuando exista /profile
                // navigate("/profile");
              }}
            >
              <ListItemIcon>
                <PersonRoundedIcon fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>

            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                // TODO: cuando exista /account
              }}
            >
              <ListItemIcon>
                <ManageAccountsRoundedIcon fontSize="small" />
              </ListItemIcon>
              My account
            </MenuItem>

            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                // TODO: cuando exista /settings
              }}
            >
              <ListItemIcon>
                <SettingsRoundedIcon fontSize="small" />
              </ListItemIcon>
              Settings
            </MenuItem>

            <Divider />

            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                logout();
              }}
            >
              <ListItemIcon>
                <LogoutRoundedIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
