// frontend/src/pages/Brands/BrandDetail.jsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Stack,
  IconButton,
  Button,
  Alert,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";

import { brandConfigApi } from "../../api/brandConfig.api";
import { brandsApi } from "../../api/brands.api";
import { brandsAdminApi } from "../../api/brands.admin.api";
import { useAuthStore } from "../../app/store/auth.store";
import { percentageTiersApi } from "../../api/percentageTiers.api";

// BD -> UI (legacy)
// BD: STANDARD / KIA_PLAN
// UI: PERCENTAGES / RANGES
function dbToUiType(dbType) {
  const t = String(dbType || "").toUpperCase();
  if (t === "KIA_PLAN") return "RANGES";
  return "PERCENTAGES";
}

const emptyRange = {
  id: null,
  name: "",
  min: 1,
  max: "", // "" => infinito
  rate_percent: "", // % auxiliar para autocompletar vehículos (RANGES)
};

function clampInt(v, fallback = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function parsePercentInput(v) {
  if (v === "" || v === null || typeof v === "undefined") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

export default function BrandDetail() {
  const { id } = useParams();
  const brandId = Number(id);
  const navigate = useNavigate();

  const { user } = useAuthStore();
  const isAdmin = String(user?.role || "").toUpperCase() === "ADMIN";

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  const [brand, setBrand] = React.useState(null);
  const [scheme, setScheme] = React.useState(null);

  // UI state
  const [commissionType, setCommissionType] = React.useState("RANGES"); // "RANGES" | "PERCENTAGES"
  const [ranges, setRanges] = React.useState([]); // tiers (para RANGES)

  // PERCENTAGES UI state
  const [pctRows, setPctRows] = React.useState([]); // [{ id?, tier_id, label, tier_name, percentage }]
  const [pctLoading, setPctLoading] = React.useState(false);
  const [pctSavingId, setPctSavingId] = React.useState(null);

  // Modal rango (RANGES)
  const [rangeOpen, setRangeOpen] = React.useState(false);
  const [rangeForm, setRangeForm] = React.useState(emptyRange);
  const [savingRange, setSavingRange] = React.useState(false);

  const fetchBrand = React.useCallback(async () => {
    try {
      const list = isAdmin ? await brandsAdminApi.listAll() : await brandsApi.list();
      const found = (list || []).find((b) => Number(b.id) === brandId) || null;
      setBrand(found);
    } catch {
      setBrand(null);
    }
  }, [brandId, isAdmin]);

  const loadPercentageMatrix = React.useCallback(
    async (schemeId) => {
      setPctLoading(true);
      try {
        // tiers “bucket” 1..5 (ya existen en commission_tiers para scheme STANDARD)
        const tiers = await brandConfigApi.listTiers(schemeId);

        // porcentajes guardados en commission_percentage_tiers
        const { items } = await percentageTiersApi.listByScheme(schemeId);

        const byTierId = new Map((items || []).map((r) => [Number(r.tier_id), r]));

        const rows = (tiers || [])
          .slice()
          .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999) || (a.min_units ?? 0) - (b.min_units ?? 0) || a.id - b.id)
          .map((t) => {
            const maxLabel = t.max_units == null ? "más" : t.max_units;
            const label =
              t.min_units === t.max_units
                ? `${t.min_units} unidad${t.min_units === 1 ? "" : "es"}`
                : `${t.min_units} a ${maxLabel} unidades`;

            const existing = byTierId.get(Number(t.id));
            return {
              id: existing?.id ?? null,
              tier_id: Number(t.id),
              tier_name: t.tier_name,
              label,
              percentage: existing?.percentage ?? 0,
            };
          });

        setPctRows(rows);
      } catch (e) {
        setErr(e?.response?.data?.message || "No se pudo cargar la matriz de porcentajes");
        setPctRows([]);
      } finally {
        setPctLoading(false);
      }
    },
    []
  );

  const fetchAll = React.useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      await fetchBrand();

      const { scheme } = await brandConfigApi.getScheme(brandId);
      setScheme(scheme || null);

      const uiType = dbToUiType(scheme?.scheme_type);
      setCommissionType(uiType);

      if (scheme?.id) {
        const tiers = await brandConfigApi.listTiers(scheme.id);
        setRanges(
          (tiers || []).map((t) => ({
            id: t.id,
            name: t.tier_name,
            min: t.min_units,
            max: t.max_units ?? "",
            priority: t.priority ?? 1,
            rate_percent: t.rate_percent ?? "", // % auxiliar SOLO para RANGES
          }))
        );

        if (uiType === "PERCENTAGES") {
          await loadPercentageMatrix(scheme.id);
        } else {
          setPctRows([]);
        }
      } else {
        setRanges([]);
        setPctRows([]);
      }
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo cargar la configuración de la marca");
    } finally {
      setLoading(false);
    }
  }, [brandId, fetchBrand, loadPercentageMatrix]);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveCommissionType = async (newType) => {
    setErr("");
    try {
      const { scheme } = await brandConfigApi.upsertScheme(brandId, {
        scheme_type: newType, // UI type (backend mapea a ENUM legacy)
      });

      setScheme(scheme || null);

      if (scheme?.id) {
        const tiers = await brandConfigApi.listTiers(scheme.id);
        setRanges(
          (tiers || []).map((t) => ({
            id: t.id,
            name: t.tier_name,
            min: t.min_units,
            max: t.max_units ?? "",
            priority: t.priority ?? 1,
            rate_percent: t.rate_percent ?? "",
          }))
        );

        if (newType === "PERCENTAGES") {
          await loadPercentageMatrix(scheme.id);
        } else {
          setPctRows([]);
        }
      } else {
        setRanges([]);
        setPctRows([]);
      }
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo guardar el tipo de comisión");
    }
  };

  const onChangeType = async (e) => {
    const next = e.target.value;
    setCommissionType(next);
    await saveCommissionType(next);
  };

  // -------------------
  // Rangos (RANGES)
  // -------------------
  const openCreateRange = () => {
    const sorted = [...ranges].sort((a, b) => (a.min || 0) - (b.min || 0));
    const last = sorted[sorted.length - 1];
    const suggestedMin = last?.max
      ? clampInt(last.max, 1) + 1
      : last
        ? clampInt(last.min, 1) + 1
        : 1;

    setRangeForm({
      id: null,
      name: `TABLA_${ranges.length + 1}`,
      min: suggestedMin,
      max: "",
      rate_percent: "",
    });
    setRangeOpen(true);
  };

  const openEditRange = (r) => {
    setRangeForm({
      id: r.id,
      name: r.name,
      min: r.min,
      max: r.max ?? "",
      rate_percent: r.rate_percent ?? "",
    });
    setRangeOpen(true);
  };

  const closeRange = () => {
    if (savingRange) return;
    setRangeOpen(false);
  };

  const saveRange = async () => {
    if (!scheme?.id) {
      setErr("No existe configuración guardada para esta marca todavía.");
      return;
    }

    const payload = {
      tier_name: String(rangeForm.name || "").trim(),
      min_units: clampInt(rangeForm.min, 1),
      max_units: rangeForm.max === "" ? null : clampInt(rangeForm.max, 1),
      priority: 1,
      rate_percent: parsePercentInput(rangeForm.rate_percent),
    };

    if (!payload.tier_name) return setErr("El nombre del rango es obligatorio.");
    if (payload.min_units < 1) return setErr("El mínimo debe ser >= 1");
    if (payload.max_units != null && payload.max_units < payload.min_units) return setErr("El máximo no puede ser menor que el mínimo.");
    if (payload.rate_percent != null && (payload.rate_percent < 0 || payload.rate_percent > 100)) return setErr("El porcentaje debe estar entre 0 y 100.");

    setSavingRange(true);
    setErr("");
    try {
      if (rangeForm.id) await brandConfigApi.updateTier(rangeForm.id, payload);
      else await brandConfigApi.createTier(scheme.id, payload);

      setRangeOpen(false);

      const tiers = await brandConfigApi.listTiers(scheme.id);
      setRanges(
        (tiers || [])
          .map((t) => ({
            id: t.id,
            name: t.tier_name,
            min: t.min_units,
            max: t.max_units ?? "",
            priority: t.priority ?? 1,
            rate_percent: t.rate_percent ?? "",
          }))
          .sort((a, b) => a.min - b.min)
      );
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo guardar el rango");
    } finally {
      setSavingRange(false);
    }
  };

  const removeRange = async (tierId) => {
    if (!scheme?.id) return;
    if (!confirm("¿Eliminar este rango?")) return;

    setErr("");
    try {
      await brandConfigApi.deleteTier(tierId);
      const tiers = await brandConfigApi.listTiers(scheme.id);
      setRanges(
        (tiers || []).map((t) => ({
          id: t.id,
          name: t.tier_name,
          min: t.min_units,
          max: t.max_units ?? "",
          priority: t.priority ?? 1,
          rate_percent: t.rate_percent ?? "",
        }))
      );
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo eliminar el rango");
    }
  };

  // -------------------
  // Porcentajes (PERCENTAGES) => commission_percentage_tiers
  // -------------------
  const onChangePct = (tierId, value) => {
    const v = value === "" ? "" : Number(value);
    setPctRows((prev) =>
      prev.map((r) => (r.tier_id === tierId ? { ...r, percentage: v } : r))
    );
  };

  const savePct = async (row) => {
    if (!scheme?.id) return;
    const pct = Number(row.percentage);

    if (!Number.isFinite(pct)) return setErr("El porcentaje debe ser numérico.");
    if (pct < 0 || pct > 100) return setErr("El porcentaje debe estar entre 0 y 100.");

    setPctSavingId(row.tier_id);
    setErr("");
    try {
      await percentageTiersApi.upsert(scheme.id, row.tier_id, { percentage: pct });
      // recargar para mantener ids consistentes
      await loadPercentageMatrix(scheme.id);
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo guardar el porcentaje");
    } finally {
      setPctSavingId(null);
    }
  };

  const brandTitle = brand
    ? `Configuración de marca – ${brand.name} (${brand.code})`
    : `Configuración de marca – #${brandId}`;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate("/brands")} size="small">
          <ArrowBackRoundedIcon />
        </IconButton>

        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
            {brandTitle}
          </Typography>
        </Box>

        <Chip
          size="small"
          label={commissionType === "RANGES" ? "Comisión por Rangos" : "Comisión por Porcentajes"}
          sx={{ fontWeight: 900 }}
        />
      </Stack>

      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      <Stack spacing={2}>
        <Paper sx={{ p: 2, borderRadius: 1 }}>
          <Typography sx={{ fontWeight: 900, mb: 0.5 }}>
            ¿Cómo comisiona esta marca?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Elige una opción. La pantalla se ajusta automáticamente.
          </Typography>

          <RadioGroup value={commissionType} onChange={onChangeType}>
            <FormControlLabel
              value="RANGES"
              control={<Radio />}
              label={
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>Por rangos</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Depende de cuántos vehículos se vendan y usa “tablas/rangos”.
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="PERCENTAGES"
              control={<Radio />}
              label={
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>Por porcentajes</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Se paga un porcentaje del valor comercial según unidades.
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>

          {!scheme?.id && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Aún no existe configuración en BD para esta marca. Al seleccionar el tipo se crea automáticamente.
            </Alert>
          )}
        </Paper>

        {commissionType === "RANGES" && (
          <Paper sx={{ p: 2, borderRadius: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Box>
                <Typography sx={{ fontWeight: 900 }}>Rangos de venta</Typography>
                <Typography variant="body2" color="text.secondary">
                  Define rangos y (opcional) el % para autocompletar al crear vehículos.
                </Typography>
              </Box>

              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={openCreateRange}
                disabled={loading}
                sx={{ fontWeight: 900 }}
              >
                Agregar rango
              </Button>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {!scheme?.id ? (
              <Alert severity="warning">Selecciona y guarda el tipo de comisión para crear la configuración.</Alert>
            ) : (
              <Stack spacing={1}>
                {ranges
                  .slice()
                  .sort((a, b) => a.min - b.min)
                  .map((r) => (
                    <Paper key={r.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        spacing={1.5}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 900 }}>
                            {r.name}{" "}
                            <Typography component="span" variant="body2" color="text.secondary">
                              (de {r.min} a {r.max === "" ? "∞" : r.max})
                            </Typography>
                          </Typography>

                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Chip
                              size="small"
                              label={r.rate_percent === "" || r.rate_percent == null ? "Sin %" : `${Number(r.rate_percent)}%`}
                              sx={{ fontWeight: 900 }}
                            />
                            <Typography variant="caption" sx={{ color: "text.secondary", alignSelf: "center" }}>
                              % usado para autocompletar comisión por vehículo (opcional)
                            </Typography>
                          </Stack>
                        </Box>

                        <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
                          <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => openEditRange(r)}>
                            Editar
                          </Button>

                          <Tooltip title="Eliminar rango">
                            <IconButton size="small" onClick={() => removeRange(r.id)}>
                              <DeleteOutlineRoundedIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}

                {!ranges.length && (
                  <Alert severity="info">
                    No hay rangos aún. Ejemplo típico: TABLA_1 (1–4), TABLA_2 (5–9), TABLA_3 (10–∞).
                  </Alert>
                )}
              </Stack>
            )}
          </Paper>
        )}

        {commissionType === "PERCENTAGES" && (
          <Paper sx={{ p: 2, borderRadius: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Box>
                <Typography sx={{ fontWeight: 900 }}>Porcentaje según unidades vendidas</Typography>
                <Typography variant="body2" color="text.secondary">
                  Esta matriz se guarda en <b>commission_percentage_tiers</b>.
                </Typography>
              </Box>

              {pctLoading ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Cargando…
                  </Typography>
                </Stack>
              ) : null}
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {!scheme?.id ? (
              <Alert severity="warning">Selecciona y guarda el tipo de comisión para crear la configuración.</Alert>
            ) : pctRows.length === 0 ? (
              <Alert severity="info">
                No hay tiers/porcentajes cargados para este scheme. (Debes tener los tiers plantilla 1..5 y sus filas en commission_percentage_tiers.)
              </Alert>
            ) : (
              <Stack spacing={1}>
                {pctRows.map((row) => (
                  <Paper key={row.tier_id} variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={2}
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      justifyContent="space-between"
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 900 }}>
                          {row.tier_name}{" "}
                          <Typography component="span" variant="body2" color="text.secondary">
                            ({row.label})
                          </Typography>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          % aplicado al sale_price de cada vehículo cuando el asesor cae en este tier por unidades.
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: "100%", sm: 340 } }}>
                        <TextField
                          size="small"
                          label="% Comisión"
                          type="number"
                          value={row.percentage}
                          onChange={(e) => onChangePct(row.tier_id, e.target.value)}
                          fullWidth
                        />
                        <Button
                          variant="contained"
                          onClick={() => savePct(row)}
                          disabled={pctSavingId === row.tier_id}
                          sx={{ fontWeight: 900, whiteSpace: "nowrap" }}
                        >
                          {pctSavingId === row.tier_id ? "Guardando…" : "Guardar"}
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        )}

        <Paper sx={{ p: 2, borderRadius: 1 }}>
          <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Bonos y reglas adicionales</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Vacaciones, antigüedad (&lt; 3 meses), bono por metas, modelos específicos, etc.
          </Typography>

          <Alert severity="info">
            Esta sección es el siguiente bloque: aquí montamos el CRUD de reglas/bonos y luego se aplican en la corrida.
          </Alert>
        </Paper>
      </Stack>

      {/* Modal de rango (solo RANGES) */}
      <Dialog open={rangeOpen} onClose={closeRange} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>
          {rangeForm.id ? "Editar rango" : "Nuevo rango"}
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Nombre"
              value={rangeForm.name}
              onChange={(e) => setRangeForm((s) => ({ ...s, name: e.target.value }))}
              helperText='Ej: "TABLA_1", "Nivel Oro", "Rango 4"'
              fullWidth
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Desde (min unidades)"
                type="number"
                value={rangeForm.min}
                onChange={(e) => setRangeForm((s) => ({ ...s, min: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Hasta (max unidades)"
                type="number"
                value={rangeForm.max}
                onChange={(e) => setRangeForm((s) => ({ ...s, max: e.target.value }))}
                helperText="Vacío = infinito"
                fullWidth
              />
            </Stack>

            <TextField
              label="% para autocompletar TABLA (opcional)"
              type="number"
              value={rangeForm.rate_percent}
              onChange={(e) => setRangeForm((s) => ({ ...s, rate_percent: e.target.value }))}
              helperText="Ej: 0.8 (significa 0.8% del valor comercial). Déjalo vacío si no aplica."
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeRange} disabled={savingRange}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={<SaveRoundedIcon />}
            onClick={saveRange}
            disabled={savingRange}
            sx={{ fontWeight: 900 }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
