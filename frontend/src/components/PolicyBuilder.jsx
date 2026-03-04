import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Step,
  Stepper,
  StepLabel,
  Box,
  Stack,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Chip,
  Alert,
  Divider,
  Autocomplete,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  CONDITION_META,
  RULE_CONDITION_TYPES,
  BONUS_CONDITION_TYPES,
  EFFECT_LABELS,
} from "../constants/policyEngine";

const STEPS_RULE = ["Tipo y nombre", "Condiciones", "Efecto"];
const STEPS_BONUS = ["Tipo y nombre", "Condiciones", "Monto"];

const emptyCondition = (scope) => ({
  type: scope === "rule" ? "ADVISOR_ON_VACATION" : "MIN_TOTAL_UNITS",
  value: "",
  vehicle_id: null,
});

function ConditionRow({
  condition,
  index,
  scope,
  vehicles,
  onChange,
  onDelete,
  isOnly,
}) {
  const meta = CONDITION_META[condition.type] || {};
  const typeList =
    scope === "rule" ? RULE_CONDITION_TYPES : BONUS_CONDITION_TYPES;

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      alignItems={{ sm: "flex-start" }}
      sx={{
        p: 1.5,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.default",
      }}
    >
      {index > 0 && (
        <Chip
          label="Y"
          size="small"
          sx={{ alignSelf: "center", fontWeight: 900, minWidth: 32 }}
        />
      )}

      <FormControl size="small" sx={{ minWidth: 260, flex: 1 }}>
        <InputLabel>Condición</InputLabel>
        <Select
          value={condition.type}
          label="Condición"
          onChange={(e) =>
            onChange(index, {
              type: e.target.value,
              value: "",
              vehicle_id: null,
            })
          }
        >
          {typeList.map((t) => (
            <MenuItem key={t} value={t}>
              {CONDITION_META[t]?.label || t}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {meta.needsValue && (
        <TextField
          size="small"
          label={meta.valuePlaceholder || "Valor"}
          type="number"
          value={condition.value}
          onChange={(e) =>
            onChange(index, { ...condition, value: e.target.value })
          }
          sx={{ width: 150 }}
          inputProps={{ min: 0 }}
        />
      )}

      {meta.needsVehicle && (
        <Autocomplete
          size="small"
          options={Array.isArray(vehicles) ? vehicles : []}
          getOptionLabel={(v) =>
            `${v.code} – ${v.model}${v.version ? ` ${v.version}` : ""}`
          }
          value={
            (Array.isArray(vehicles) ? vehicles : []).find(
              (v) => v.id === condition.vehicle_id,
            ) || null
          }
          onChange={(_, val) =>
            onChange(index, { ...condition, vehicle_id: val?.id || null })
          }
          renderInput={(params) => <TextField {...params} label="Vehículo" />}
          sx={{ width: 260 }}
          isOptionEqualToValue={(o, v) => o.id === v.id}
        />
      )}

      <IconButton
        size="small"
        onClick={() => onDelete(index)}
        disabled={isOnly}
        sx={{ alignSelf: "center", color: "error.main" }}
      >
        <DeleteOutlineRoundedIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}

export default function PolicyBuilder({
  open,
  onClose,
  onSave,
  initialData = null,
  scope, // "rule" | "bonus"
  vehicles = [],
  tiers = [],
  saving = false,
}) {
  const isEdit = Boolean(initialData?.id);
  const steps = scope === "rule" ? STEPS_RULE : STEPS_BONUS;
  const [step, setStep] = React.useState(0);
  const [err, setErr] = React.useState("");

  // Form state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [priority, setPriority] = React.useState(0);
  const [isActive, setIsActive] = React.useState(true);
  const [conditions, setConditions] = React.useState([emptyCondition(scope)]);

  // Rule effect
  const [effectType, setEffectType] = React.useState("FORCE_TIER");
  const [effectValue, setEffectValue] = React.useState("");

  // Bonus amount
  const [bonusAmount, setBonusAmount] = React.useState("");

  // Inicializar con datos existentes al abrir
  React.useEffect(() => {
    if (!open) return;
    setStep(0);
    setErr("");
    if (initialData) {
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setNotes(initialData.notes || "");
      setPriority(initialData.priority ?? 0);
      setIsActive(initialData.is_active !== false);
      setConditions(
        Array.isArray(initialData.conditions) &&
          initialData.conditions.length > 0
          ? initialData.conditions
          : [emptyCondition(scope)],
      );
      if (scope === "rule") {
        setEffectType(initialData.effect_type || "FORCE_TIER");
        setEffectValue(initialData.effect_value || "");
      } else {
        setBonusAmount(initialData.bonus_amount || "");
      }
    } else {
      setName("");
      setDescription("");
      setNotes("");
      setPriority(0);
      setIsActive(true);
      setConditions([emptyCondition(scope)]);
      setEffectType("FORCE_TIER");
      setEffectValue("");
      setBonusAmount("");
    }
  }, [open, initialData, scope]);

  const handleClose = () => {
    if (!saving) onClose();
  };

  const validateStep = () => {
    setErr("");
    if (step === 0) {
      if (!name.trim()) {
        setErr("El nombre es obligatorio");
        return false;
      }
    }
    if (step === 1) {
      for (const [i, c] of conditions.entries()) {
        const meta = CONDITION_META[c.type];
        if (!meta) {
          setErr(`Condición ${i + 1}: tipo no reconocido`);
          return false;
        }
        if (
          meta.needsValue &&
          (c.value === "" || c.value === null || isNaN(Number(c.value)))
        ) {
          setErr(
            `Condición ${i + 1}: "${meta.label}" requiere un valor numérico`,
          );
          return false;
        }
        if (meta.needsValue && Number(c.value) < 0) {
          setErr(`Condición ${i + 1}: el valor no puede ser negativo`);
          return false;
        }
        if (meta.needsVehicle && !c.vehicle_id) {
          setErr(
            `Condición ${i + 1}: "${meta.label}" requiere seleccionar un vehículo`,
          );
          return false;
        }
      }
    }
    if (step === 2) {
      if (scope === "rule") {
        if (!effectValue.toString().trim()) {
          setErr("Define el efecto de la regla");
          return false;
        }
        if (
          effectType !== "FORCE_TIER" &&
          (isNaN(Number(effectValue)) || Number(effectValue) <= 0)
        ) {
          setErr("El monto debe ser un número mayor a 0");
          return false;
        }
      } else {
        if (isNaN(Number(bonusAmount)) || Number(bonusAmount) <= 0) {
          setErr("El monto del bono debe ser mayor a 0");
          return false;
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setStep((s) => s + 1);
  };
  const handleBack = () => {
    setErr("");
    setStep((s) => s - 1);
  };

  const handleSave = () => {
    if (!validateStep()) return;
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      notes: notes.trim() || null,
      priority: Number(priority),
      is_active: isActive,
      conditions,
      ...(scope === "rule"
        ? { effect_type: effectType, effect_value: String(effectValue).trim() }
        : { bonus_amount: Number(bonusAmount) }),
    };
    onSave(payload);
  };

  const addCondition = () =>
    setConditions((prev) => [...prev, emptyCondition(scope)]);
  const removeCondition = (i) =>
    setConditions((prev) => prev.filter((_, idx) => idx !== i));
  const changeCondition = (i, updated) =>
    setConditions((prev) => prev.map((c, idx) => (idx === i ? updated : c)));

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>
        {isEdit ? "Editar" : "Nueva"} {scope === "rule" ? "regla" : "bono"}
      </DialogTitle>

      <Box sx={{ px: 3, pb: 1 }}>
        <Stepper activeStep={step} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent dividers sx={{ minHeight: 340 }}>
        {err && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr("")}>
            {err}
          </Alert>
        )}

        {/* ── PASO 0: Tipo y nombre ── */}
        {step === 0 && (
          <Stack spacing={2}>
            <TextField
              label="Nombre *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              autoFocus
              placeholder={
                scope === "rule"
                  ? 'Ej: "Asesor en vacaciones"'
                  : 'Ej: "Bono meta marzo"'
              }
            />
            <TextField
              label="Descripción (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              placeholder="Explica brevemente para qué sirve esta política"
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Prioridad"
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                helperText="Mayor número = se evalúa primero"
                sx={{ width: 140 }}
                inputProps={{ min: 0 }}
              />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Estado:
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={isActive ? "active" : "inactive"}
                  onChange={(_, v) => {
                    if (v) setIsActive(v === "active");
                  }}
                >
                  <ToggleButton value="active" sx={{ fontWeight: 800 }}>
                    Activa
                  </ToggleButton>
                  <ToggleButton value="inactive" sx={{ fontWeight: 800 }}>
                    Inactiva
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Stack>
            <TextField
              label="Notas internas (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        )}

        {/* ── PASO 1: Condiciones ── */}
        {step === 1 && (
          <Stack
            direction="row"
            spacing={2} // sube de 1 → 2
            alignItems="flex-start"
            flexWrap="wrap"
            sx={{
              p: 2, // sube de 1.5 → 2
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.default",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Todas las condiciones deben cumplirse al mismo tiempo <b>(AND)</b>
              .
            </Typography>

            {conditions.map((c, i) => (
              <ConditionRow
                key={i}
                condition={c}
                index={i}
                scope={scope}
                vehicles={vehicles}
                onChange={changeCondition}
                onDelete={removeCondition}
                isOnly={conditions.length === 1}
              />
            ))}

            <Button
              startIcon={<AddRoundedIcon />}
              onClick={addCondition}
              variant="outlined"
              size="small"
              sx={{ alignSelf: "flex-start", fontWeight: 800 }}
            >
              Agregar condición AND
            </Button>
          </Stack>
        )}

        {/* ── PASO 2: Efecto (regla) o Monto (bono) ── */}
        {step === 2 && scope === "rule" && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              ¿Qué pasa cuando se cumplen todas las condiciones?
            </Typography>

            <ToggleButtonGroup
              exclusive
              value={effectType}
              onChange={(_, v) => {
                if (v) {
                  setEffectType(v);
                  setEffectValue("");
                }
              }}
              fullWidth
            >
              {Object.entries(EFFECT_LABELS).map(([key, meta]) => (
                <ToggleButton
                  key={key}
                  value={key}
                  sx={{ fontWeight: 800, flexDirection: "column", py: 1.5 }}
                >
                  <Typography variant="h6">{meta.icon}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>
                    {meta.label}
                  </Typography>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            {effectType === "FORCE_TIER" ? (
              <FormControl size="small" sx={{ minWidth: 300, flex: 1 }}>
                <InputLabel>Tier a aplicar</InputLabel>
                <Select
                  value={effectValue}
                  label="Tier a aplicar"
                  onChange={(e) => setEffectValue(e.target.value)}
                >
                  {(tiers || []).map((t) => (
                    <MenuItem key={t.id} value={t.tier_name}>
                      {t.tier_name}
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        ({t.min_units} – {t.max_units ?? "∞"} unidades)
                      </Typography>
                    </MenuItem>
                  ))}
                  {(!tiers || tiers.length === 0) && (
                    <MenuItem disabled>No hay tiers configurados</MenuItem>
                  )}
                </Select>
              </FormControl>
            ) : (
              <TextField
                label={
                  effectType === "FIXED_ADD"
                    ? "Monto a sumar ($)"
                    : "Monto a descontar ($)"
                }
                type="number"
                value={effectValue}
                onChange={(e) => setEffectValue(e.target.value)}
                fullWidth
                helperText="Valor en pesos colombianos"
                inputProps={{ min: 1 }}
              />
            )}
          </Stack>
        )}

        {step === 2 && scope === "bonus" && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Monto que se suma a la comisión cuando se cumplen todas las
              condiciones.
            </Typography>
            <TextField
              label="Monto del bono ($) *"
              type="number"
              value={bonusAmount}
              onChange={(e) => setBonusAmount(e.target.value)}
              fullWidth
              autoFocus
              helperText="Valor fijo en pesos colombianos"
              inputProps={{ min: 1 }}
            />
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={saving}>
          Cancelar
        </Button>
        {step > 0 && (
          <Button onClick={handleBack} disabled={saving}>
            ← Anterior
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            sx={{ fontWeight: 900 }}
          >
            Siguiente →
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<SaveRoundedIcon />}
            onClick={handleSave}
            disabled={saving}
            sx={{ fontWeight: 900 }}
          >
            {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
