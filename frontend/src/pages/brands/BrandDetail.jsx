// frontend/src/pages/brands/BrandDetail.jsx
import React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Paper, Typography, Stack, IconButton, Button, Divider,
  RadioGroup, FormControlLabel, Radio, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, Chip, Tooltip,
  CircularProgress, MenuItem, Alert,
} from "@mui/material";
import toast from "react-hot-toast";

import ArrowBackRoundedIcon       from "@mui/icons-material/ArrowBackRounded";
import AddRoundedIcon             from "@mui/icons-material/AddRounded";
import EditRoundedIcon            from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon   from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon            from "@mui/icons-material/SaveRounded";

import { brandConfigApi }         from "../../api/brandConfig.api";
import { brandsApi }              from "../../api/brands.api";
import { brandsAdminApi }         from "../../api/brands.admin.api";
import { useAuthStore }           from "../../app/store/auth.store";
import { percentageTiersApi }     from "../../api/percentageTiers.api";
import { schemeRulesBonusesApi }  from "../../api/schemeRulesBonuses.api";
import PolicyBuilder              from "../../components/PolicyBuilder";
import { vehiclesApi }            from "../../api/vehicles.api";
import { CONDITION_META, EFFECT_LABELS } from "../../constants/policyEngine";

function dbToUiType(dbType) {
  const t = String(dbType || "").toUpperCase();
  return t === "KIA_PLAN" ? "RANGES" : "PERCENTAGES";
}

const emptyRange = { id: null, name: "", min: 1, max: "", rate_percent: "" };

