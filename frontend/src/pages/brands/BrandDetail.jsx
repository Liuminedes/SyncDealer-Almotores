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
  MenuItem,
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

import { schemeRulesBonusesApi } from "../../api/schemeRulesBonuses.api";
import PolicyBuilder from "../../components/PolicyBuilder";
import { vehiclesApi } from "../../api/vehicles.api";
import { CONDITION_META, EFFECT_LABELS } from "../../constants/policyEngine";

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

const RULE_LABELS = {
  VACATION_TIER_OVERRIDE: "Asesor en vacaciones",
  NEW_ADVISOR_TIER_OVERRIDE: "Asesor nuevo (< 3 meses)",
};

const RULE_DESCRIPTIONS = {
  VACATION_TIER_OVERRIDE:
    "Fuerza la tabla indicada cuando el asesor está marcado en vacaciones al generar la corrida.",
  NEW_ADVISOR_TIER_OVERRIDE:
    "Fuerza la tabla indicada cuando el asesor lleva menos de 3 meses en la compañía (hire_date).",
};

function RulesBonusesSection({ schemeId, schemeTiers, brandId }) {
  const [rules, setRules] = React.useState([]);
  const [bonuses, setBonuses] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [vehicles, setVehicles] = React.useState([]);

  // Modal state
  const [builderOpen, setBuilderOpen] = React.useState(false);
  const [builderScope, setBuilderScope] = React.useState("rule");
  const [builderData, setBuilderData] = React.useState(null);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const [r, b] = await Promise.all([
        schemeRulesBonusesApi.listRules(schemeId),
        schemeRulesBonusesApi.listBonuses(schemeId),
      ]);
      setRules(r || []);
      setBonuses(b || []);
    } catch (e) {
      setErr(
        e?.response?.data?.message || "No se pudieron cargar las políticas",
      );
    } finally {
      setLoading(false);
    }
  }, [schemeId]);

  const loadVehicles = React.useCallback(async () => {
    try {
      const res = await vehiclesApi.list({ brand_id: brandId, limit: 200 });
      // Dependiendo de cómo retorna tu vehiclesApi:
      const list = Array.isArray(res)
        ? res
        : res?.items || res?.data?.items || res?.data || [];
      setVehicles(list);
    } catch {
      setVehicles([]);
    }
  }, [brandId]);

  React.useEffect(() => {
    load();
    loadVehicles();
  }, [load, loadVehicles]);

  const openCreate = (scope) => {
    setBuilderScope(scope);
    setBuilderData(null);
    setBuilderOpen(true);
  };

  const openEdit = (item, scope) => {
    setBuilderScope(scope);
    setBuilderData(item);
    setBuilderOpen(true);
  };

  const handleSave = async (payload) => {
    setSaving(true);
    setErr("");
    try {
      if (builderScope === "rule") {
        if (builderData?.id)
          await schemeRulesBonusesApi.updateRule(
            schemeId,
            builderData.id,
            payload,
          );
        else await schemeRulesBonusesApi.createRule(schemeId, payload);
      } else {
        if (builderData?.id)
          await schemeRulesBonusesApi.updateBonus(
            schemeId,
            builderData.id,
            payload,
          );
        else await schemeRulesBonusesApi.createBonus(schemeId, payload);
      }
      setBuilderOpen(false);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = async (item, scope) => {
    try {
      if (scope === "rule")
        await schemeRulesBonusesApi.updateRule(schemeId, item.id, {
          is_active: !item.is_active,
        });
      else
        await schemeRulesBonusesApi.updateBonus(schemeId, item.id, {
          is_active: !item.is_active,
        });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo actualizar");
    }
  };

  const deleteItem = async (item, scope) => {
    if (!confirm(`¿Eliminar "${item.name}"?`)) return;
    try {
      if (scope === "rule")
        await schemeRulesBonusesApi.deleteRule(schemeId, item.id);
      else await schemeRulesBonusesApi.deleteBonus(schemeId, item.id);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo eliminar");
    }
  };

  const renderCard = (item, scope) => {
    const isRule = scope === "rule";
    const rawConditions =
      typeof item.conditions === "string"
        ? (() => {
            try {
              return JSON.parse(item.conditions);
            } catch {
              return [];
            }
          })()
        : item.conditions || [];

    const conditionLabels = rawConditions.map((c) => {
      const meta = CONDITION_META[c.type];
      if (!meta) return c.type;
      if (meta.needsVehicle) {
        const v = vehicles.find((veh) => veh.id === c.vehicle_id);
        return `${meta.label.replace("X", c.value)} (${v?.model || "vehículo"})`;
      }
      return meta.needsValue ? meta.label.replace("X", c.value) : meta.label;
    });

    const effectChip = isRule ? (
      (() => {
        const et = EFFECT_LABELS[item.effect_type];
        const val =
          item.effect_type === "FORCE_TIER"
            ? item.effect_value
            : `$${Number(item.effect_value).toLocaleString("es-CO")}`;
        return (
          <Chip
            size="small"
            label={`${et?.icon} ${et?.label}: ${val}`}
            color={et?.color || "default"}
            sx={{ fontWeight: 800 }}
          />
        );
      })()
    ) : (
      <Chip
        size="small"
        label={`🎁 +$${Number(item.bonus_amount).toLocaleString("es-CO")}`}
        color="success"
        sx={{ fontWeight: 800 }}
      />
    );

    return (
      <Paper
        key={item.id}
        variant="outlined"
        sx={{
          p: 1.5,
          borderRadius: 1,
          opacity: item.is_active ? 1 : 0.5,
          transition: "opacity .2s",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ sm: "center" }}
          spacing={1.5}
        >
          <Box sx={{ flex: 1 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              gap={0.5}
            >
              <Typography sx={{ fontWeight: 900 }}>{item.name}</Typography>
              <Chip
                size="small"
                label={item.is_active ? "Activa" : "Inactiva"}
                color={item.is_active ? "success" : "default"}
                sx={{ fontWeight: 800 }}
              />
              {effectChip}
              {item.priority > 0 && (
                <Chip
                  size="small"
                  label={`P${item.priority}`}
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              )}
            </Stack>

            {item.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {item.description}
              </Typography>
            )}

            <Stack
              direction="row"
              spacing={0.5}
              flexWrap="wrap"
              sx={{ mt: 0.75 }}
            >
              {conditionLabels.map((label, i) => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        alignSelf: "center",
                        fontWeight: 900,
                        color: "primary.main",
                      }}
                    >
                      Y
                    </Typography>
                  )}
                  <Chip
                    size="small"
                    variant="outlined"
                    label={label}
                    sx={{ fontSize: 11 }}
                  />
                </React.Fragment>
              ))}
            </Stack>
          </Box>

          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            <Tooltip title={item.is_active ? "Desactivar" : "Activar"}>
              <IconButton size="small" onClick={() => toggleItem(item, scope)}>
                {item.is_active ? (
                  <span style={{ fontSize: 16 }}>⏸</span>
                ) : (
                  <span style={{ fontSize: 16 }}>▶</span>
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title="Editar">
              <IconButton size="small" onClick={() => openEdit(item, scope)}>
                <EditRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar">
              <IconButton size="small" onClick={() => deleteItem(item, scope)}>
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>
    );
  };

  if (loading)
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <CircularProgress size={16} />
        <Typography variant="body2">Cargando políticas…</Typography>
      </Stack>
    );

  return (
    <Stack spacing={2}>
      {err && (
        <Alert severity="error" onClose={() => setErr("")}>
          {err}
        </Alert>
      )}

      {/* ── REGLAS ── */}
      <Box>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Box>
            <Typography sx={{ fontWeight: 900 }}>
              Reglas obligatorias
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Se evalúan siempre al calcular comisiones.
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddRoundedIcon />}
            onClick={() => openCreate("rule")}
          >
            Nueva regla
          </Button>
        </Stack>
        <Stack spacing={1}>
          {rules.length === 0 ? (
            <Alert severity="info">
              Sin reglas configuradas. Las corridas se calcularán sin
              condiciones especiales.
            </Alert>
          ) : (
            rules.map((r) => renderCard(r, "rule"))
          )}
        </Stack>
      </Box>

      <Divider />

      {/* ── BONOS ── */}
      <Box>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Box>
            <Typography sx={{ fontWeight: 900 }}>Bonos opcionales</Typography>
            <Typography variant="body2" color="text.secondary">
              Se suman cuando se cumplen sus condiciones.
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddRoundedIcon />}
            onClick={() => openCreate("bonus")}
          >
            Nuevo bono
          </Button>
        </Stack>
        <Stack spacing={1}>
          {bonuses.length === 0 ? (
            <Alert severity="info">
              Sin bonos configurados para esta marca.
            </Alert>
          ) : (
            bonuses.map((b) => renderCard(b, "bonus"))
          )}
        </Stack>
      </Box>

      <PolicyBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onSave={handleSave}
        initialData={builderData}
        scope={builderScope}
        vehicles={vehicles}
        tiers={schemeTiers || []}
        saving={saving}
      />
    </Stack>
  );
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

  // UX: cambios sin guardar (por tier_id)
  const [pctDirty, setPctDirty] = React.useState(() => new Set()); // Set<number>
  const [pctSaving, setPctSaving] = React.useState(false);

  // Modal rango (RANGES)
  const [rangeOpen, setRangeOpen] = React.useState(false);
  const [rangeForm, setRangeForm] = React.useState(emptyRange);
  const [savingRange, setSavingRange] = React.useState(false);

  const fetchBrand = React.useCallback(async () => {
    try {
      const list = isAdmin
        ? await brandsAdminApi.listAll()
        : await brandsApi.list();
      const found = (list || []).find((b) => Number(b.id) === brandId) || null;
      setBrand(found);
    } catch {
      setBrand(null);
    }
  }, [brandId, isAdmin]);

  const loadPercentageMatrix = React.useCallback(async (schemeId) => {
    setPctLoading(true);
    try {
      // tiers “bucket” 1..5 (ya existen en commission_tiers para scheme STANDARD)
      const tiers = await brandConfigApi.listTiers(schemeId);

      // porcentajes guardados en commission_percentage_tiers
      const { items } = await percentageTiersApi.listByScheme(schemeId);

      const byTierId = new Map(
        (items || []).map((r) => [Number(r.tier_id), r]),
      );

      const rows = (tiers || [])
        .slice()
        .sort(
          (a, b) =>
            (a.priority ?? 999) - (b.priority ?? 999) ||
            (a.min_units ?? 0) - (b.min_units ?? 0) ||
            a.id - b.id,
        )
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
      setPctDirty(new Set());
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          "No se pudo cargar la matriz de porcentajes",
      );
      setPctRows([]);
    } finally {
      setPctLoading(false);
    }
  }, []);

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
          })),
        );

        if (uiType === "PERCENTAGES") {
          await loadPercentageMatrix(scheme.id);
        } else {
          setPctRows([]);
          setPctDirty(new Set());
        }
      } else {
        setRanges([]);
        setPctRows([]);
        setPctDirty(new Set());
      }
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          "No se pudo cargar la configuración de la marca",
      );
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
          })),
        );

        if (newType === "PERCENTAGES") {
          await loadPercentageMatrix(scheme.id);
        } else {
          setPctRows([]);
          setPctDirty(new Set());
        }
      } else {
        setRanges([]);
        setPctRows([]);
        setPctDirty(new Set());
      }
    } catch (e) {
      setErr(
        e?.response?.data?.message || "No se pudo guardar el tipo de comisión",
      );
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

    if (!payload.tier_name)
      return setErr("El nombre del rango es obligatorio.");
    if (payload.min_units < 1) return setErr("El mínimo debe ser >= 1");
    if (payload.max_units != null && payload.max_units < payload.min_units)
      return setErr("El máximo no puede ser menor que el mínimo.");
    if (
      payload.rate_percent != null &&
      (payload.rate_percent < 0 || payload.rate_percent > 100)
    )
      return setErr("El porcentaje debe estar entre 0 y 100.");

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
          .sort((a, b) => a.min - b.min),
      );
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo guardar el rango");
    } finally {
      setSavingRange(false);
    }
  };

  const removeRange = async (tierId) => {
    if (!scheme?.id) return;
    // eslint-disable-next-line no-restricted-globals
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
        })),
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
      prev.map((r) => (r.tier_id === tierId ? { ...r, percentage: v } : r)),
    );

    setPctDirty((prev) => {
      const next = new Set(prev);
      next.add(Number(tierId));
      return next;
    });
  };

  const validatePct = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "El porcentaje debe ser numérico.";
    if (n < 0 || n > 100) return "El porcentaje debe estar entre 0 y 100.";
    return null;
  };

  const savePctAll = async () => {
    if (!scheme?.id) return;

    const dirtyIds = Array.from(pctDirty);
    if (!dirtyIds.length) return;

    const dirtyRows = pctRows.filter((r) =>
      dirtyIds.includes(Number(r.tier_id)),
    );

    for (const r of dirtyRows) {
      const errMsg = validatePct(r.percentage);
      if (errMsg) {
        setErr(`${r.tier_name}: ${errMsg}`);
        return;
      }
    }

    setPctSaving(true);
    setErr("");
    try {
      for (const r of dirtyRows) {
        await percentageTiersApi.upsert(scheme.id, r.tier_id, {
          percentage: Number(r.percentage),
        });
      }
      await loadPercentageMatrix(scheme.id); // limpia dirty y refresca ids
    } catch (e) {
      setErr(
        e?.response?.data?.message || "No se pudieron guardar los porcentajes",
      );
    } finally {
      setPctSaving(false);
    }
  };

  const discardPctChanges = async () => {
    if (!scheme?.id) return;
    setErr("");
    await loadPercentageMatrix(scheme.id);
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
          label={
            commissionType === "RANGES"
              ? "Comisión por Rangos"
              : "Comisión por Porcentajes"
          }
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
                    Depende de cuántos vehículos se vendan y usa
                    “tablas/rangos”.
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="PERCENTAGES"
              control={<Radio />}
              label={
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>
                    Por porcentajes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Se paga un porcentaje del valor comercial según unidades.
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>

          {!scheme?.id && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Aún no existe configuración en BD para esta marca. Al seleccionar
              el tipo se crea automáticamente.
            </Alert>
          )}
        </Paper>

        {commissionType === "RANGES" && (
          <Paper sx={{ p: 2, borderRadius: 1 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <Box>
                <Typography sx={{ fontWeight: 900 }}>
                  Rangos de venta
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Define rangos y (opcional) el % para autocompletar al crear
                  vehículos.
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
              <Alert severity="warning">
                Selecciona y guarda el tipo de comisión para crear la
                configuración.
              </Alert>
            ) : (
              <Stack spacing={1}>
                {ranges
                  .slice()
                  .sort((a, b) => a.min - b.min)
                  .map((r) => (
                    <Paper
                      key={r.id}
                      variant="outlined"
                      sx={{ p: 1.5, borderRadius: 1 }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        spacing={1.5}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 900 }}>
                            {r.name}{" "}
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.secondary"
                            >
                              (de {r.min} a {r.max === "" ? "∞" : r.max})
                            </Typography>
                          </Typography>

                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Chip
                              size="small"
                              label={
                                r.rate_percent === "" || r.rate_percent == null
                                  ? "Sin %"
                                  : `${Number(r.rate_percent)}%`
                              }
                              sx={{ fontWeight: 900 }}
                            />
                            <Typography
                              variant="caption"
                              sx={{
                                color: "text.secondary",
                                alignSelf: "center",
                              }}
                            >
                              % usado para autocompletar comisión por vehículo
                              (opcional)
                            </Typography>
                          </Stack>
                        </Box>

                        <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
                          <Button
                            size="small"
                            startIcon={<EditRoundedIcon />}
                            onClick={() => openEditRange(r)}
                          >
                            Editar
                          </Button>

                          <Tooltip title="Eliminar rango">
                            <IconButton
                              size="small"
                              onClick={() => removeRange(r.id)}
                            >
                              <DeleteOutlineRoundedIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}

                {!ranges.length && (
                  <Alert severity="info">
                    No hay rangos aún. Ejemplo típico: TABLA_1 (1–4), TABLA_2
                    (5–9), TABLA_3 (10–∞).
                  </Alert>
                )}
              </Stack>
            )}
          </Paper>
        )}

        {commissionType === "PERCENTAGES" && (
          <Paper sx={{ p: 2, borderRadius: 1 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <Box>
                <Typography sx={{ fontWeight: 900 }}>
                  Porcentaje según unidades vendidas
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Esta matriz se guarda en <b>commission_percentage_tiers</b>.
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} alignItems="center">
                {pctLoading ? (
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mr: 1 }}
                  >
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">
                      Cargando…
                    </Typography>
                  </Stack>
                ) : null}

                <Button
                  variant="outlined"
                  onClick={discardPctChanges}
                  disabled={
                    !scheme?.id ||
                    pctSaving ||
                    pctLoading ||
                    pctDirty.size === 0
                  }
                  sx={{ fontWeight: 900, whiteSpace: "nowrap" }}
                >
                  Descartar cambios
                </Button>

                <Button
                  variant="contained"
                  startIcon={<SaveRoundedIcon />}
                  onClick={savePctAll}
                  disabled={
                    !scheme?.id ||
                    pctSaving ||
                    pctLoading ||
                    pctDirty.size === 0
                  }
                  sx={{ fontWeight: 900, whiteSpace: "nowrap" }}
                >
                  {pctSaving
                    ? "Guardando…"
                    : `Guardar cambios (${pctDirty.size})`}
                </Button>
              </Stack>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {!scheme?.id ? (
              <Alert severity="warning">
                Selecciona y guarda el tipo de comisión para crear la
                configuración.
              </Alert>
            ) : pctRows.length === 0 ? (
              <Alert severity="info">
                No hay tiers/porcentajes cargados para este scheme. Si esto
                aparece, revisa que el backend haya creado los tiers base 1..5.
              </Alert>
            ) : (
              <Stack spacing={1}>
                {pctRows.map((row) => {
                  const isDirty = pctDirty.has(Number(row.tier_id));
                  const fieldErr = isDirty ? validatePct(row.percentage) : null;

                  return (
                    <Paper
                      key={row.tier_id}
                      variant="outlined"
                      sx={{ p: 1.5, borderRadius: 1 }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        justifyContent="space-between"
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 900 }}>
                            {row.tier_name}{" "}
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.secondary"
                            >
                              ({row.label})
                            </Typography>
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            % aplicado al sale_price de cada vehículo cuando el
                            asesor cae en este tier por unidades.
                          </Typography>
                        </Box>

                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{ width: { xs: "100%", sm: 340 } }}
                        >
                          <TextField
                            size="small"
                            label="% Comisión"
                            type="number"
                            value={row.percentage}
                            onChange={(e) =>
                              onChangePct(row.tier_id, e.target.value)
                            }
                            fullWidth
                            error={!!fieldErr}
                            helperText={
                              fieldErr
                                ? fieldErr
                                : isDirty
                                  ? "Pendiente por guardar"
                                  : " "
                            }
                          />
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Paper>
        )}

        <Paper sx={{ p: 2, borderRadius: 1 }}>
          <Typography sx={{ fontWeight: 900, mb: 0.5 }}>
            Bonos y reglas adicionales
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Vacaciones, antigüedad (&lt; 3 meses), bono por metas, etc.
          </Typography>

          {!scheme?.id ? (
            <Alert severity="warning">
              Guarda primero el tipo de comisión para poder configurar reglas y
              bonos.
            </Alert>
          ) : (
            <RulesBonusesSection
              schemeId={scheme.id}
              schemeTiers={ranges.map((r) => ({
                id: r.id,
                tier_name: r.name,
                min_units: r.min,
                max_units: r.max === "" ? null : r.max,
              }))}
              brandId={brandId}
            />
          )}
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
              onChange={(e) =>
                setRangeForm((s) => ({ ...s, name: e.target.value }))
              }
              helperText='Ej: "TABLA_1", "Nivel Oro", "Rango 4"'
              fullWidth
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Desde (min unidades)"
                type="number"
                value={rangeForm.min}
                onChange={(e) =>
                  setRangeForm((s) => ({ ...s, min: e.target.value }))
                }
                fullWidth
              />
              <TextField
                label="Hasta (max unidades)"
                type="number"
                value={rangeForm.max}
                onChange={(e) =>
                  setRangeForm((s) => ({ ...s, max: e.target.value }))
                }
                helperText="Vacío = infinito"
                fullWidth
              />
            </Stack>

            <TextField
              label="% para autocompletar TABLA (opcional)"
              type="number"
              value={rangeForm.rate_percent}
              onChange={(e) =>
                setRangeForm((s) => ({ ...s, rate_percent: e.target.value }))
              }
              helperText="Ej: 0.8 (significa 0.8% del valor comercial). Déjalo vacío si no aplica."
              fullWidth
            />
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
            sx={{ fontWeight: 900 }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
