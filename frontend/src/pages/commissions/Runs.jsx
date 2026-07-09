// frontend/src/pages/commissions/Runs.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Card, Typography, Stack, TextField, Button, IconButton, Tooltip,
  MenuItem, Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  TablePagination, Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, Chip, CircularProgress, Paper, ToggleButtonGroup, ToggleButton,
  InputAdornment, Collapse, Alert, 
} from "@mui/material";
import toast from "react-hot-toast";

import AddRoundedIcon           from "@mui/icons-material/AddRounded";
import CloseRoundedIcon         from "@mui/icons-material/CloseRounded";
import RefreshRoundedIcon       from "@mui/icons-material/RefreshRounded";
import VisibilityRoundedIcon    from "@mui/icons-material/VisibilityRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AddCircleOutlineIcon     from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon  from "@mui/icons-material/RemoveCircleOutline";
import EditNoteRoundedIcon      from "@mui/icons-material/EditNoteRounded";
import DeleteForeverRoundedIcon from "@mui/icons-material/DeleteForeverRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import BulkCalculateDialog  from "./BulkCalculateDialog";
import DownloadPdfDialog    from "./DownloadPdfDialog";
import AutorenewRoundedIcon    from "@mui/icons-material/AutorenewRounded";
import FolderZipRoundedIcon    from "@mui/icons-material/FolderZipRounded";

import { useCommissionRunsStore } from "../../app/store/commissionRuns.store";
import { usePermissions }         from "../../app/hooks/usePermissions";
import { commissionRunsApi }      from "../../api/commissionRuns.api";
import { exportsApi }             from "../../api/exports.api";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

export const MONTHS = [
  { value: 1,  label: "Enero"      },
  { value: 2,  label: "Febrero"    },
  { value: 3,  label: "Marzo"      },
  { value: 4,  label: "Abril"      },
  { value: 5,  label: "Mayo"       },
  { value: 6,  label: "Junio"      },
  { value: 7,  label: "Julio"      },
  { value: 8,  label: "Agosto"     },
  { value: 9,  label: "Septiembre" },
  { value: 10, label: "Octubre"    },
  { value: 11, label: "Noviembre"  },
  { value: 12, label: "Diciembre"  },
];

const getMonthName = (month) =>
  MONTHS.find((m) => m.value === Number(month))?.label ?? "—";

