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
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded"; // ✅ NEW

import { useAuthStore } from "../../app/store/auth.store";
import { DRAWER_WIDTH } from "./MainLayout";

const navSections = [
  {
    title: "Inicio",
    items: [{ label: "Dashboard", to: "/dashboard", icon: <HomeRoundedIcon /> }],
  },
  {
    title: "Operación",
    items: [
      { label: "Vehículos", to: "/vehicles", icon: <DirectionsCarRoundedIcon /> },
      { label: "Ventas", to: "/sales", icon: <SellRoundedIcon /> },
    ],
  },
  {
    title: "Comisiones",
    items: [
      { label: "Calcular", to: "/commissions/runs", icon: <PaymentsRoundedIcon /> },
      {
        label: "Parámetros",
        to: "/commissions/statements",
        icon: <DescriptionRoundedIcon />,
      },
    ],
  },
  {
    title: "Reportes",
    items: [
      { label: "Exportaciones", to: "/reports/exports", icon: <FileDownloadRoundedIcon /> },
    ],
  },
  {
    title: "Administración",
    items: [
      {
        label: "Usuarios",
        to: "/users",
        icon: <PeopleAltRoundedIcon />,
        adminOnly: true,
      },
      {
        label: "Marcas",
        to: "/brands",
        icon: <StorefrontRoundedIcon />,
        adminOnly: true,
      },
    ],
  },
];

function SectionTitle({ children }) {
  return (
    <Typography
      variant="caption"
      sx={{
        px: 2,
        pt: 1.5,
        pb: 0.75,
        color: "text.secondary",
        fontWeight: 900,
        letterSpacing: 0.8,
        textTransform: "uppercase",
      }}
    >
      {children}
    </Typography>
  );
}

export default function Sidebar() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const location = useLocation();

  const isAdmin = String(user?.role || "").toUpperCase() === "ADMIN";

  // ✅ Activo inteligente: soporta rutas hijas
  const isActivePath = (to) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

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
              width: 36,
              height: 36,
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

      {/* Session */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <StackLikeRow>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Sesión
          </Typography>

          <Chip
            size="small"
            label={user?.is_active === false ? "Bloqueado" : "Activa"}
            sx={{
              ml: "auto",
              fontWeight: 900,
              bgcolor:
                user?.is_active === false
                  ? alpha(theme.palette.error.main, 0.14)
                  : alpha(theme.palette.success.main, 0.14),
              color:
                user?.is_active === false
                  ? theme.palette.error.main
                  : theme.palette.success.main,
            }}
          />
        </StackLikeRow>

        <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Chip size="small" label={user?.role || "—"} sx={{ fontWeight: 900 }} />
          {user?.brands?.slice(0, 2)?.map((b) => (
            <Chip key={b.brand_id} size="small" label={b.code} variant="outlined" />
          ))}
          {(user?.brands?.length || 0) > 2 && (
            <Chip size="small" label={`+${user.brands.length - 2}`} variant="outlined" />
          )}
        </Box>
      </Box>

      <Divider />

      {/* Nav Sections */}
      <Box sx={{ py: 1 }}>
        {navSections.map((section) => {
          const visibleItems = section.items.filter((i) =>
            i.adminOnly ? isAdmin : true
          );

          if (!visibleItems.length) return null;

          return (
            <Box key={section.title} sx={{ mb: 0.75 }}>
              <SectionTitle>{section.title}</SectionTitle>

              <List sx={{ px: 1, py: 0 }}>
                {visibleItems.map((item) => {
                  const active = isActivePath(item.to);

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
                                theme.palette.mode === "dark" ? 0.05 : 0.04
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
                        primaryTypographyProps={{
                          fontWeight: active ? 900 : 600,
                        }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>

              <Divider sx={{ mt: 1 }} />
            </Box>
          );
        })}
      </Box>

      <Box sx={{ flexGrow: 1 }} />

      {/* Footer */}
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Beta v1.0
        </Typography>
      </Box>
    </Drawer>
  );
}

function StackLikeRow({ children }) {
  return <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>{children}</Box>;
}