function clampInt(v, fallback = 1) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function parsePercentInput(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ─── RulesBonusesSection ─────────────────────────────────────────────────────
function RulesBonusesSection({ schemeId, schemeTiers, brandId }) {
  const [rules,        setRules]        = React.useState([]);
  const [bonuses,      setBonuses]      = React.useState([]);
  const [loading,      setLoading]      = React.useState(true);
  const [vehicles,     setVehicles]     = React.useState([]);
  const [builderOpen,  setBuilderOpen]  = React.useState(false);
  const [builderScope, setBuilderScope] = React.useState("rule");
  const [builderData,  setBuilderData]  = React.useState(null);
  const [saving,       setSaving]       = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [r, b] = await Promise.all([
        schemeRulesBonusesApi.listRules(schemeId),
        schemeRulesBonusesApi.listBonuses(schemeId),
      ]);
      setRules(r || []);
      setBonuses(b || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudieron cargar las políticas");
    } finally { setLoading(false); }
  }, [schemeId]);

  const loadVehicles = React.useCallback(async () => {
    try {
      const res  = await vehiclesApi.list({ brand_id: brandId, limit: 200 });
      const list = Array.isArray(res) ? res : res?.items || res?.data?.items || res?.data || [];
      setVehicles(list);
    } catch { setVehicles([]); }
  }, [brandId]);

  React.useEffect(() => { load(); loadVehicles(); }, [load, loadVehicles]);

  const openCreate = (scope) => { setBuilderScope(scope); setBuilderData(null); setBuilderOpen(true); };
  const openEdit   = (item, scope) => { setBuilderScope(scope); setBuilderData(item); setBuilderOpen(true); };

  const handleSave = async (payload) => {
    setSaving(true);
    const isRule = builderScope === "rule";
    const toastId = toast.loading(builderData?.id ? "Actualizando…" : "Guardando…");
    try {
      if (isRule) {
        builderData?.id
          ? await schemeRulesBonusesApi.updateRule(schemeId, builderData.id, payload)
          : await schemeRulesBonusesApi.createRule(schemeId, payload);
        toast.success(builderData?.id ? "Regla actualizada" : "Regla creada", { id: toastId });
      } else {
        builderData?.id
          ? await schemeRulesBonusesApi.updateBonus(schemeId, builderData.id, payload)
          : await schemeRulesBonusesApi.createBonus(schemeId, payload);
        toast.success(builderData?.id ? "Bono actualizado" : "Bono creado", { id: toastId });
      }
      setBuilderOpen(false);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo guardar", { id: toastId });
    } finally { setSaving(false); }
  };

  const toggleItem = async (item, scope) => {
    const next = !item.is_active;
    const toastId = toast.loading(next ? "Activando…" : "Desactivando…");
    try {
      scope === "rule"
        ? await schemeRulesBonusesApi.updateRule(schemeId, item.id, { is_active: next })
        : await schemeRulesBonusesApi.updateBonus(schemeId, item.id, { is_active: next });
      toast.success(next ? `"${item.name}" activado` : `"${item.name}" desactivado`, { id: toastId });
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo actualizar", { id: toastId });
    }
  };

  const deleteItem = async (item, scope) => {
    if (!window.confirm(`¿Eliminar "${item.name}"?`)) return;
    const toastId = toast.loading("Eliminando…");
    try {
      scope === "rule"
        ? await schemeRulesBonusesApi.deleteRule(schemeId, item.id)
        : await schemeRulesBonusesApi.deleteBonus(schemeId, item.id);
      toast.success(`"${item.name}" eliminado`, { id: toastId });
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo eliminar", { id: toastId });
    }
  };

  const renderCard = (item, scope) => {
    const isRule = scope === "rule";
    const rawConditions =
      typeof item.conditions === "string"
        ? (() => { try { return JSON.parse(item.conditions); } catch { return []; } })()
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

    const effectChip = isRule ? (() => {
      const et  = EFFECT_LABELS[item.effect_type];
      const val = item.effect_type === "FORCE_TIER"
        ? item.effect_value
        : `$${Number(item.effect_value).toLocaleString("es-CO")}`;
      return (
        <Chip size="small" label={`${et?.icon} ${et?.label}: ${val}`}
          color={et?.color || "default"} sx={{ fontWeight: 800 }} />
      );
    })() : (
      <Chip size="small" label={`🎁 +$${Number(item.bonus_amount).toLocaleString("es-CO")}`}
        color="success" sx={{ fontWeight: 800 }} />
    );

    return (
      <Paper key={item.id} variant="outlined"
        sx={{ p: 1.5, borderRadius: 1, opacity: item.is_active ? 1 : 0.5, transition: "opacity .2s" }}>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} spacing={1.5}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={0.5}>
              <Typography sx={{ fontWeight: 900 }}>{item.name}</Typography>
              <Chip size="small" label={item.is_active ? "Activa" : "Inactiva"}
                color={item.is_active ? "success" : "default"} sx={{ fontWeight: 800 }} />
              {effectChip}
              {item.priority > 0 && (
                <Chip size="small" label={`P${item.priority}`} variant="outlined" sx={{ fontWeight: 700 }} />
              )}
            </Stack>
            {item.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{item.description}</Typography>
            )}
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.75 }}>
              {conditionLabels.map((label, i) => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <Typography variant="caption" sx={{ alignSelf: "center", fontWeight: 900, color: "primary.main" }}>
                      Y
                    </Typography>
                  )}
                  <Chip size="small" variant="outlined" label={label} sx={{ fontSize: 11 }} />
                </React.Fragment>
              ))}
            </Stack>
          </Box>
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            <Tooltip title={item.is_active ? "Desactivar" : "Activar"}>
              <IconButton size="small" onClick={() => toggleItem(item, scope)}>
                <span style={{ fontSize: 16 }}>{item.is_active ? "⏸" : "▶"}</span>
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

  if (loading) return (
    <Stack direction="row" spacing={1} alignItems="center">
      <CircularProgress size={16} />
      <Typography variant="body2">Cargando políticas…</Typography>
    </Stack>
  );

  return (
    <Stack spacing={2}>
      {/* Reglas */}
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 900 }}>Reglas obligatorias</Typography>
            <Typography variant="body2" color="text.secondary">Se evalúan siempre al calcular comisiones.</Typography>
          </Box>
          <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => openCreate("rule")}>
            Nueva regla
          </Button>
        </Stack>
        <Stack spacing={1}>
          {rules.length === 0
            ? <Alert severity="info">Sin reglas configuradas.</Alert>
            : rules.map(r => renderCard(r, "rule"))
          }
        </Stack>
      </Box>

      <Divider />

      {/* Bonos */}
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 900 }}>Bonos opcionales</Typography>
            <Typography variant="body2" color="text.secondary">Se suman cuando se cumplen sus condiciones.</Typography>
          </Box>
          <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => openCreate("bonus")}>
            Nuevo bono
          </Button>
        </Stack>
        <Stack spacing={1}>
          {bonuses.length === 0
            ? <Alert severity="info">Sin bonos configurados para esta marca.</Alert>
            : bonuses.map(b => renderCard(b, "bonus"))
          }
        </Stack>
      </Box>

      <PolicyBuilder
        open={builderOpen} onClose={() => setBuilderOpen(false)}
        onSave={handleSave} initialData={builderData}
        scope={builderScope} vehicles={vehicles} tiers={schemeTiers || []} saving={saving}
      />
    </Stack>
  );
}

