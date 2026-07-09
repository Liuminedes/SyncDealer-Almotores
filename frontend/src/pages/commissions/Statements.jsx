// frontend/src/pages/commissions/Statements.jsx
// Si el usuario tiene 1 sola marca → redirige a BrandDetail con ?from=statements
// Si tiene más de 1 → muestra grid de cards para elegir
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Card, CardActionArea, CardContent,
  Typography, Stack, Chip, CircularProgress, Alert,
} from "@mui/material";
import TuneRoundedIcon       from "@mui/icons-material/TuneRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";

import { useAuthStore }   from "../../app/store/auth.store";
import { usePermissions } from "../../app/hooks/usePermissions";
import { brandsAdminApi } from "../../api/brands.admin.api";
import { brandsApi }      from "../../api/brands.api";

const BRAND_COLORS = ["#63b3ed","#68d391","#f6ad55","#9f7aea","#fc8181","#4fd1c5","#f687b3","#fbd38d"];

export default function Statements() {
  const navigate       = useNavigate();
  const { user }       = useAuthStore();
  const perms          = usePermissions();
  const [brands,   setBrands]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  useEffect(() => {
    (async () => {
      try {
        let list = [];
        if (perms.is.admin) {
          // Admin: todas las marcas activas
          const all = await brandsAdminApi.listAll();
          list = (all || []).filter(b => b.is_active);
        } else {
          // brandOp: sus marcas asignadas
          const raw = await brandsApi.list();
          // brandsApi devuelve [{ brand_id, name, code, ... }]
          list = (raw || []).map(b => ({ id: b.brand_id ?? b.id, name: b.name, code: b.code }));
        }

        if (list.length === 1) {
          // Única marca → ir directo a BrandDetail
          navigate(`/brands/${list[0].id}?from=statements`, { replace: true });
          return;
        }
        setBrands(list);
      } catch (e) {
        setError(e?.response?.data?.message || "No se pudieron cargar las marcas");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (
    <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 300 }}>
      <CircularProgress />
    </Stack>
  );

  if (error) return <Alert severity="error">{error}</Alert>;

  if (brands.length === 0) return (
    <Alert severity="warning">No tienes marcas asignadas para configurar.</Alert>
  );

  return (
    <Box sx={{ width: "100%" }}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TuneRoundedIcon sx={{ color: "text.secondary" }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>Parámetros</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Selecciona una marca para gestionar sus esquemas, tiers, reglas y bonos.
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 2 }}>
          {brands.map((b, i) => {
            const color = BRAND_COLORS[i % BRAND_COLORS.length];
            return (
              <Card key={b.id} sx={{
                borderRadius: 2, border: "1px solid", borderColor: "divider",
                transition: "all .15s",
                "&:hover": { borderColor: color, boxShadow: `0 4px 20px ${color}22` },
              }}>
                <CardActionArea onClick={() => navigate(`/brands/${b.id}?from=statements`)}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{
                        width: 48, height: 48, borderRadius: 1.5, flexShrink: 0,
                        bgcolor: `${color}18`, border: `1px solid ${color}30`,
                        display: "grid", placeItems: "center",
                      }}>
                        <StorefrontRoundedIcon sx={{ color, fontSize: 24 }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 900, lineHeight: 1.2 }} noWrap>{b.name}</Typography>
                        <Chip size="small" label={b.code} sx={{
                          mt: 0.5, fontWeight: 800, fontSize: "0.65rem",
                          bgcolor: `${color}18`, color, border: `1px solid ${color}30`,
                        }} />
                      </Box>
                    </Stack>
                    <Typography variant="caption" sx={{ color: "text.secondary", mt: 1.5, display: "block" }}>
                      Configurar esquemas, tiers, reglas y bonos →
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      </Stack>
    </Box>
  );
}