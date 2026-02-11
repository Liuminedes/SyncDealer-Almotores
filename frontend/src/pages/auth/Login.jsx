import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../app/store/auth.store";

import {
  Box,
  Paper,
  CssBaseline,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  Alert,
  Divider,
  Avatar,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";

function LogoMark() {
  return (
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
          letterSpacing: 0.5,
        }}
      >
        SD
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 900, lineHeight: 1 }}>
          Sync Dealer
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Almotores
        </Typography>
      </Box>
    </Box>
  );
}

export default function Login() {
  const theme = useTheme();
  const { login, isLoggingIn } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("auxinformatica2@almotores.com");
  const [password, setPassword] = useState("Admin123*");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  const from = useMemo(
    () => location.state?.from || "/dashboard",
    [location.state]
  );

  const isDark = theme.palette.mode === "dark";

  // Fondo: cambia según modo (tipo template MUI)
  const backgroundImage = isDark
    ? `radial-gradient(1200px circle at 50% 30%, ${alpha(
        theme.palette.primary.main,
        0.22
      )} 0%, transparent 55%),
       radial-gradient(900px circle at 15% 85%, ${alpha(
         theme.palette.secondary.main,
         0.14
       )} 0%, transparent 55%),
       linear-gradient(180deg, #07070b 0%, #0b0b10 45%, #0b0b10 100%)`
    : `radial-gradient(1200px circle at 50% 30%, ${alpha(
        theme.palette.primary.main,
        0.14
      )} 0%, transparent 55%),
       radial-gradient(900px circle at 15% 85%, ${alpha(
         theme.palette.secondary.main,
         0.08
       )} 0%, transparent 55%),
       linear-gradient(180deg, #f6f7fb 0%, #f5f6fa 45%, #f5f6fa 100%)`;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const res = await login({ email, password, remember });
    if (!res?.ok) {
      setError(res?.message || "No se pudo iniciar sesión");
      return;
    }

    navigate(from, { replace: true });
  };

  return (
    <>
      <CssBaseline />

      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          px: 2,
          backgroundImage,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "min(460px, 92vw)",
            borderRadius: 4,
            p: 4,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.background.paper, isDark ? 0.82 : 0.92),
            backgroundImage: "none",
            backdropFilter: "blur(12px)",
            boxShadow: isDark
              ? `0 20px 60px ${alpha("#000", 0.55)}`
              : `0 18px 50px ${alpha("#111827", 0.12)}`,
          }}
        >
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.primary.main, isDark ? 0.18 : 0.14),
                color: "primary.main",
                width: 40,
                height: 40,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
              }}
            >
              <PaymentsRoundedIcon fontSize="small" />
            </Avatar>
            <LogoMark />
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5 }}>
            Acceso Seguro
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
            Inicia sesión para acceder al dashboard.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={onSubmit}
            sx={{ display: "grid", gap: 2 }}
          >
            <TextField
              label="Dirección Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              fullWidth
              InputProps={{
                sx: {
                  borderRadius: 2,
                  bgcolor: alpha(
                    theme.palette.background.paper,
                    isDark ? 0.35 : 0.65
                  ),
                },
              }}
            />

            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              fullWidth
              InputProps={{
                sx: {
                  borderRadius: 2,
                  bgcolor: alpha(
                    theme.palette.background.paper,
                    isDark ? 0.35 : 0.65
                  ),
                },
              }}
            />

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                }
                label="Recordar datos"
              />

              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  cursor: "pointer",
                  "&:hover": { color: "primary.main" },
                  userSelect: "none",
                }}
                title="Haz clic aqui para reestablecer tu contraseña"
              >
                ¿Olvidaste tu Contraseña?
              </Typography>
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isLoggingIn}
              sx={{
                borderRadius: 999,
                py: 1.2,
                fontWeight: 900,
                boxShadow: `0 12px 26px ${alpha(
                  theme.palette.primary.main,
                  0.25
                )}`,
              }}
            >
              {isLoggingIn ? "Ingresando..." : "Ingresar"}
            </Button>

            <Divider sx={{ opacity: 0.35 }} />

            <Typography variant="caption" sx={{ color: "text.secondary"}}>
              <code>Beta v1.0 - Mauricio Rodriguez 💻</code>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </>
  );
}
