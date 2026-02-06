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
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";

import { brandConfigApi } from "../../api/brandConfig.api";
import { brandsAdminApi } from "../../api/brands.admin.api";

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
};

function clampInt(v, fallback = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

export default function BrandDetail() {
  const { id } = useParams();
  const brandId = Number(id);
  const navigate = useNavigate();

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  // ✅ Datos de marca (para UX: “Configuración de marca – KIA”)
  const [brand, setBrand] = React.useState(null);

  // backend scheme
  const [scheme, setScheme] = React.useState(null);

  // UI state
  const [commissionType, setCommissionType] = React.useState("RANGES"); // "RANGES" | "PERCENTAGES"
  const [ranges, setRanges] = React.useState([]); // from commission_tiers when RANGES

  // Modal rango
  const [rangeOpen, setRangeOpen] = React.useState(false);
  const [rangeForm, setRangeForm] = React.useState(emptyRange);
  const [savingRange, setSavingRange] = React.useState(false);

  const fetchAll = React.useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      // ✅ 1) Marca
      const b = await brandsAdminApi.getById(brandId);
      setBrand(b);

      // ✅ 2) Config
      const { scheme } = await brandConfigApi.getScheme(brandId);
      setScheme(scheme || null);

      const uiType = dbToUiType(scheme?.scheme_type);
      setCommissionType(uiType);

      if (scheme?.id) {
        const tiers = await brandConfigApi.listTiers(scheme.id);
        setRanges(
          tiers.map((t) => ({
            id: t.id,
            name: t.tier_name,
            min: t.min_units,
            max: t.max_units ?? "",
            priority: t.priority ?? 1,
          }))
        );
      } else {
        setRanges([]);
      }
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo cargar la configuración de la marca");
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveCommissionType = async (newType) => {
    setErr("");
    try {
      const { scheme } = await brandConfigApi.upsertScheme(brandId, {
        scheme_type: newType,
      });
      setScheme(scheme || null);

      if (scheme?.id) {
        const tiers = await brandConfigApi.listTiers(scheme.id);
        setRanges(
          tiers.map((t) => ({
            id: t.id,
            name: t.tier_name,
            min: t.min_units,
            max: t.max_units ?? "",
            priority: t.priority ?? 1,
          }))
        );
      } else {
        setRanges([]);
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
    });
    setRangeOpen(true);
  };

  const openEditRange = (r) => {
    setRangeForm({
      id: r.id,
      name: r.name,
      min: r.min,
      max: r.max ?? "",
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
    };

    if (!payload.tier_name) {
      setErr("El nombre del rango es obligatorio.");
      return;
    }
    if (payload.min_units < 1) {
      setErr("El mínimo debe ser >= 1");
      return;
    }
    if (payload.max_units != null && payload.max_units < payload.min_units) {
      setErr("El máximo no puede ser menor que el mínimo.");
      return;
    }

    setSavingRange(true);
    setErr("");
    try {
      if (rangeForm.id) {
        await brandConfigApi.updateTier(rangeForm.id, payload);
      } else {
        await brandConfigApi.createTier(scheme.id, payload);
      }

      setRangeOpen(false);

      const tiers = await brandConfigApi.listTiers(scheme.id);
      const mapped = tiers
        .map((t) => ({
          id: t.id,
          name: t.tier_name,
          min: t.min_units,
          max: t.max_units ?? "",
          priority: t.priority ?? 1,
        }))
        .sort((a, b) => a.min - b.min)
        .map((r, idx) => ({ ...r, priority: idx + 1 }));

      setRanges(mapped);
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
        tiers.map((t) => ({
          id: t.id,
          name: t.tier_name,
          min: t.min_units,
          max: t.max_units ?? "",
          priority: t.priority ?? 1,
        }))
      );
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo eliminar el rango");
    }
  };

  const percentageRows = [
    { units: 1, label: "1", value: "" },
    { units: 2, label: "2", value: "" },
    { units: 3, label: "3", value: "" },
    { units: 4, label: "4", value: "" },
    { units: 5, label: "5 o más", value: "" },
  ];

  const brandTitle = brand?.code || brand?.name || `#${brandId}`;
  const commissionLabel = commissionType === "RANGES" ? "Comisión por Rangos" : "Comisión por Porcentajes";

  return (
    <Box>
      {/* Header UX */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate("/brands")} size="small">
          <ArrowBackRoundedIcon />
        </IconButton>

        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
            Configuración de marca – {brandTitle}
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            {brand?.code && <Chip size="small" label={brand.code} sx={{ fontWeight: 900 }} />}
            {brand?.is_active === false && <Chip size="small" label="Inactiva" />}
            <Chip size="small" label={commissionLabel} sx={{ fontWeight: 900 }} />
          </Stack>
        </Box>
      </Stack>

      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      <Stack spacing={2}>
        {/* Tipo comisión */}
        <Paper sx={{ p: 2, borderRadius: 3 }}>
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
                  <Typography sx={{ fontWeight: 800 }}>Por rangos (KIA)</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Depende de cuántos vehículos se vendan en el mes y paga valores fijos por vehículo según el rango.
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="PERCENTAGES"
              control={<Radio />}
              label={
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>Por porcentajes (VW / JAC / Jetour)</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Se paga un porcentaje del valor comercial del vehículo según el total de unidades vendidas.
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

        {/* Rangos */}
        {commissionType === "RANGES" && (
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Box>
                <Typography sx={{ fontWeight: 900 }}>Rangos de venta</Typography>
                <Typography variant="body2" color="text.secondary">
                  Define rangos (mínimo/máximo). Puedes agregar todos los que necesites.
                </Typography>
              </Box>

              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={openCreateRange}
                disabled={loading}
              >
                Agregar rango
              </Button>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {!scheme?.id ? (
              <Alert severity="warning">
                Selecciona y guarda el tipo de comisión para crear la configuración.
              </Alert>
            ) : (
              <Stack spacing={1}>
                {ranges
                  .slice()
                  .sort((a, b) => a.min - b.min)
                  .map((r) => (
                    <Paper key={r.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 900 }}>
                            {r.name}{" "}
                            <Typography component="span" variant="body2" color="text.secondary">
                              (de {r.min} a {r.max === "" ? "∞" : r.max})
                            </Typography>
                          </Typography>
                        </Box>

                        <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => openEditRange(r)}>
                          Editar
                        </Button>

                        <Tooltip title="Eliminar rango">
                          <IconButton size="small" onClick={() => removeRange(r.id)}>
                            <DeleteOutlineRoundedIcon />
                          </IconButton>
                        </Tooltip>
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

            <Box sx={{ mt: 2 }}>
              <Alert severity="info">
                Siguiente mejora: “Valor por vehículo por rango” (commission_vehicle_rates).
              </Alert>
            </Box>
          </Paper>
        )}

        {/* Porcentajes */}
        {commissionType === "PERCENTAGES" && (
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography sx={{ fontWeight: 900, mb: 0.5 }}>
              Porcentaje según unidades vendidas
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Se aplica sobre el valor comercial del vehículo. (Lo conectamos en el Paso 3 con tabla nueva).
            </Typography>

            <Stack spacing={1}>
              {percentageRows.map((row) => (
                <Stack
                  key={row.units}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems="center"
                >
                  <Box sx={{ minWidth: 140 }}>
                    <Chip size="small" label={`${row.label} unidades`} sx={{ fontWeight: 900 }} />
                  </Box>
                  <TextField
                    size="small"
                    label="% Comisión"
                    placeholder="Ej: 1.5"
                    fullWidth
                    disabled
                  />
                </Stack>
              ))}
            </Stack>

            <Alert severity="warning" sx={{ mt: 2 }}>
              Aún no está implementada la tabla de porcentajes. Esta sección se activará en el Paso 3.
            </Alert>
          </Paper>
        )}

        {/* Bonos */}
        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography sx={{ fontWeight: 900, mb: 0.5 }}>
            Bonos y reglas adicionales
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Transporte, bono por cumplimiento, modelos específicos, etc. (Paso 4).
          </Typography>

          <Alert severity="info">
            Esta sección se implementa en el Paso 4 con `commission_rules` y ajustes por corrida.
          </Alert>
        </Paper>
      </Stack>

      {/* Modal rango */}
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
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeRange} disabled={savingRange}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveRoundedIcon />}
            onClick={saveRange}
            disabled={savingRange}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
