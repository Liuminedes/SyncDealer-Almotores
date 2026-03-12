// frontend/src/pages/advisor/MyCommission.jsx
// Estética 1:1 con el panel de detalle de Runs.jsx (admin)
import { useEffect, useState, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, Chip, Stack,
  CircularProgress, Divider, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Collapse, IconButton, Tooltip,
  Select, MenuItem, FormControl, InputLabel,
} from "@mui/material";

import CheckCircleRoundedIcon   from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon        from "@mui/icons-material/CancelRounded";
import ExpandMoreRoundedIcon    from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon    from "@mui/icons-material/ExpandLessRounded";
import PaymentsRoundedIcon      from "@mui/icons-material/PaymentsRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import ReceiptLongRoundedIcon   from "@mui/icons-material/ReceiptLongRounded";
import InfoOutlinedIcon         from "@mui/icons-material/InfoOutlined";
import RefreshRoundedIcon       from "@mui/icons-material/RefreshRounded";
import WarningAmberRoundedIcon  from "@mui/icons-material/WarningAmberRounded";
import CloseRoundedIcon         from "@mui/icons-material/CloseRounded";

import { useAuthStore } from "../../app/store/auth.store";
import { http }         from "../../api/http";

// ── Helpers ───────────────────────────────────────────────────────────────
const fmtCOP = (n) =>
  `$${Number(n || 0).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtMini = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};
const fmtN = (n) => Number(n || 0).toLocaleString("es-CO");

const MONTHS_LONG  = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const getMonthName = (m) => MONTHS_LONG[(Number(m) || 1) - 1] ?? "—";
const now = new Date();

const STATUS_META = {
  DRAFT:            { label: "Borrador",       chipBg: "rgba(255,255,255,0.06)", chipColor: "#aaa",    desc: "La corrida fue creada pero aún no calculada." },
  CALCULATED:       { label: "Por revisar",    chipBg: "rgba(246,173,85,0.15)",  chipColor: "#f6ad55", desc: "Tu comisión está lista. Revísala y aprueba o rechaza." },
  ADVISOR_APPROVED: { label: "Aprobada",       chipBg: "rgba(99,179,237,0.15)",  chipColor: "#63b3ed", desc: "Aprobaste tu comisión. Pendiente de validación." },
  ADVISOR_REJECTED: { label: "Rechazada",      chipBg: "rgba(252,129,129,0.15)", chipColor: "#fc8181", desc: "Rechazaste esta comisión. El equipo la revisará." },
  ASST_VALIDATED:   { label: "Validada",       chipBg: "rgba(104,211,145,0.15)", chipColor: "#68d391", desc: "Validada por el equipo. En proceso." },
  SENT_TO_HR:       { label: "Enviada a RRHH", chipBg: "rgba(104,211,145,0.15)", chipColor: "#68d391", desc: "Comisión enviada a Talento Humano para pago." },
};

function StatusBadge({ status }) {
  const s    = String(status || "").toUpperCase();
  const meta = STATUS_META[s] ?? { label: s, chipBg: "rgba(255,255,255,0.06)", chipColor: "#aaa" };
  return (
    <Chip size="small" label={meta.label}
      sx={{
        fontWeight: 900, fontSize: "0.66rem", letterSpacing: 0.5,
        bgcolor: meta.chipBg, color: meta.chipColor,
        border: `1px solid ${meta.chipColor}44`,
      }}
    />
  );
}

function extractBonuses(notes) {
  if (!notes) return 0;
  let total = 0;
  for (const m of notes.matchAll(/\+\$([0-9.]+)/g)) total += parseFloat(m[1].replace(/\./g, "")) || 0;
  return total;
}

// ══════════════════════════════════════════════════════════════════════════
// Panel de detalle — idéntico en estructura al de Runs.jsx (admin)
// ══════════════════════════════════════════════════════════════════════════
function RunDetail({ runId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    http.get(`/commission-runs/my/${runId}`)
      .then((r) => { if (!cancelled) setData(r?.data?.data ?? r?.data ?? null); })
      .catch((e) => { if (!cancelled) setError(e?.response?.data?.message || "Error al cargar el detalle"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [runId]);

  if (loading) return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 3, px: 3 }}>
      <CircularProgress size={18} sx={{ color: "#63b3ed" }} />
      <Typography variant="body2" sx={{ color: "text.secondary" }}>Cargando detalle…</Typography>
    </Stack>
  );
  if (error) return (
    <Box sx={{ m: 2, p: 2, borderRadius: 1.5, border: "1px solid", borderColor: "error.main", bgcolor: "rgba(252,129,129,0.06)" }}>
      <Typography variant="body2" sx={{ color: "error.main" }}>{error}</Typography>
    </Box>
  );
  if (!data) return null;

  const { run, items = [] } = data;
  const bonusTotal = extractBonuses(run?.notes);

  return (
    // Mismo estilo que DialogContent de Runs.jsx
    <Box sx={{ bgcolor: "background.default" }}>
      <Stack spacing={2.5} sx={{ p: 2.5 }}>

        {/* ── Bloque resumen — igual a Runs.jsx ── */}
        <Box sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", overflow: "hidden", bgcolor: "background.paper" }}>
          <Box sx={{ height: 4, background: "linear-gradient(90deg, #63b3ed, #9f7aea, #68d391)" }} />
          <Box sx={{ p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 2, color: "text.secondary", fontSize: "0.75rem", letterSpacing: 1, textTransform: "uppercase" }}>
              Resumen
            </Typography>

            <Stack direction={{ xs: "column", md: "row" }} spacing={3} justifyContent="space-between">
              {/* Columna izquierda: datos del corte */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: 1, textTransform: "uppercase", fontSize: "0.65rem" }}>
                  Corte
                </Typography>
                <Typography sx={{ fontWeight: 900, color: "text.primary", fontSize: "1rem", mt: 0.25 }}>
                  {getMonthName(run?.cut_month)} {run?.cut_year}{" "}
                  {run?.fortnight === "FIRST" ? "(1ra quincena)" : "(2da quincena)"}
                </Typography>
                <Typography variant="body2" sx={{ color: "#63b3ed", fontWeight: 500, mt: 0.25 }}>
                  {run?.brand_name} ({run?.brand_code})
                </Typography>

                <Stack direction="row" sx={{ mt: 1.5, flexWrap: "wrap", gap: 1 }}>
                  <Box sx={{ px: 1.5, py: 1, borderRadius: 1.5, bgcolor: "rgba(104,211,145,0.08)", border: "1px solid rgba(104,211,145,0.2)", textAlign: "center", minWidth: 80 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem", letterSpacing: 0.5, textTransform: "uppercase", display: "block" }}>Estado</Typography>
                    <StatusBadge status={run?.status} />
                  </Box>
                  <Box sx={{ px: 1.5, py: 1, borderRadius: 1.5, bgcolor: "rgba(99,179,237,0.08)", border: "1px solid rgba(99,179,237,0.2)", textAlign: "center", minWidth: 80 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem", letterSpacing: 0.5, textTransform: "uppercase", display: "block" }}>Unidades</Typography>
                    <Typography sx={{ fontWeight: 900, color: "#63b3ed", fontSize: "1.1rem" }}>{run?.units_total ?? 0}</Typography>
                  </Box>
                  <Box sx={{ px: 1.5, py: 1, borderRadius: 1.5, bgcolor: "rgba(246,173,85,0.08)", border: "1px solid rgba(246,173,85,0.2)", textAlign: "center", minWidth: 140 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem", letterSpacing: 0.5, textTransform: "uppercase", display: "block" }}>Total comisión</Typography>
                    <Typography sx={{ fontWeight: 900, color: "#f6ad55", fontSize: "1rem" }}>
                      {fmtCOP(run?.total_commission)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" } }} />

              {/* Columna derecha: desglose financiero */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: 1, textTransform: "uppercase", fontSize: "0.65rem" }}>
                  Desglose comisión
                </Typography>
                <Stack spacing={0.75} mt={1}>
                  {[
                    { label: "Comisión base",   value: (run?.total_commission ?? 0) - bonusTotal, color: "#63b3ed" },
                    { label: "Bonos aplicados", value: bonusTotal,               color: "#68d391" },
                    { label: "Total",           value: run?.total_commission,    color: "#f6ad55", highlight: true },
                  ].map((item) => (
                    <Stack key={item.label} direction="row" justifyContent="space-between" alignItems="center"
                      sx={item.highlight ? { mt: 0.5, pt: 0.75, borderTop: "1px solid", borderColor: "divider" } : {}}>
                      <Typography variant="body2" sx={{ color: item.highlight ? "text.primary" : "text.secondary", fontWeight: item.highlight ? 900 : 500, fontSize: "0.82rem" }}>
                        {item.label}
                      </Typography>
                      <Typography sx={{ fontWeight: 900, color: item.color, fontSize: item.highlight ? "1rem" : "0.82rem" }}>
                        {fmtCOP(item.value)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Stack>

            {run?.notes && (
              <Box sx={{ mt: 2, px: 2, py: 1.25, borderRadius: 1.5, bgcolor: "action.hover", border: "1px solid", borderColor: "divider", borderLeft: "3px solid rgba(99,179,237,0.5)" }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem", letterSpacing: 1, textTransform: "uppercase" }}>Notas del cálculo</Typography>
                <Typography variant="body2" sx={{ color: "text.primary", mt: 0.25 }}>{run.notes}</Typography>
              </Box>
            )}

            {run?.rejection_note && (
              <Box sx={{ mt: 2, px: 2, py: 1.25, borderRadius: 1.5, bgcolor: "rgba(252,129,129,0.08)", border: "1px solid rgba(252,129,129,0.3)", borderLeft: "3px solid #fc8181" }}>
                <Typography variant="caption" sx={{ color: "#fc8181", fontSize: "0.65rem", letterSpacing: 1, textTransform: "uppercase" }}>Motivo del rechazo</Typography>
                <Typography variant="body2" sx={{ color: "text.primary", mt: 0.25 }}>{run.rejection_note}</Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* ── Tabla items — igual a Runs.jsx ── */}
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
                  {["Fecha","Factura","Cliente","Placa","Vehículo","Rate","Notas"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 900, color: "text.secondary", fontSize: "0.7rem", letterSpacing: 0.5, textTransform: "uppercase" }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={7} sx={{ borderBottom: "none" }}>
                    <Typography variant="body2" sx={{ py: 2, color: "text.secondary", textAlign: "center" }}>
                      No hay items para esta comisión.
                    </Typography>
                  </TableCell></TableRow>
                ) : items.map((it) => (
                  <TableRow key={it.id} hover sx={{ "& td": { borderColor: "divider" }, "&:last-child td": { borderBottom: "none" } }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.78rem" }}>{it.sale_date?.slice(0, 10) || "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 900, color: "#63b3ed", fontSize: "0.82rem" }}>{it.invoice || "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: "0.82rem" }}>{it.client_name || "—"}</Typography>
                    </TableCell>
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
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 900, color: "#f6ad55", fontSize: "0.9rem" }}>
                        {fmtCOP(it.rate_amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>{it.notes || ""}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

      </Stack>
    </Box>
  );
}

// ── Tarjeta resumen de una corrida ────────────────────────────────────────
function RunCard({ run, onApprove, onReject, onExpand, expanded }) {
  const status = String(run.status || "").toUpperCase();
  const meta   = STATUS_META[status] ?? { label: status, chipColor: "#aaa", desc: "" };
  const canAct = status === "CALCULATED";

  return (
    <Box sx={{
      borderRadius: 2, border: "1px solid",
      borderColor: canAct ? "#f6ad5566" : "divider",
      overflow: "hidden", bgcolor: "background.paper",
      boxShadow: canAct ? "0 0 0 1px #f6ad5522" : "none",
      mb: 2,
    }}>
      {/* Barra de acento superior */}
      <Box sx={{ height: 3, bgcolor: meta.chipColor, opacity: 0.75 }} />

      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>

          {/* Izquierda */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap">
              <Typography sx={{ fontWeight: 900, fontSize: "1rem" }}>{run.brand_name}</Typography>
              <Chip
                label={run.fortnight === "FIRST" ? "1ra quincena" : "2da quincena"}
                size="small" variant="outlined"
                sx={{ fontWeight: 700, fontSize: "0.7rem" }}
              />
              <StatusBadge status={status} />
            </Stack>

            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {getMonthName(run.cut_month)} {run.cut_year}
              {run.notes && (
                <Tooltip title={run.notes} placement="top">
                  <InfoOutlinedIcon sx={{ fontSize: 13, ml: 0.5, verticalAlign: "middle", color: "text.disabled" }} />
                </Tooltip>
              )}
            </Typography>

            <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 0.25 }}>
              {meta.desc}
            </Typography>
          </Box>

          {/* Derecha — monto y acciones */}
          <Stack alignItems="flex-end" spacing={1}>
            <Typography sx={{ fontWeight: 900, fontSize: "1.5rem", color: "#f6ad55", lineHeight: 1 }}>
              {fmtCOP(run.total_commission)}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {fmtN(run.units_total)} unidades
            </Typography>

            {canAct && (
              <Stack direction="row" spacing={1} mt={0.5}>
                <Button variant="contained" size="small"
                  startIcon={<CheckCircleRoundedIcon />}
                  onClick={() => onApprove(run)}
                  sx={{ fontWeight: 900, bgcolor: "#68d391", color: "#000", "&:hover": { bgcolor: "#4fc870" } }}
                >
                  Aprobar
                </Button>
                <Button variant="outlined" size="small"
                  startIcon={<CancelRoundedIcon />}
                  onClick={() => onReject(run)}
                  sx={{ fontWeight: 900, borderColor: "#fc8181", color: "#fc8181", "&:hover": { bgcolor: "rgba(252,129,129,0.08)" } }}
                >
                  Rechazar
                </Button>
              </Stack>
            )}
          </Stack>
        </Stack>

        {/* Toggle detalle */}
        <Stack direction="row" justifyContent="center" mt={1}>
          <IconButton size="small" onClick={() => onExpand(run.id)}
            sx={{ color: "text.secondary", "&:hover": { color: "#63b3ed" } }}>
            {expanded ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
          </IconButton>
        </Stack>
      </Box>

      {/* Detalle expandible */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Divider />
        <RunDetail runId={run.id} />
      </Collapse>
    </Box>
  );
}

// ── Diálogo de aprobación ─────────────────────────────────────────────────
function ApproveDialog({ run, open, onClose, onConfirm, loading }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 2, overflow: "hidden" } }}>
      <DialogTitle sx={{
        px: 3, py: 2, fontWeight: 900,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper",
      }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CheckCircleRoundedIcon sx={{ color: "#68d391" }} />
          <Typography fontWeight={900}>Aprobar comisión</Typography>
        </Stack>
        <IconButton size="small" onClick={onClose}><CloseRoundedIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
        {run && (
          <Stack spacing={2}>
            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: "rgba(104,211,145,0.08)", border: "1px solid rgba(104,211,145,0.25)" }}>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.5 }}>
                <b>{run.brand_name}</b> · {getMonthName(run.cut_month)} {run.cut_year}
                {" "}· {run.fortnight === "FIRST" ? "1ra" : "2da"} quincena
              </Typography>
              <Typography sx={{ fontWeight: 900, color: "#f6ad55", fontSize: "1.5rem" }}>
                {fmtCOP(run.total_commission)}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>{fmtN(run.units_total)} unidades</Typography>
            </Box>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Al aprobar, el equipo procederá con la validación final antes del envío a Talento Humano.
            </Typography>
          </Stack>
        )}
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 2, bgcolor: "background.paper", justifyContent: "space-between" }}>
        <Button onClick={onClose} variant="outlined" disabled={loading} sx={{ borderRadius: 2 }}>Cancelar</Button>
        <Button variant="contained" onClick={() => onConfirm(run)} disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <CheckCircleRoundedIcon />}
          sx={{ fontWeight: 900, borderRadius: 2, bgcolor: "#68d391", color: "#000", "&:hover": { bgcolor: "#4fc870" } }}>
          {loading ? "Aprobando…" : "Aprobar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Diálogo de rechazo ────────────────────────────────────────────────────
function RejectDialog({ run, open, onClose, onConfirm, loading }) {
  const [note, setNote] = useState("");
  const valid = note.trim().length >= 5;

  const handleClose   = () => { setNote(""); onClose(); };
  const handleConfirm = () => { if (valid) onConfirm(run, note.trim()); };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 2, overflow: "hidden" } }}>
      <DialogTitle sx={{
        px: 3, py: 2, fontWeight: 900,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper",
      }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <WarningAmberRoundedIcon sx={{ color: "#fc8181" }} />
          <Typography fontWeight={900}>Rechazar comisión</Typography>
        </Stack>
        <IconButton size="small" onClick={handleClose}><CloseRoundedIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
        <Stack spacing={2}>
          {run && (
            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: "rgba(252,129,129,0.08)", border: "1px solid rgba(252,129,129,0.25)" }}>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.5 }}>
                <b>{run.brand_name}</b> · {getMonthName(run.cut_month)} {run.cut_year}
              </Typography>
              <Typography sx={{ fontWeight: 900, color: "#f6ad55", fontSize: "1.3rem" }}>
                {fmtCOP(run.total_commission)}
              </Typography>
            </Box>
          )}
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Indica el motivo. El equipo revisará tu solicitud y corregirá los valores.
          </Typography>
          <TextField
            label="Motivo del rechazo" multiline rows={3} fullWidth autoFocus
            value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: Los valores no coinciden con las ventas registradas..."
            helperText={`${note.length} caracteres · mínimo 5`}
            error={note.length > 0 && !valid}
          />
        </Stack>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 2, bgcolor: "background.paper", justifyContent: "space-between" }}>
        <Button onClick={handleClose} variant="outlined" disabled={loading} sx={{ borderRadius: 2 }}>Cancelar</Button>
        <Button variant="contained" color="error" onClick={handleConfirm}
          disabled={!valid || loading}
          startIcon={loading ? <CircularProgress size={16} /> : <CancelRoundedIcon />}
          sx={{ fontWeight: 900, borderRadius: 2 }}>
          {loading ? "Rechazando…" : "Confirmar rechazo"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── KPI Card mini ─────────────────────────────────────────────────────────
function KpiMini({ title, value, icon, accent }) {
  return (
    <Card sx={{ borderRadius: 2, flex: 1, minWidth: 140, position: "relative", overflow: "hidden" }}>
      <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, bgcolor: accent }} />
      <CardContent sx={{ pl: 2.5, pb: "16px !important" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: 1, textTransform: "uppercase", fontSize: "0.62rem" }}>
              {title}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.25, lineHeight: 1.1 }}>{value}</Typography>
          </Box>
          <Box sx={{
            width: 36, height: 36, borderRadius: 1.5, display: "grid", placeItems: "center",
            bgcolor: `${accent}18`, border: `1px solid ${accent}30`, color: accent, flexShrink: 0, ml: 1,
          }}>
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════
export default function MyCommission() {
  const { user } = useAuthStore();

  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [runs,    setRuns]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [approveRun, setApproveRun] = useState(null);
  const [rejectRun,  setRejectRun]  = useState(null);
  const [actLoading, setActLoading] = useState(false);
  const [actError,   setActError]   = useState(null);

  const fetchRuns = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await http.get("/commission-runs/my", { params: { year, month } });
      setRuns(res?.data?.data?.items ?? res?.data?.items ?? []);
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudieron cargar las comisiones");
    } finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const handleApprove = async (run) => {
    setActLoading(true); setActError(null);
    try {
      await http.post(`/commission-runs/${run.id}/advisor-approve`);
      setApproveRun(null);
      await fetchRuns();
    } catch (e) {
      setActError(e?.response?.data?.message || "Error al aprobar");
    } finally { setActLoading(false); }
  };

  const handleReject = async (run, note) => {
    setActLoading(true); setActError(null);
    try {
      await http.post(`/commission-runs/${run.id}/advisor-reject`, { note });
      setRejectRun(null);
      await fetchRuns();
    } catch (e) {
      setActError(e?.response?.data?.message || "Error al rechazar");
    } finally { setActLoading(false); }
  };

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  const totalComm    = runs.reduce((s, r) => s + (Number(r.total_commission) || 0), 0);
  const totalUnits   = runs.reduce((s, r) => s + (Number(r.units_total) || 0), 0);
  const pendingCount = runs.filter((r) => r.status === "CALCULATED").length;
  const years        = [now.getFullYear() - 1, now.getFullYear()];

  const sorted = [...runs].sort((a, b) => {
    const order = { CALCULATED: 0, ADVISOR_REJECTED: 1, ADVISOR_APPROVED: 2, ASST_VALIDATED: 3, SENT_TO_HR: 4, DRAFT: 5 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  });

  return (
    <Box sx={{ width: "100%" }}>
      <Stack spacing={2}>

        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>Mi Comisión</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
              {user?.full_name} · Revisa, aprueba o rechaza tu comisión
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 90 }}>
              <InputLabel>Año</InputLabel>
              <Select value={year} label="Año" onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Mes</InputLabel>
              <Select value={month} label="Mes" onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS_SHORT.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
              </Select>
            </FormControl>
            <Tooltip title="Actualizar">
              <IconButton onClick={fetchRuns} disabled={loading} size="small">
                <RefreshRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Error de acción */}
        {actError && (
          <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "rgba(252,129,129,0.08)", border: "1px solid", borderColor: "error.main" }}>
            <Typography variant="body2" sx={{ color: "error.main" }}>{actError}</Typography>
          </Box>
        )}

        {/* Alerta de pendientes */}
        {!loading && pendingCount > 0 && (
          <Box sx={{
            p: 1.5, borderRadius: 1.5,
            bgcolor: "rgba(246,173,85,0.08)", border: "1px solid rgba(246,173,85,0.3)",
            borderLeft: "3px solid #f6ad55", display: "flex", alignItems: "center", gap: 1,
          }}>
            <WarningAmberRoundedIcon sx={{ color: "#f6ad55", fontSize: 18, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ color: "#f6ad55", fontWeight: 700 }}>
              Tienes {pendingCount} comisión{pendingCount > 1 ? "es" : ""} pendiente{pendingCount > 1 ? "s" : ""} de revisión.
            </Typography>
          </Box>
        )}

        {/* KPIs */}
        {!loading && runs.length > 0 && (
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <KpiMini title="Total comisión"   value={fmtCOP(totalComm)}   icon={<PaymentsRoundedIcon fontSize="small" />}     accent="#f6ad55" />
            <KpiMini title="Unidades totales" value={fmtN(totalUnits)}     icon={<DirectionsCarRoundedIcon fontSize="small" />} accent="#63b3ed" />
            <KpiMini title="Corridas"         value={fmtN(runs.length)}    icon={<ReceiptLongRoundedIcon fontSize="small" />}   accent="#68d391" />
          </Stack>
        )}

        {/* Contenido */}
        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 300 }}>
            <CircularProgress sx={{ color: "#63b3ed" }} />
          </Stack>
        ) : error ? (
          <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: "rgba(252,129,129,0.08)", border: "1px solid", borderColor: "error.main" }}>
            <Typography variant="body2" sx={{ color: "error.main" }}>{error}</Typography>
          </Box>
        ) : runs.length === 0 ? (
          <Card sx={{ borderRadius: 2 }}>
            <CardContent sx={{ textAlign: "center", py: 6 }}>
              <ReceiptLongRoundedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
              <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 700 }}>
                Sin comisiones para {getMonthName(month)} {year}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.disabled", mt: 0.5 }}>
                Las comisiones aparecen aquí cuando el equipo las calcula.
              </Typography>
            </CardContent>
          </Card>
        ) : sorted.map((run) => (
          <RunCard
            key={run.id} run={run}
            expanded={expandedId === run.id}
            onExpand={toggleExpand}
            onApprove={(r) => { setActError(null); setApproveRun(r); }}
            onReject={(r)  => { setActError(null); setRejectRun(r);  }}
          />
        ))}

      </Stack>

      <ApproveDialog run={approveRun} open={!!approveRun} onClose={() => setApproveRun(null)} onConfirm={handleApprove} loading={actLoading} />
      <RejectDialog  run={rejectRun}  open={!!rejectRun}  onClose={() => setRejectRun(null)}  onConfirm={handleReject}  loading={actLoading} />
    </Box>
  );
}