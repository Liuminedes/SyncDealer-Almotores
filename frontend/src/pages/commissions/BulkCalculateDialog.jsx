// frontend/src/pages/commissions/BulkCalculateDialog.jsx
// Dialog de cálculo masivo de comisiones con progreso visual en tiempo real
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Stack, Box, Button, IconButton, Divider,
  LinearProgress, Chip, Paper, Tooltip, CircularProgress,
} from "@mui/material";

import CloseRoundedIcon           from "@mui/icons-material/CloseRounded";
import CalculateRoundedIcon       from "@mui/icons-material/CalculateRounded";
import CheckCircleRoundedIcon     from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon           from "@mui/icons-material/ErrorRounded";
import PlayArrowRoundedIcon       from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon            from "@mui/icons-material/StopRounded";

import { useCommissionRunsStore } from "../../app/store/commissionRuns.store";
import { MONTHS }                 from "./Runs";

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency", currency: "COP", maximumFractionDigits: 0,
});

export default function BulkCalculateDialog() {
  const {
    openBulkCalc, bulkStep,
    bulkAdvisors, bulkTotal, bulkDone, bulkSucceeded, bulkFailed,
    bulkCurrentName, bulkResults,
    filters,
    closeBulkCalc, startBulkCalculate,
  } = useCommissionRunsStore();

  const pct       = bulkTotal > 0 ? Math.round((bulkDone / bulkTotal) * 100) : 0;
  const isRunning = bulkStep === "running";
  const isDone    = bulkStep === "done";
  const monthLabel = MONTHS.find((m) => m.value === Number(filters.cut_month))?.label || filters.cut_month;

  return (
    <Dialog open={openBulkCalc} onClose={isRunning ? undefined : closeBulkCalc}
      fullWidth maxWidth="sm" disableEscapeKeyDown={isRunning}
      PaperProps={{ sx: { borderRadius: 2, overflow: "hidden" } }}>

      {/* Barra de color superior */}
      <Box sx={{
        height: 3,
        background: isDone
          ? bulkFailed === 0
            ? "linear-gradient(90deg, #68d391, #48bb78)"
            : "linear-gradient(90deg, #f6ad55, #ed8936)"
          : "linear-gradient(90deg, #63b3ed, #9f7aea, #68d391)",
        backgroundSize: isRunning ? "200% 100%" : "100% 100%",
        animation: isRunning ? "shimmer 2s infinite linear" : "none",
        "@keyframes shimmer": {
          "0%":   { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      }} />

      <DialogTitle sx={{ px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CalculateRoundedIcon sx={{ color: "primary.main" }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
              Calcular comisiones masivas
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {monthLabel} {filters.cut_year} — {filters.fortnight === "FIRST" ? "1ra quincena" : "2da quincena"}
            </Typography>
          </Box>
        </Stack>
        {!isRunning && (
          <IconButton onClick={closeBulkCalc} size="small"><CloseRoundedIcon /></IconButton>
        )}
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
        <Stack spacing={2.5}>

          {/* ── Confirmación previa ── */}
          {bulkStep === "confirming" && (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: "background.paper" }}>
                <Stack spacing={1}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Se calcularán las comisiones para <strong>{bulkTotal} asesores</strong> activos
                    de la marca seleccionada.
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.75} sx={{ mt: 0.5 }}>
                    <Chip size="small" label={`${monthLabel} ${filters.cut_year}`} sx={{ fontWeight: 700 }} />
                    <Chip size="small"
                      label={filters.fortnight === "FIRST" ? "Primera quincena" : "Segunda quincena"}
                      sx={{ fontWeight: 700 }} />
                    <Chip size="small" label={`${bulkTotal} asesores`}
                      sx={{ fontWeight: 700, bgcolor: "rgba(99,179,237,0.1)", color: "#63b3ed" }} />
                  </Stack>
                </Stack>
              </Paper>

              <Paper variant="outlined"
                sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "rgba(246,173,85,0.06)",
                  borderColor: "rgba(246,173,85,0.3)" }}>
                <Typography variant="caption" sx={{ color: "#f6ad55" }}>
                  ⚠️ Si ya existe una comisión calculada para algún asesor en este período,
                  se <strong>recalculará</strong> y el ajuste manual previo se eliminará.
                </Typography>
              </Paper>

              {/* Lista de asesores */}
              <Box sx={{ maxHeight: 200, overflowY: "auto", borderRadius: 1.5,
                border: "0.5px solid", borderColor: "divider" }}>
                {bulkAdvisors.map((a, i) => (
                  <Stack key={a.id} direction="row" alignItems="center" spacing={1.5}
                    sx={{ px: 2, py: 0.75, borderBottom: i < bulkAdvisors.length - 1 ? "0.5px solid" : "none",
                      borderColor: "divider" }}>
                    <Box sx={{
                      width: 28, height: 28, borderRadius: "50%", bgcolor: "primary.main",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 900, fontSize: "0.65rem", color: "primary.contrastText", flexShrink: 0,
                    }}>
                      {a.full_name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{a.full_name}</Typography>
                  </Stack>
                ))}
              </Box>
            </Stack>
          )}

          {/* ── Progreso en tiempo real ── */}
          {(isRunning || isDone) && (
            <Stack spacing={2}>

              {/* Contador principal */}
              <Box sx={{ textAlign: "center", py: 1 }}>
                {isRunning ? (
                  <>
                    <Typography sx={{ fontSize: "3rem", fontWeight: 900, lineHeight: 1,
                      background: "linear-gradient(135deg, #63b3ed, #9f7aea)",
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {bulkDone}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                      de <strong>{bulkTotal}</strong> asesores procesados
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography sx={{ fontSize: "3rem", fontWeight: 900, lineHeight: 1,
                      color: bulkFailed === 0 ? "#68d391" : "#f6ad55" }}>
                      {bulkSucceeded}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                      comisiones generadas correctamente
                    </Typography>
                  </>
                )}
              </Box>

              {/* Barra de progreso */}
              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    Progreso
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 900,
                    color: isDone ? (bulkFailed === 0 ? "#68d391" : "#f6ad55") : "#63b3ed" }}>
                    {pct}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate" value={pct}
                  sx={{
                    height: 10, borderRadius: 5,
                    bgcolor: "action.hover",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 5,
                      background: isDone
                        ? bulkFailed === 0
                          ? "linear-gradient(90deg, #68d391, #48bb78)"
                          : "linear-gradient(90deg, #f6ad55, #ed8936)"
                        : "linear-gradient(90deg, #63b3ed, #9f7aea)",
                    },
                  }}
                />
              </Box>

              {/* Asesor actual */}
              {isRunning && bulkCurrentName && (
                <Stack direction="row" spacing={1.5} alignItems="center"
                  sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "rgba(99,179,237,0.06)",
                    border: "0.5px solid rgba(99,179,237,0.2)" }}>
                  <CircularProgress size={16} sx={{ color: "#63b3ed", flexShrink: 0 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                      Calculando ahora:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#63b3ed" }}>
                      {bulkCurrentName}
                    </Typography>
                  </Box>
                </Stack>
              )}

              {/* Stats rápidas */}
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1 }}>
                <Box sx={{ p: 1.25, borderRadius: 1.5, textAlign: "center",
                  bgcolor: "rgba(104,211,145,0.08)", border: "0.5px solid rgba(104,211,145,0.3)" }}>
                  <Typography sx={{ fontSize: "1.4rem", fontWeight: 900, color: "#68d391", lineHeight: 1 }}>
                    {bulkSucceeded}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>Generadas</Typography>
                </Box>
                <Box sx={{ p: 1.25, borderRadius: 1.5, textAlign: "center",
                  bgcolor: "rgba(252,129,129,0.08)", border: "0.5px solid rgba(252,129,129,0.3)" }}>
                  <Typography sx={{ fontSize: "1.4rem", fontWeight: 900, color: "#fc8181", lineHeight: 1 }}>
                    {bulkFailed}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>Con error</Typography>
                </Box>
                <Box sx={{ p: 1.25, borderRadius: 1.5, textAlign: "center",
                  bgcolor: "rgba(160,160,160,0.08)", border: "0.5px solid rgba(160,160,160,0.2)" }}>
                  <Typography sx={{ fontSize: "1.4rem", fontWeight: 900, color: "text.secondary", lineHeight: 1 }}>
                    {bulkTotal - bulkDone}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {isRunning ? "Pendientes" : "Omitidas"}
                  </Typography>
                </Box>
              </Box>

              {/* Resultados detallados — solo al terminar */}
              {isDone && bulkResults.length > 0 && (
                <Box sx={{ maxHeight: 200, overflowY: "auto", borderRadius: 1.5,
                  border: "0.5px solid", borderColor: "divider" }}>
                  {bulkResults.map((r, i) => (
                    <Stack key={r.advisor_id} direction="row" alignItems="center" spacing={1.5}
                      sx={{ px: 2, py: 0.75,
                        borderBottom: i < bulkResults.length - 1 ? "0.5px solid" : "none",
                        borderColor: "divider",
                        bgcolor: r.status === "error" ? "rgba(252,129,129,0.04)" : "transparent",
                      }}>
                      {r.status === "success"
                        ? <CheckCircleRoundedIcon sx={{ fontSize: 16, color: "#68d391", flexShrink: 0 }} />
                        : <ErrorRoundedIcon       sx={{ fontSize: 16, color: "#fc8181", flexShrink: 0 }} />
                      }
                      <Typography variant="body2" sx={{ flex: 1, fontSize: "0.8rem" }}>
                        {r.advisor_name}
                      </Typography>
                      {r.status === "error" && (
                        <Tooltip title={r.error}>
                          <Typography variant="caption" sx={{ color: "#fc8181", maxWidth: 160,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "help" }}>
                            {r.error}
                          </Typography>
                        </Tooltip>
                      )}
                      {r.status === "success" && (
                        <Typography variant="caption" sx={{ color: "#68d391" }}>
                          ✓ calculada
                        </Typography>
                      )}
                    </Stack>
                  ))}
                </Box>
              )}
            </Stack>
          )}

        </Stack>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between", bgcolor: "background.paper" }}>
        {bulkStep === "confirming" && (
          <>
            <Button onClick={closeBulkCalc} variant="outlined" sx={{ borderRadius: 2 }}>
              Cancelar
            </Button>
            <Button onClick={startBulkCalculate} variant="contained"
              startIcon={<PlayArrowRoundedIcon />}
              disabled={!bulkAdvisors.length}
              sx={{ fontWeight: 900, borderRadius: 2,
                background: "linear-gradient(135deg, #63b3ed, #9f7aea)",
                "&:hover": { background: "linear-gradient(135deg, #4299e1, #805ad5)" } }}>
              Iniciar cálculo ({bulkTotal} asesores)
            </Button>
          </>
        )}

        {isRunning && (
          <>
            <Typography variant="caption" sx={{ color: "text.secondary", alignSelf: "center" }}>
              Procesando… no cierres esta ventana
            </Typography>
            <Button onClick={() => useCommissionRunsStore.setState({ bulkAborted: true })}
              variant="outlined" color="error" startIcon={<StopRoundedIcon />}
              sx={{ borderRadius: 2, fontWeight: 700 }}>
              Detener
            </Button>
          </>
        )}

        {isDone && (
          <>
            <Typography variant="caption" sx={{ color: "text.secondary", alignSelf: "center" }}>
              {bulkFailed === 0
                ? "Todas las comisiones fueron generadas correctamente"
                : `${bulkFailed} comisión(es) con error — revisa la lista`}
            </Typography>
            <Button onClick={closeBulkCalc} variant="contained"
              sx={{ fontWeight: 900, borderRadius: 2 }}>
              Listo
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
