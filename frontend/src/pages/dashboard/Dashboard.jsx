import { Grid, Card, CardContent, Typography, Box, Chip } from "@mui/material";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import SellRoundedIcon from "@mui/icons-material/SellRounded";

import { useAuthStore } from "../../app/store/auth.store";

function StatCard({ title, value, subtitle, icon }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Box>
            <Typography variant="overline" sx={{ color: "text.secondary" }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.5 }}>
              {value}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              {subtitle}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              bgcolor: "rgba(124,58,237,0.16)",
              border: "1px solid rgba(124,58,237,0.25)",
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();

  // Placeholder por ahora (Sprint 3-BE conectará datos reales)
  const kpis = [
    { title: "Ventas (mes)", value: "—", subtitle: "Pendiente conectar Sales", icon: <SellRoundedIcon /> },
    { title: "Comisiones pendientes", value: "—", subtitle: "Pendiente Sprint 4", icon: <PendingActionsRoundedIcon /> },
    { title: "Comisiones aprobadas", value: "—", subtitle: "Pendiente Sprint 4", icon: <TaskAltRoundedIcon /> },
    { title: "SLA 24h", value: "—", subtitle: "Pendiente Sprint 4", icon: <TrendingUpRoundedIcon /> },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Card>
        <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="h6">Overview</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Sesión activa como <b>{user?.full_name}</b> ({user?.role})
            </Typography>
          </Box>
          <Chip label="Beta v1.0" variant="outlined" />
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {kpis.map((k) => (
          <Grid key={k.title} item xs={12} sm={6} lg={3}>
            <StatCard {...k} />
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6">Accesos por marca</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Permisos cargados desde tu sesión (user_brand_access)
          </Typography>

          <Box sx={{ display: "grid", gap: 1.5, mt: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
            {user?.brands?.map((b) => (
              <Card key={b.brand_id} variant="outlined">
                <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography sx={{ fontWeight: 800 }}>{b.name}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {b.code}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Chip size="small" label={`view: ${b.can_view ? "sí" : "no"}`} />
                    <Chip size="small" label={`generate: ${b.can_generate ? "sí" : "no"}`} />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