// ─── BrandDetail ─────────────────────────────────────────────────────────────
export default function BrandDetail() {
  const { id }      = useParams();
  const brandId     = Number(id);
  const navigate    = useNavigate();
  const [searchParams] = useSearchParams();

  const fromParam = searchParams.get("from");
  const backPath  = fromParam === "statements" ? "/commissions/statements" : "/brands";

  const { user }  = useAuthStore();
  const isAdmin   = String(user?.role || "").toUpperCase() === "ADMIN";

  const [loading, setLoading]           = React.useState(true);
  const [pageErr, setPageErr]           = React.useState("");
  const [brand,   setBrand]             = React.useState(null);
  const [scheme,  setScheme]            = React.useState(null);
  const [commissionType, setCommissionType] = React.useState("RANGES");
  const [ranges,  setRanges]            = React.useState([]);

  const [pctRows,    setPctRows]    = React.useState([]);
  const [pctLoading, setPctLoading] = React.useState(false);
  const [pctDirty,   setPctDirty]   = React.useState(() => new Set());
  const [pctSaving,  setPctSaving]  = React.useState(false);

  const [rangeOpen,   setRangeOpen]   = React.useState(false);
  const [rangeForm,   setRangeForm]   = React.useState(emptyRange);
  const [savingRange, setSavingRange] = React.useState(false);
  const [rangeErr,    setRangeErr]    = React.useState("");

  // ── fetch helpers ──────────────────────────────────────────────────────────
  const fetchBrand = React.useCallback(async () => {
    try {
      const list  = isAdmin ? await brandsAdminApi.listAll() : await brandsApi.list();
      const found = (list || []).find(b => Number(b.id) === brandId) || null;
      setBrand(found);
    } catch { setBrand(null); }
  }, [brandId, isAdmin]);

  const loadPercentageMatrix = React.useCallback(async (schemeId) => {
    setPctLoading(true);
    try {
      const tiers       = await brandConfigApi.listTiers(schemeId);
      const { items }   = await percentageTiersApi.listByScheme(schemeId);
      const byTierId    = new Map((items || []).map(r => [Number(r.tier_id), r]));
      const rows = (tiers || [])
        .slice()
        .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999) || (a.min_units ?? 0) - (b.min_units ?? 0) || a.id - b.id)
        .map(t => {
          const maxLabel = t.max_units == null ? "más" : t.max_units;
          const label    = t.min_units === t.max_units
            ? `${t.min_units} unidad${t.min_units === 1 ? "" : "es"}`
            : `${t.min_units} a ${maxLabel} unidades`;
          const existing = byTierId.get(Number(t.id));
          return { id: existing?.id ?? null, tier_id: Number(t.id), tier_name: t.tier_name, label, percentage: existing?.percentage ?? 0 };
        });
      setPctRows(rows);
      setPctDirty(new Set());
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo cargar la matriz de porcentajes");
      setPctRows([]);
    } finally { setPctLoading(false); }
  }, []);

  const fetchAll = React.useCallback(async () => {
    setLoading(true); setPageErr("");
    try {
      await fetchBrand();
      const { scheme } = await brandConfigApi.getScheme(brandId);
      setScheme(scheme || null);
      const uiType = dbToUiType(scheme?.scheme_type);
      setCommissionType(uiType);
      if (scheme?.id) {
        const tiers = await brandConfigApi.listTiers(scheme.id);
        setRanges((tiers || []).map(t => ({
          id: t.id, name: t.tier_name, min: t.min_units,
          max: t.max_units ?? "", priority: t.priority ?? 1, rate_percent: t.rate_percent ?? "",
        })));
        if (uiType === "PERCENTAGES") await loadPercentageMatrix(scheme.id);
        else { setPctRows([]); setPctDirty(new Set()); }
      } else {
        setRanges([]); setPctRows([]); setPctDirty(new Set());
      }
    } catch (e) {
      setPageErr(e?.response?.data?.message || "No se pudo cargar la configuración de la marca");
    } finally { setLoading(false); }
  }, [brandId, fetchBrand, loadPercentageMatrix]);

  React.useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Tipo de comisión ──────────────────────────────────────────────────────
  const onChangeType = async (e) => {
    const next = e.target.value;
    setCommissionType(next);
    const toastId = toast.loading("Guardando configuración…");
    try {
      const { scheme } = await brandConfigApi.upsertScheme(brandId, { scheme_type: next });
      setScheme(scheme || null);
      if (scheme?.id) {
        const tiers = await brandConfigApi.listTiers(scheme.id);
        setRanges((tiers || []).map(t => ({
          id: t.id, name: t.tier_name, min: t.min_units,
          max: t.max_units ?? "", priority: t.priority ?? 1, rate_percent: t.rate_percent ?? "",
        })));
        if (next === "PERCENTAGES") await loadPercentageMatrix(scheme.id);
        else { setPctRows([]); setPctDirty(new Set()); }
      } else {
        setRanges([]); setPctRows([]); setPctDirty(new Set());
      }
      toast.success("Tipo de comisión actualizado", { id: toastId });
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo guardar el tipo de comisión", { id: toastId });
    }
  };

  // ── Rangos ────────────────────────────────────────────────────────────────
  const openCreateRange = () => {
    const sorted     = [...ranges].sort((a, b) => (a.min || 0) - (b.min || 0));
    const last       = sorted[sorted.length - 1];
    const suggestedMin = last?.max ? clampInt(last.max, 1) + 1 : last ? clampInt(last.min, 1) + 1 : 1;
    setRangeForm({ id: null, name: `TABLA_${ranges.length + 1}`, min: suggestedMin, max: "", rate_percent: "" });
    setRangeErr(""); setRangeOpen(true);
  };

  const openEditRange = (r) => {
    setRangeForm({ id: r.id, name: r.name, min: r.min, max: r.max ?? "", rate_percent: r.rate_percent ?? "" });
    setRangeErr(""); setRangeOpen(true);
  };

  const closeRange = () => { if (savingRange) return; setRangeOpen(false); setRangeErr(""); };

  const saveRange = async () => {
    if (!scheme?.id) { toast.error("No existe configuración guardada para esta marca."); return; }
    const payload = {
      tier_name:   String(rangeForm.name || "").trim(),
      min_units:   clampInt(rangeForm.min, 1),
      max_units:   rangeForm.max === "" ? null : clampInt(rangeForm.max, 1),
      priority:    1,
      rate_percent: parsePercentInput(rangeForm.rate_percent),
    };
    if (!payload.tier_name)                                        { setRangeErr("El nombre del rango es obligatorio."); return; }
    if (payload.min_units < 1)                                     { setRangeErr("El mínimo debe ser >= 1"); return; }
    if (payload.max_units != null && payload.max_units < payload.min_units) { setRangeErr("El máximo no puede ser menor que el mínimo."); return; }
    if (payload.rate_percent != null && (payload.rate_percent < 0 || payload.rate_percent > 100)) { setRangeErr("El porcentaje debe estar entre 0 y 100."); return; }

    setSavingRange(true); setRangeErr("");
    const toastId = toast.loading(rangeForm.id ? "Actualizando rango…" : "Creando rango…");
    try {
      rangeForm.id
        ? await brandConfigApi.updateTier(rangeForm.id, payload)
        : await brandConfigApi.createTier(scheme.id, payload);
      toast.success(rangeForm.id ? `"${payload.tier_name}" actualizado` : `"${payload.tier_name}" creado`, { id: toastId });
      setRangeOpen(false);
      const tiers = await brandConfigApi.listTiers(scheme.id);
      setRanges((tiers || []).map(t => ({
        id: t.id, name: t.tier_name, min: t.min_units,
        max: t.max_units ?? "", priority: t.priority ?? 1, rate_percent: t.rate_percent ?? "",
      })).sort((a, b) => a.min - b.min));
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo guardar el rango", { id: toastId });
      setRangeErr(e?.response?.data?.message || "No se pudo guardar el rango");
    } finally { setSavingRange(false); }
  };

  const removeRange = async (tierId, tierName) => {
    if (!scheme?.id) return;
    if (!window.confirm(`¿Eliminar el rango "${tierName}"?`)) return;
    const toastId = toast.loading("Eliminando rango…");
    try {
      await brandConfigApi.deleteTier(tierId);
      toast.success(`Rango "${tierName}" eliminado`, { id: toastId });
      const tiers = await brandConfigApi.listTiers(scheme.id);
      setRanges((tiers || []).map(t => ({
        id: t.id, name: t.tier_name, min: t.min_units,
        max: t.max_units ?? "", priority: t.priority ?? 1, rate_percent: t.rate_percent ?? "",
      })));
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo eliminar el rango", { id: toastId });
    }
  };

  // ── Porcentajes ───────────────────────────────────────────────────────────
  const onChangePct = (tierId, value) => {
    const v = value === "" ? "" : Number(value);
    setPctRows(prev => prev.map(r => r.tier_id === tierId ? { ...r, percentage: v } : r));
    setPctDirty(prev => { const next = new Set(prev); next.add(Number(tierId)); return next; });
  };

  const validatePct = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "El porcentaje debe ser numérico.";
    if (n < 0 || n > 100)   return "El porcentaje debe estar entre 0 y 100.";
    return null;
  };

  const savePctAll = async () => {
    if (!scheme?.id) return;
    const dirtyIds  = Array.from(pctDirty);
    if (!dirtyIds.length) return;
    const dirtyRows = pctRows.filter(r => dirtyIds.includes(Number(r.tier_id)));

    for (const r of dirtyRows) {
      const errMsg = validatePct(r.percentage);
      if (errMsg) { toast.error(`${r.tier_name}: ${errMsg}`); return; }
    }

    setPctSaving(true);
    const toastId = toast.loading(`Guardando ${dirtyIds.length} porcentaje${dirtyIds.length > 1 ? "s" : ""}…`);
    try {
      for (const r of dirtyRows) {
        await percentageTiersApi.upsert(scheme.id, r.tier_id, { percentage: Number(r.percentage) });
      }
      await loadPercentageMatrix(scheme.id);
      toast.success("Porcentajes guardados", { id: toastId });
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudieron guardar los porcentajes", { id: toastId });
    } finally { setPctSaving(false); }
  };

  const discardPctChanges = async () => {
    if (!scheme?.id) return;
    await loadPercentageMatrix(scheme.id);
    toast("Cambios descartados", { icon: "↩" });
  };

  const brandTitle = brand
    ? `Configuración de marca – ${brand.name} (${brand.code})`
    : `Configuración de marca – #${brandId}`;

  if (loading) return (
    <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }}>
      <CircularProgress />
    </Stack>
  );

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate(backPath)} size="small">
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.1 }}>{brandTitle}</Typography>
        </Box>
        <Chip size="small"
          label={commissionType === "RANGES" ? "Comisión por Rangos" : "Comisión por Porcentajes"}
          sx={{ fontWeight: 900 }} />
      </Stack>

      {pageErr && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPageErr("")}>{pageErr}</Alert>}

      <Stack spacing={2}>
        {/* Tipo de comisión */}
        <Paper sx={{ p: 2, borderRadius: 1 }}>
          <Typography sx={{ fontWeight: 900, mb: 0.5 }}>¿Cómo comisiona esta marca?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Elige una opción. La pantalla se ajusta automáticamente.
          </Typography>
          <RadioGroup value={commissionType} onChange={onChangeType}>
            <FormControlLabel value="RANGES" control={<Radio />}
              label={<Box><Typography sx={{ fontWeight: 800 }}>Por rangos</Typography>
                <Typography variant="body2" color="text.secondary">Depende de cuántos vehículos se vendan y usa "tablas/rangos".</Typography></Box>} />
            <FormControlLabel value="PERCENTAGES" control={<Radio />}
              label={<Box><Typography sx={{ fontWeight: 800 }}>Por porcentajes</Typography>
                <Typography variant="body2" color="text.secondary">Se paga un porcentaje del valor comercial según unidades.</Typography></Box>} />
          </RadioGroup>
          {!scheme?.id && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Aún no existe configuración en BD. Al seleccionar el tipo se crea automáticamente.
            </Alert>
          )}
        </Paper>

        {/* Rangos */}
        {commissionType === "RANGES" && (
          <Paper sx={{ p: 2, borderRadius: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Box>
                <Typography sx={{ fontWeight: 900 }}>Rangos de venta</Typography>
                <Typography variant="body2" color="text.secondary">
                  Define rangos y (opcional) el % para autocompletar al crear vehículos.
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<AddRoundedIcon />}
                onClick={openCreateRange} disabled={loading} sx={{ fontWeight: 900 }}>
                Agregar rango
              </Button>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            {!scheme?.id ? (
              <Alert severity="warning">Selecciona y guarda el tipo de comisión para crear la configuración.</Alert>
            ) : (
              <Stack spacing={1}>
                {ranges.slice().sort((a, b) => a.min - b.min).map(r => (
                  <Paper key={r.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 900 }}>
                          {r.name}{" "}
                          <Typography component="span" variant="body2" color="text.secondary">
                            (de {r.min} a {r.max === "" ? "∞" : r.max})
                          </Typography>
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <Chip size="small"
                            label={r.rate_percent === "" || r.rate_percent == null ? "Sin %" : `${Number(r.rate_percent)}%`}
                            sx={{ fontWeight: 900 }} />
                          <Typography variant="caption" sx={{ color: "text.secondary", alignSelf: "center" }}>
                            % para autocompletar comisión por vehículo (opcional)
                          </Typography>
                        </Stack>
                      </Box>
                      <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
                        <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => openEditRange(r)}>
                          Editar
                        </Button>
                        <Tooltip title="Eliminar rango">
                          <IconButton size="small" onClick={() => removeRange(r.id, r.name)}>
                            <DeleteOutlineRoundedIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
                {!ranges.length && (
                  <Alert severity="info">
                    No hay rangos aún. Ejemplo: TABLA_1 (1–5), TABLA_2 (6), TABLA_3 (7–8), TABLA_4 (9–∞).
                  </Alert>
                )}
              </Stack>
            )}
          </Paper>
        )}

        {/* Porcentajes */}
        {commissionType === "PERCENTAGES" && (
          <Paper sx={{ p: 2, borderRadius: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Box>
                <Typography sx={{ fontWeight: 900 }}>Porcentaje según unidades vendidas</Typography>
                <Typography variant="body2" color="text.secondary">
                  Esta matriz se guarda en <b>commission_percentage_tiers</b>.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                {pctLoading && <CircularProgress size={16} />}
                <Button variant="outlined" onClick={discardPctChanges}
                  disabled={!scheme?.id || pctSaving || pctLoading || pctDirty.size === 0}
                  sx={{ fontWeight: 900, whiteSpace: "nowrap" }}>
                  Descartar
                </Button>
                <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={savePctAll}
                  disabled={!scheme?.id || pctSaving || pctLoading || pctDirty.size === 0}
                  sx={{ fontWeight: 900, whiteSpace: "nowrap" }}>
                  {pctSaving ? "Guardando…" : `Guardar (${pctDirty.size})`}
                </Button>
              </Stack>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            {!scheme?.id ? (
              <Alert severity="warning">Selecciona y guarda el tipo de comisión para crear la configuración.</Alert>
            ) : pctRows.length === 0 ? (
              <Alert severity="info">No hay tiers/porcentajes cargados para este scheme.</Alert>
            ) : (
              <Stack spacing={1}>
                {pctRows.map(row => {
                  const isDirty  = pctDirty.has(Number(row.tier_id));
                  const fieldErr = isDirty ? validatePct(row.percentage) : null;
                  return (
                    <Paper key={row.tier_id} variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}
                        alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 900 }}>
                            {row.tier_name}{" "}
                            <Typography component="span" variant="body2" color="text.secondary">({row.label})</Typography>
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            % aplicado al sale_price cuando el asesor cae en este tier.
                          </Typography>
                        </Box>
                        <TextField size="small" label="% Comisión" type="number"
                          value={row.percentage}
                          onChange={e => onChangePct(row.tier_id, e.target.value)}
                          sx={{ width: { xs: "100%", sm: 200 } }}
                          error={!!fieldErr}
                          helperText={fieldErr || (isDirty ? "Pendiente por guardar" : " ")} />
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Paper>
        )}

        {/* Reglas y bonos */}
        <Paper sx={{ p: 2, borderRadius: 1 }}>
          <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Bonos y reglas adicionales</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Vacaciones, antigüedad (&lt; 3 meses), bono por metas, etc.
          </Typography>
          {!scheme?.id ? (
            <Alert severity="warning">Guarda primero el tipo de comisión para configurar reglas y bonos.</Alert>
          ) : (
            <RulesBonusesSection
              schemeId={scheme.id}
              schemeTiers={ranges.map(r => ({ id: r.id, tier_name: r.name, min_units: r.min, max_units: r.max === "" ? null : r.max }))}
              brandId={brandId}
            />
          )}
        </Paper>
      </Stack>

      {/* Modal rango */}
      <Dialog open={rangeOpen} onClose={closeRange} fullWidth maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 900, px: 3, py: 2 }}>
          {rangeForm.id ? "Editar rango" : "Nuevo rango"}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
          <Stack spacing={2}>
            <TextField label="Nombre" value={rangeForm.name}
              onChange={e => setRangeForm(s => ({ ...s, name: e.target.value }))}
              helperText='Ej: "TABLA_1", "Nivel Oro", "Rango 4"' fullWidth />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Desde (min unidades)" type="number"
                value={rangeForm.min}
                onChange={e => setRangeForm(s => ({ ...s, min: e.target.value }))} fullWidth />
              <TextField label="Hasta (max unidades)" type="number"
                value={rangeForm.max}
                onChange={e => setRangeForm(s => ({ ...s, max: e.target.value }))}
                helperText="Vacío = infinito" fullWidth />
            </Stack>
            <TextField label="% para autocompletar TABLA (opcional)" type="number"
              value={rangeForm.rate_percent}
              onChange={e => setRangeForm(s => ({ ...s, rate_percent: e.target.value }))}
              helperText="Ej: 0.8 (0.8% del valor comercial). Vacío si no aplica." fullWidth />
            {rangeErr && <Typography variant="body2" sx={{ color: "error.main" }}>{rangeErr}</Typography>}
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Button onClick={closeRange} disabled={savingRange} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button variant="contained" startIcon={<SaveRoundedIcon />}
            onClick={saveRange} disabled={savingRange} sx={{ fontWeight: 900, borderRadius: 2 }}>
            {savingRange ? "Guardando…" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