const COP = new Intl.NumberFormat("es-CO", {
  style:                "currency",
  currency:             "COP",
  maximumFractionDigits: 0,
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de UI
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  DRAFT:            { label: "Borrador",           color: "default",  textColor: "text.secondary"  },
  CALCULATED:       { label: "Calculada",           color: "info",     textColor: "#63b3ed"         },
  ADVISOR_APPROVED: { label: "Aprobada",            color: "success",  textColor: "#68d391"         },
  ADVISOR_REJECTED: { label: "Rechazada",           color: "error",    textColor: "#fc8181"         },
  ASST_VALIDATED:   { label: "Validada",            color: "warning",  textColor: "#f6ad55"         },
  SENT_TO_HR:       { label: "Enviada a RRHH",      color: "success",  textColor: "#9ae6b4"         },
};

function statusChip(status) {
  const s    = String(status || "—").toUpperCase();
  const conf = STATUS_CONFIG[s] || { label: s, color: "default" };
  return (
    <Chip
      size="small"
      label={conf.label}
      color={conf.color}
      sx={{ fontWeight: 700, fontSize: "0.7rem" }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente AdjustmentPanel — sección de ajuste manual dentro del detalle
// ─────────────────────────────────────────────────────────────────────────────

function AdjustmentPanel() {
  const {
    detail, hasAdjustment,
    adjustForm, setAdjustForm,
    isAdjusting,
    submitAdjustment, removeAdjustment,
  } = useCommissionRunsStore();

  const run = detail?.run;
  if (!run) return null;

  // Solo visible en estado CALCULATED
  if (String(run.status).toUpperCase() !== "CALCULATED") return null;

  const hasAdj      = hasAdjustment || run.manual_adjustment != null;
  const adjAmount   = Number(run.manual_adjustment || 0);
  const adjType     = run.manual_adjustment_type;
  const adjNote     = run.manual_adjustment_note;
  const baseComm    = Number(run.base_commission  || 0);
  const totalComm   = Number(run.total_commission || 0);

  const [confirmRemove, setConfirmRemove] = useState(false);

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: hasAdj ? "rgba(246,173,85,0.35)" : "divider",
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5, py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          background: hasAdj
            ? "linear-gradient(90deg, rgba(246,173,85,0.06), transparent)"
            : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <EditNoteRoundedIcon sx={{ fontSize: 18, color: hasAdj ? "#f6ad55" : "text.secondary" }} />
          <Typography
            sx={{
              fontWeight: 900,
              color: "text.secondary",
              fontSize: "0.75rem",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Ajuste manual
          </Typography>
          {hasAdj && (
            <Chip
              size="small"
              label={adjType === "ADD" ? `+${COP.format(adjAmount)}` : `-${COP.format(adjAmount)}`}
              sx={{
                fontWeight: 900,
                fontSize: "0.68rem",
                bgcolor: adjType === "ADD"
                  ? "rgba(104,211,145,0.12)"
                  : "rgba(252,129,129,0.12)",
                color:   adjType === "ADD" ? "#68d391" : "#fc8181",
                border:  adjType === "ADD"
                  ? "1px solid rgba(104,211,145,0.3)"
                  : "1px solid rgba(252,129,129,0.3)",
              }}
            />
          )}
        </Stack>

        {hasAdj && (
          <Tooltip title="Eliminar ajuste">
            <IconButton
              size="small"
              onClick={() => setConfirmRemove(true)}
              disabled={isAdjusting}
              sx={{ color: "error.main" }}
            >
              <DeleteForeverRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Box sx={{ p: 2.5 }}>
        {/* Confirmación de eliminación */}
        <Collapse in={confirmRemove}>
          <Alert
            severity="warning"
            action={
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => setConfirmRemove(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="contained"
                  disabled={isAdjusting}
                  onClick={() => { setConfirmRemove(false); removeAdjustment(); }}
                >
                  {isAdjusting ? "Eliminando…" : "Sí, eliminar"}
                </Button>
              </Stack>
            }
            sx={{ mb: 2, borderRadius: 1.5 }}
          >
            ¿Eliminar el ajuste? El total vuelve a{" "}
            <strong>{COP.format(baseComm)}</strong>
          </Alert>
        </Collapse>

        {/* Resumen del ajuste existente */}
        {hasAdj && (
          <Box
            sx={{
              mb: 2, p: 1.5, borderRadius: 1.5,
              bgcolor: adjType === "ADD"
                ? "rgba(104,211,145,0.06)"
                : "rgba(252,129,129,0.06)",
              border: adjType === "ADD"
                ? "1px solid rgba(104,211,145,0.2)"
                : "1px solid rgba(252,129,129,0.2)",
            }}
          >
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", fontSize: "0.6rem", letterSpacing: 1 }}>
                  Concepto
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25 }}>{adjNote}</Typography>
              </Box>
              <Box sx={{ textAlign: { sm: "right" } }}>
                <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", fontSize: "0.6rem", letterSpacing: 1 }}>
                  {adjType === "ADD" ? "Aumento" : "Descuento"}
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 900,
                    fontSize: "1rem",
                    color: adjType === "ADD" ? "#68d391" : "#fc8181",
                  }}
                >
                  {adjType === "ADD" ? "+" : "-"}{COP.format(adjAmount)}
                </Typography>
              </Box>
            </Stack>
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Base: {COP.format(baseComm)}
              </Typography>
              <Typography sx={{ fontWeight: 900, color: "#f6ad55" }}>
                Total: {COP.format(totalComm)}
              </Typography>
            </Stack>
            {run.adjustment_by_name && (
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                Aplicado por: {run.adjustment_by_name}
              </Typography>
            )}
          </Box>
        )}

        {/* Formulario de ajuste */}
        <Stack spacing={2}>
          {/* Tipo: ADD o SUBTRACT */}
          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, mb: 1, display: "block" }}>
              Tipo de ajuste
            </Typography>
            <ToggleButtonGroup
              value={adjustForm.type}
              exclusive
              onChange={(_, val) => { if (val) setAdjustForm({ type: val }); }}
              size="small"
              fullWidth
            >
              <ToggleButton
                value="ADD"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  "&.Mui-selected": {
                    bgcolor: "rgba(104,211,145,0.15)",
                    color: "#68d391",
                    borderColor: "rgba(104,211,145,0.4)",
                  },
                }}
              >
                <AddCircleOutlineIcon sx={{ fontSize: 16, mr: 0.75 }} />
                Aumentar comisión
              </ToggleButton>
              <ToggleButton
                value="SUBTRACT"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  "&.Mui-selected": {
                    bgcolor: "rgba(252,129,129,0.12)",
                    color: "#fc8181",
                    borderColor: "rgba(252,129,129,0.35)",
                  },
                }}
              >
                <RemoveCircleOutlineIcon sx={{ fontSize: 16, mr: 0.75 }} />
                Descontar de comisión
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Monto */}
          <TextField
            label="Monto del ajuste"
            value={adjustForm.amount}
            onChange={(e) => setAdjustForm({ amount: e.target.value })}
            type="number"
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Typography sx={{ color: adjustForm.type === "ADD" ? "#68d391" : "#fc8181", fontWeight: 900 }}>
                    {adjustForm.type === "ADD" ? "+" : "-"}
                  </Typography>
                </InputAdornment>
              ),
            }}
            placeholder="Ej: 50000"
            helperText={
              adjustForm.amount && Number(adjustForm.amount) > 0
                ? `Nuevo total estimado: ${COP.format(
                    adjustForm.type === "ADD"
                      ? baseComm + Number(adjustForm.amount)
                      : Math.max(0, baseComm - Number(adjustForm.amount))
                  )}`
                : " "
            }
          />

          {/* Concepto */}
          <TextField
            label="Concepto del ajuste"
            value={adjustForm.note}
            onChange={(e) => setAdjustForm({ note: e.target.value })}
            size="small"
            fullWidth
            multiline
            rows={2}
            placeholder="Ej: Cobro de transporte, Bono adicional por desempeño…"
            helperText="Mínimo 5 caracteres. Este concepto queda registrado en la comisión."
          />

          {/* Botón aplicar */}
          <Button
            variant="contained"
            disabled={isAdjusting || !adjustForm.amount || !adjustForm.note}
            onClick={submitAdjustment}
            sx={{
              fontWeight: 900,
              borderRadius: 2,
              bgcolor: adjustForm.type === "ADD"
                ? "rgba(104,211,145,0.85)"
                : "rgba(252,129,129,0.85)",
              color: "#1A202C",
              "&:hover": {
                bgcolor: adjustForm.type === "ADD" ? "#68d391" : "#fc8181",
              },
              "&.Mui-disabled": { opacity: 0.5 },
            }}
          >
            {isAdjusting
              ? "Aplicando…"
              : hasAdj
                ? (adjustForm.type === "ADD" ? "✓ Modificar aumento" : "✓ Modificar descuento")
                : (adjustForm.type === "ADD" ? "✓ Aplicar aumento" : "✓ Aplicar descuento")
            }
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function Runs() {
  const {
    items, total, filters, brands, advisors,
    isLoading, isCalculating, isLoadingDetail, isDeleting, error,
    openCalc, calcForm, openDetail, detail, openConfirmDelete,
    setFilters, resetFilters, hydrateMeta, fetchRuns,
    openCalculate, closeCalculate, setCalcForm, submitCalculate,
    openRunDetail, closeRunDetail,
    promptDeleteRun, cancelDeleteRun, confirmDeleteRun,
    openBulkCalculate,
  } = useCommissionRunsStore();

  const perms     = usePermissions();
  const [validating, setValidating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(null); // id del run descargándose
  const [openDownloadDialog, setOpenDownloadDialog] = useState(false);

  const handleValidate = async () => {
    if (!detail?.run) return;
    setValidating(true);
    const toastId = toast.loading("Validando comisión…");
    try {
      const brandCode = detail.run.brand_code;
      await commissionRunsApi.validate(detail.run.id, brandCode);
      toast.success("Comisión validada", { id: toastId });
      await openRunDetail(detail.run.id);
      fetchRuns();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Error al validar", { id: toastId });
    } finally {
      setValidating(false);
    }
  };

  useEffect(() => {
    (async () => {
      await hydrateMeta();
      await fetchRuns();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (openCalc && advisors.length === 0) hydrateMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCalc]);

  const downloadPdf = async (run) => {
    const runId = run.id;
    if (downloadingPdf === runId) return;
    setDownloadingPdf(runId);
    const toastId = toast.loading(`Generando PDF de ${run.advisor_name}…`);
    try {
      const brandCode = run.brand_code || get().getBrandCode?.() || "KIA";
      const blob = await exportsApi.downloadPdf(runId);  // GET /exports/:id/pdf
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const month = getMonthName(run.cut_month);
      const q     = run.fortnight === "FIRST" ? "1ra" : "2da";
      a.href     = url;
      a.download = `comision_${(run.advisor_name || "asesor").replace(/\s+/g, "_")}_${month}_${run.cut_year}_${q}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF descargado", { id: toastId });
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo generar el PDF", { id: toastId });
    } finally {
      setDownloadingPdf(null);
    }
  };

  const brandOptions   = useMemo(() => brands   || [], [brands]);
  const advisorOptions = useMemo(() => advisors || [], [advisors]);
  // Código de marca actualmente seleccionada — para pasarla al dialog de descarga
  const currentBrandCode = useMemo(() => {
    const b = (brands || []).find(x => String(x.id) === String(filters.brand_id));
    return b?.code || "KIA";
  }, [brands, filters.brand_id]);

  const currentStatus = detail?.run
    ? String(detail.run.status).toUpperCase()
    : "";

  return (
    <Box sx={{ width: "100%" }}>
      <Stack spacing={2}>

        {/* ── Header ── */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Cálculo de comisiones
          </Typography>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refrescar">
              <IconButton onClick={() => fetchRuns()}>
                <RefreshRoundedIcon />
              </IconButton>
            </Tooltip>
            <Button
              onClick={() => setOpenDownloadDialog(true)}
              variant="outlined"
              startIcon={<FolderZipRoundedIcon />}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Descargar PDF
            </Button>
            <Button
              onClick={openBulkCalculate}
              variant="outlined"
              startIcon={<AutorenewRoundedIcon />}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Calcular todas
            </Button>
            <Button
              onClick={openCalculate}
              variant="contained"
              startIcon={<AddRoundedIcon />}
              sx={{ borderRadius: 2, fontWeight: 900 }}
            >
              Calcular comisión
            </Button>
          </Stack>
        </Stack>

        {/* ── Filtros ── */}
        <Card sx={{ p: 2, borderRadius: 1 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} flexWrap="wrap">
            <TextField
              label="Marca"
              value={filters.brand_id}
              onChange={(e) => { setFilters({ brand_id: e.target.value }); fetchRuns(); }}
              size="small" select sx={{ minWidth: 200 }}
            >
              {brandOptions.map((b) => (
                <MenuItem key={b.id} value={String(b.id)}>{b.name} ({b.code})</MenuItem>
              ))}
            </TextField>

            <TextField
              label="Año" type="number"
              value={filters.cut_year}
              onChange={(e) => setFilters({ cut_year: Number(e.target.value) })}
              size="small" sx={{ width: 120 }}
            />

            <TextField
              label="Mes" value={filters.cut_month}
              onChange={(e) => setFilters({ cut_month: Number(e.target.value) })}
              size="small" select sx={{ minWidth: 160 }}
            >
              {MONTHS.map((m) => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="Asesor (opcional)"
              value={String(filters.advisor_id || "")}
              onChange={(e) => setFilters({ advisor_id: e.target.value })}
              size="small" select sx={{ minWidth: 280 }}
            >
              <MenuItem value="">Todos</MenuItem>
              {advisorOptions.map((u) => (
                <MenuItem key={u.id} value={String(u.id)}>
                  {u.full_name} — {u.email}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Estado" value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value })}
              size="small" select sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="DRAFT">Borrador</MenuItem>
              <MenuItem value="CALCULATED">Calculada</MenuItem>
              <MenuItem value="ADVISOR_APPROVED">Aprobada por asesor</MenuItem>
              <MenuItem value="ADVISOR_REJECTED">Rechazada</MenuItem>
              <MenuItem value="ASST_VALIDATED">Validada</MenuItem>
              <MenuItem value="SENT_TO_HR">Enviada a RRHH</MenuItem>
            </TextField>

            <Button
              variant="outlined"
              onClick={() => { resetFilters(); fetchRuns(); }}
              sx={{ borderRadius: 2 }}
            >
              Limpiar
            </Button>

            <Button
              variant="contained"
              onClick={() => fetchRuns()}
              sx={{ borderRadius: 2 }}
            >
              Buscar
            </Button>
          </Stack>
        </Card>

        {/* ── Tabla ── */}
        <Card sx={{ borderRadius: 1, overflow: "hidden" }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Asesor</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Corte</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Uds.</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Base</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Ajuste</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 900, width: 80 }} align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                        <CircularProgress size={18} />
                        <Typography variant="body2">Cargando comisiones…</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Typography variant="body2" sx={{ py: 2, color: "text.secondary" }}>
                        No hay comisiones para mostrar.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((r) => {
                    const hasAdj = r.manual_adjustment != null;
                    const adjAmt  = Number(r.manual_adjustment || 0);
                    const adjType = r.manual_adjustment_type;
                    return (
                      <TableRow key={r.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 900 }}>{r.id}</Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2">{r.advisor_name || "—"}</Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {r.advisor_email || ""}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {getMonthName(r.cut_month)} {r.cut_year}{" "}
                            ({r.fortnight === "FIRST" ? "1ra" : "2da"})
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {r.brand_code || ""}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2">{r.units_total ?? 0}</Typography>
                        </TableCell>

                        {/* Base */}
                        <TableCell>
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            {COP.format(Number(r.base_commission || 0))}
                          </Typography>
                        </TableCell>

                        {/* Ajuste */}
                        <TableCell>
                          {hasAdj ? (
                            <Chip
                              size="small"
                              label={`${adjType === "ADD" ? "+" : "-"}${COP.format(adjAmt)}`}
                              sx={{
                                fontWeight: 700,
                                fontSize: "0.65rem",
                                bgcolor: adjType === "ADD"
                                  ? "rgba(104,211,145,0.1)"
                                  : "rgba(252,129,129,0.1)",
                                color:   adjType === "ADD" ? "#68d391" : "#fc8181",
                              }}
                            />
                          ) : (
                            <Typography variant="caption" sx={{ color: "text.disabled" }}>—</Typography>
                          )}
                        </TableCell>

                        {/* Total */}
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 900, color: "#f6ad55" }}>
                            {COP.format(Number(r.total_commission || 0))}
                          </Typography>
                        </TableCell>

                        <TableCell>{statusChip(r.status)}</TableCell>

                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="Ver detalle">
                              <IconButton size="small" onClick={() => openRunDetail(r.id)}>
                                <VisibilityRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Descargar PDF">
                              <IconButton
                                size="small"
                                onClick={() => downloadPdf(r)}
                                disabled={downloadingPdf === r.id}
                                sx={{ color: "#fc8181" }}
                              >
                                {downloadingPdf === r.id
                                  ? <CircularProgress size={14} />
                                  : <PictureAsPdfRoundedIcon fontSize="small" />
                                }
                              </IconButton>
                            </Tooltip>
                            {["DRAFT", "CALCULATED"].includes(String(r.status).toUpperCase()) && (
                              <Tooltip title="Eliminar comisión">
                                <IconButton
                                  size="small"
                                  onClick={() => promptDeleteRun(r.id)}
                                  sx={{ color: "error.main" }}
                                >
                                  <DeleteOutlineRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider />

          <TablePagination
            component="div"
            count={total}
            page={(filters.page || 1) - 1}
            onPageChange={async (_, newPage) => {
              setFilters({ page: newPage + 1 });
              await fetchRuns();
            }}
            rowsPerPage={filters.limit || 10}
            onRowsPerPageChange={async (e) => {
              setFilters({ limit: Number(e.target.value), page: 1 });
              await fetchRuns();
            }}
            rowsPerPageOptions={[5, 10, 20, 50]}
          />
        </Card>
      </Stack>

      {/* ═══════════════════════════════════════
          Dialog: Calcular comisión
         ═══════════════════════════════════════ */}
      <Dialog
        open={openCalc}
        onClose={closeCalculate}
        fullWidth maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 2, overflow: "hidden" } }}
      >
        <DialogTitle sx={{ px: 3, py: 2, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 900 }}>Calcular comisión</Typography>
            <Chip size="small" label="CALCULAR" sx={{ fontWeight: 900 }} />
          </Stack>
          <Tooltip title="Cerrar">
            <IconButton onClick={closeCalculate} size="small"><CloseRoundedIcon /></IconButton>
          </Tooltip>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
          {!calcForm ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2">Cargando…</Typography>
            </Stack>
          ) : (
            <Stack spacing={2.5} sx={{ pt: 0.5 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1 }}>
                <Typography sx={{ fontWeight: 900, mb: 2 }}>Parámetros del cálculo</Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Asesor"
                    value={String(calcForm.advisor_id || "")}
                    onChange={(e) => setCalcForm({ advisor_id: e.target.value })}
                    select fullWidth
                  >
                    <MenuItem value="">Selecciona…</MenuItem>
                    {advisorOptions.map((u) => (
                      <MenuItem key={u.id} value={String(u.id)}>
                        {u.full_name} — {u.email}
                      </MenuItem>
                    ))}
                  </TextField>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Año" type="number"
                      value={calcForm.cut_year}
                      onChange={(e) => setCalcForm({ cut_year: Number(e.target.value) })}
                      fullWidth
                    />
                    <TextField
                      label="Mes" value={calcForm.cut_month}
                      onChange={(e) => setCalcForm({ cut_month: Number(e.target.value) })}
                      select fullWidth
                    >
                      {MONTHS.map((m) => (
                        <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                      ))}
                    </TextField>
                  </Stack>

                  <TextField
                    label="Quincena" value={calcForm.fortnight}
                    onChange={(e) => setCalcForm({ fortnight: e.target.value })}
                    select fullWidth
                  >
                    <MenuItem value="FIRST">Primera quincena</MenuItem>
                    <MenuItem value="SECOND">Segunda quincena</MenuItem>
                  </TextField>

                  <TextField
                    label="Notas (opcional)"
                    value={calcForm.notes || ""}
                    onChange={(e) => setCalcForm({ notes: e.target.value })}
                    fullWidth
                  />
                </Stack>
              </Paper>

              {error && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, borderColor: "error.main" }}>
                  <Typography variant="body2" sx={{ color: "error.main" }}>{error}</Typography>
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>

        <Divider />
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Button onClick={closeCalculate} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button
            onClick={submitCalculate}
            variant="contained"
            disabled={isCalculating || !calcForm}
            sx={{ fontWeight: 900, borderRadius: 2 }}
          >
            {isCalculating ? "Calculando…" : "Calcular"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════
          Dialog: Detalle comisión
         ═══════════════════════════════════════ */}
      <Dialog
        open={openDetail}
        onClose={closeRunDetail}
        fullWidth maxWidth="md"
        PaperProps={{ sx: { borderRadius: 2, overflow: "hidden", bgcolor: "background.paper" } }}
      >
        <DialogTitle
          sx={{
            px: 3, py: 2,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: "1px solid", borderColor: "divider",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 900 }}>Detalle comisión</Typography>
            {detail?.run && (
              <Box>{statusChip(detail.run.status)}</Box>
            )}
          </Stack>
          <Tooltip title="Cerrar">
            <IconButton onClick={closeRunDetail} size="small"><CloseRoundedIcon fontSize="small" /></IconButton>
          </Tooltip>
        </DialogTitle>

        <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
          {isLoadingDetail ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 4, justifyContent: "center" }}>
              <CircularProgress size={20} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>Cargando detalle…</Typography>
            </Stack>
          ) : !detail?.run ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                No hay información para mostrar.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2.5} sx={{ pt: 0.5 }}>

              {/* ── Resumen ── */}
              <Box sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", overflow: "hidden", bgcolor: "background.paper" }}>
                <Box sx={{ height: 3, background: "linear-gradient(90deg, #63b3ed, #9f7aea, #68d391)" }} />
                <Box sx={{ p: 2.5 }}>
                  <Typography sx={{ fontWeight: 900, mb: 2, color: "text.secondary", fontSize: "0.75rem", letterSpacing: 1, textTransform: "uppercase" }}>
                    Resumen
                  </Typography>

                  <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                    {/* Asesor */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: 1, textTransform: "uppercase", fontSize: "0.65rem" }}>Asesor</Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: "1rem", mt: 0.25 }}>{detail.run.advisor_name}</Typography>
                      <Typography variant="body2" sx={{ color: "#63b3ed", fontWeight: 500 }}>{detail.run.advisor_email}</Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>{detail.run.brand_name} ({detail.run.brand_code})</Typography>
                      <Stack direction="row" sx={{ mt: 1.5, flexWrap: "wrap", gap: 0.75 }}>
                        {detail.run.advisor_document && (
                          <Chip size="small" label={`CC: ${detail.run.advisor_document}`}
                            sx={{ fontWeight: 700, fontSize: "0.7rem", bgcolor: "rgba(99,179,237,0.1)", color: "#63b3ed", border: "1px solid rgba(99,179,237,0.25)" }} />
                        )}
                        {detail.run.advisor_branch && (
                          <Chip size="small" label={`Sede: ${detail.run.advisor_branch}`}
                            sx={{ fontWeight: 700, fontSize: "0.7rem", bgcolor: "rgba(159,122,234,0.1)", color: "#9f7aea", border: "1px solid rgba(159,122,234,0.25)" }} />
                        )}
                      </Stack>
                    </Box>

                    <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" } }} />

                    {/* Corte y totales */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: 1, textTransform: "uppercase", fontSize: "0.65rem" }}>Corte</Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: "1rem", mt: 0.25 }}>
                        {getMonthName(detail.run.cut_month)} {detail.run.cut_year}{" "}
                        ({detail.run.fortnight === "FIRST" ? "1ra quincena" : "2da quincena"})
                      </Typography>

                      <Stack direction="row" sx={{ mt: 1.5, flexWrap: "wrap", gap: 1 }}>
                        <Box sx={{ px: 1.5, py: 1, borderRadius: 1.5, bgcolor: "rgba(99,179,237,0.08)", border: "1px solid rgba(99,179,237,0.2)", textAlign: "center", minWidth: 80 }}>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem", display: "block", textTransform: "uppercase" }}>Unidades</Typography>
                          <Typography sx={{ fontWeight: 900, color: "#63b3ed", fontSize: "1.1rem" }}>{detail.run.units_total ?? 0}</Typography>
                        </Box>

                        <Box sx={{ px: 1.5, py: 1, borderRadius: 1.5, bgcolor: "rgba(160,160,160,0.05)", border: "1px solid rgba(160,160,160,0.15)", textAlign: "center", minWidth: 140 }}>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem", display: "block", textTransform: "uppercase" }}>Comisión base</Typography>
                          <Typography sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.9rem" }}>
                            {COP.format(Number(detail.run.base_commission || 0))}
                          </Typography>
                        </Box>

                        {detail.run.manual_adjustment != null && (
                          <Box sx={{
                            px: 1.5, py: 1, borderRadius: 1.5, textAlign: "center", minWidth: 120,
                            bgcolor: detail.run.manual_adjustment_type === "ADD" ? "rgba(104,211,145,0.08)" : "rgba(252,129,129,0.08)",
                            border:  detail.run.manual_adjustment_type === "ADD" ? "1px solid rgba(104,211,145,0.2)" : "1px solid rgba(252,129,129,0.2)",
                          }}>
                            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem", display: "block", textTransform: "uppercase" }}>Ajuste</Typography>
                            <Typography sx={{
                              fontWeight: 900, fontSize: "0.9rem",
                              color: detail.run.manual_adjustment_type === "ADD" ? "#68d391" : "#fc8181",
                            }}>
                              {detail.run.manual_adjustment_type === "ADD" ? "+" : "-"}
                              {COP.format(Number(detail.run.manual_adjustment))}
                            </Typography>
                          </Box>
                        )}

                        <Box sx={{ px: 1.5, py: 1, borderRadius: 1.5, bgcolor: "rgba(246,173,85,0.08)", border: "1px solid rgba(246,173,85,0.2)", textAlign: "center", minWidth: 140 }}>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem", display: "block", textTransform: "uppercase" }}>Total comisión</Typography>
                          <Typography sx={{ fontWeight: 900, color: "#f6ad55", fontSize: "1rem" }}>
                            {COP.format(Number(detail.run.total_commission || 0))}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  </Stack>

                  {/* Notas */}
                  {detail.run.notes && (
                    <Box sx={{ mt: 2, px: 2, py: 1.25, borderRadius: 1.5, bgcolor: "action.hover", border: "1px solid", borderColor: "divider", borderLeft: "3px solid rgba(99,179,237,0.5)" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem", letterSpacing: 1, textTransform: "uppercase" }}>Notas</Typography>
                      <Typography variant="body2" sx={{ mt: 0.25 }}>{detail.run.notes}</Typography>
                    </Box>
                  )}

                  {/* Rechazo */}
                  {currentStatus === "ADVISOR_REJECTED" && detail.run.rejection_note && (
                    <Box sx={{ mt: 2, px: 2, py: 1.25, borderRadius: 1.5, bgcolor: "rgba(252,129,129,0.06)", border: "1px solid rgba(252,129,129,0.3)", borderLeft: "3px solid #fc8181" }}>
                      <Typography variant="caption" sx={{ color: "#fc8181", fontSize: "0.65rem", letterSpacing: 1, textTransform: "uppercase", fontWeight: 900 }}>Motivo de rechazo</Typography>
                      <Typography variant="body2" sx={{ mt: 0.25 }}>{detail.run.rejection_note}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* ── Panel ajuste manual — solo en CALCULATED ── */}
              {perms.runs?.asstValidate && currentStatus === "CALCULATED" && (
                <AdjustmentPanel />
              )}

              {/* ── Items de venta ── */}
              <Box sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", overflow: "hidden", bgcolor: "background.paper" }}>
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Typography sx={{ fontWeight: 900, color: "text.secondary", fontSize: "0.75rem", letterSpacing: 1, textTransform: "uppercase" }}>
                    Vehículos vendidos
                  </Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ "& th": { borderColor: "divider", bgcolor: "action.hover" } }}>
                        {["Fecha", "Factura", "Cliente", "Placa", "Vehículo", "Rate", "Notas"].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 900, color: "text.secondary", fontSize: "0.7rem", letterSpacing: 0.5, textTransform: "uppercase" }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(detail.items || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} sx={{ borderBottom: "none" }}>
                            <Typography variant="body2" sx={{ py: 2, color: "text.secondary", textAlign: "center" }}>
                              No hay items para esta comisión.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        (detail.items || []).map((it) => (
                          <TableRow key={it.id} hover sx={{ "&:last-child td": { borderBottom: "none" } }}>
                            <TableCell><Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.78rem" }}>{it.sale_date || "—"}</Typography></TableCell>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 900, color: "#63b3ed", fontSize: "0.82rem" }}>{it.invoice || "—"}</Typography></TableCell>
                            <TableCell><Typography variant="body2" sx={{ fontSize: "0.82rem" }}>{it.client_name || "—"}</Typography></TableCell>
                            <TableCell>
                              <Box sx={{ display: "inline-block", px: 1, py: 0.25, borderRadius: 1, bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
                                <Typography variant="body2" sx={{ fontWeight: 800, fontSize: "0.75rem", letterSpacing: 1 }}>{it.plate || "—"}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontSize: "0.82rem" }}>
                                {it.vehicle_model ? `${it.vehicle_model} ${it.vehicle_version || ""}`.trim() : "—"}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem" }}>{it.vehicle_code || ""}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 900, color: "#f6ad55", fontSize: "0.9rem" }}>
                                {COP.format(Number(it.rate_amount || 0))}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>{it.notes || ""}</Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {error && (
                <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: "error.lighter", border: "1px solid", borderColor: "error.main" }}>
                  <Typography variant="body2" sx={{ color: "error.main" }}>{error}</Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>

        <Divider />
        <DialogActions sx={{ px: 3, py: 2, bgcolor: "background.paper", justifyContent: "space-between" }}>
          <Button onClick={closeRunDetail} variant="outlined" sx={{ borderRadius: 2 }}>Cerrar</Button>

          {detail?.run && currentStatus === "ADVISOR_APPROVED" && perms.runs?.asstValidate && (
            <Button
              variant="contained" color="success"
              disabled={validating}
              onClick={handleValidate}
              sx={{ fontWeight: 900, borderRadius: 2 }}
            >
              {validating ? "Validando…" : "✓ Validar comisión"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════
          Dialog: Confirmar eliminar
         ═══════════════════════════════════════ */}
      <Dialog
        open={openConfirmDelete}
        onClose={cancelDeleteRun}
        maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, px: 3, py: 2 }}>¿Eliminar comisión?</DialogTitle>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Esta acción eliminará permanentemente la corrida y todos sus items.
            No se puede deshacer.
          </Typography>
          {error && (
            <Typography variant="body2" sx={{ color: "error.main", mt: 1.5 }}>{error}</Typography>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Button onClick={cancelDeleteRun} variant="outlined" disabled={isDeleting} sx={{ borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button
            onClick={confirmDeleteRun}
            variant="contained" color="error"
            disabled={isDeleting}
            sx={{ fontWeight: 900, borderRadius: 2 }}
          >
            {isDeleting ? "Eliminando…" : "Sí, eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════
          Dialog: Calcular comisiones masivas
         ═══════════════════════════════════════ */}
      <BulkCalculateDialog />

      <DownloadPdfDialog
        open={openDownloadDialog}
        onClose={() => setOpenDownloadDialog(false)}
        brandCode={currentBrandCode}
      />

    </Box>
  );
}