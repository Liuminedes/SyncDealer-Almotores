import { NavLink, useLocation } from "react-router-dom";
import {
  Box,
  Drawer,
  Toolbar,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Chip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import SellRoundedIcon from "@mui/icons-material/SellRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";

import { useAuthStore } from "../../app/store/auth.store";
import { DRAWER_WIDTH } from "./MainLayout";

const nav = [
  { label: "Dashboard", to: "/dashboard", icon: <HomeRoundedIcon /> },
  {
    label: "Usuarios",
    to: "/users",
    icon: <PeopleAltRoundedIcon />,
    adminOnly: true,
  },
  { label: "Ventas", to: "/sales", icon: <SellRoundedIcon /> },
  {
    label: "Comisiones",
    to: "/commissions/runs",
    icon: <PaymentsRoundedIcon />,
  },
  {
    label: "Statements",
    to: "/commissions/statements",
    icon: <DescriptionRoundedIcon />,
  },
  {
    label: "Exportaciones",
    to: "/reports/exports",
    icon: <FileDownloadRoundedIcon />,
  },
];

export default function Sidebar() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const location = useLocation();

  const isAdmin = user?.role === "ADMIN";

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        display: { xs: "none", md: "block" },
        [`& .MuiDrawer-paper`]: {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
          borderRight: `1px solid ${theme.palette.divider}`,
          bgcolor: "background.paper",
          backgroundImage: "none",
          left: 0,
          top: 0,
        },
      }}
    >
      {/* Header */}
      <Toolbar sx={{ px: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              bgcolor: "primary.main",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              color: "#fff",
              boxShadow: `0 10px 22px ${alpha(theme.palette.primary.main, 0.25)}`,
            }}
          >
            SD
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 900, lineHeight: 1.1 }}>
              Sync Dealer
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Almotores
            </Typography>
          </Box>
        </Box>
      </Toolbar>

      <Divider />

      {/* Session chips (opcional, pero ya bien en light/dark) */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Sesión
        </Typography>
        <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Chip size="small" label={user?.role || "—"} />
          {user?.brands?.slice(0, 2)?.map((b) => (
            <Chip
              key={b.brand_id}
              size="small"
              label={b.code}
              variant="outlined"
            />
          ))}
          {(user?.brands?.length || 0) > 2 && (
            <Chip
              size="small"
              label={`+${user.brands.length - 2}`}
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      <Divider />

      {/* Nav */}
      <List sx={{ px: 1, py: 1 }}>
        {nav
          .filter((i) => (i.adminOnly ? isAdmin : true))
          .map((item) => {
            const active = location.pathname === item.to;

            return (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                sx={{
                  my: 0.5,
                  borderRadius: 2,
                  border: `1px solid transparent`,
                  color: active ? "text.primary" : "text.secondary",
                  ...(active && {
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    borderColor: alpha(theme.palette.primary.main, 0.28),
                    color: "text.primary",
                  }),
                  "&:hover": {
                    bgcolor: active
                      ? alpha(theme.palette.primary.main, 0.16)
                      : alpha(
                          theme.palette.text.primary,
                          theme.palette.mode === "dark" ? 0.05 : 0.04,
                        ),
                    color: "text.primary",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: active ? "primary.main" : "text.secondary",
                  }}
                >
                  {item.icon}
                </ListItemIcon>

                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: active ? 900 : 600 }}
                />
              </ListItemButton>
            );
          })}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      <Box sx={{ p: 2 }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Beta v1.0
        </Typography>
      </Box>
    </Drawer>
  );
}
