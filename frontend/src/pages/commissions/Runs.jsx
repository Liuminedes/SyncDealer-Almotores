import { useEffect, useMemo } from "react";
import {
  Box,
  Card,
  Typography,
  Stack,
  TextField,
  Button,
  IconButton,
  Tooltip,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Chip,
  CircularProgress,
  Paper,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useCommissionRunsStore } from "../../app/store/commissionRuns.store";

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
  MONTHS.find((m) => m.value === Number(month))?.label ?? "Mes inválido";

const statusChip = (status) => {
  const s = String(status || "—").toUpperCase();
  const map = {
    DRAFT:      { label: "Borrador",  variant: "outlined" },
    CALCULATED: { label: "Calculada", variant: "filled"   },
    APPROVED:   { label: "Aprobada",  variant: "filled"   },
    PAID:       { label: "Pagada",    variant: "filled"   },
  };
  const conf = map[s] || { label: s, variant: "outlined" };
  return <Chip size="small" label={conf.label} variant={conf.variant} sx={{ fontWeight: 800 }} />;
};

export default function Runs() {
  const {
    items,
    total,
    filters,
    brands,
    advisors,
    isLoading,
    isCalculating,
    isLoadingDetail,
    isDeleting,
    error,

    openCalc,
    calcForm,
    openDetail,
    detail,
    openConfirmDelete,

    setFilters,
    resetFilters,
    hydrateMeta,
    fetchRuns,

    openCalculate,
    closeCalculate,
    setCalcForm,
    submitCalculate,

    openRunDetail,
    closeRunDetail,

    promptDeleteRun,
    cancelDeleteRun,
    confirmDeleteRun,
  } = useCommissionRunsStore();

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

  const brandOptions  = useMemo(() => brands   || [], [brands]);
  const advisorOptions = useMemo(() => advisors || [], [advisors]);

  const handleFilterBrandChange = async (value) => {
    setFilters({ brand_id: value, page: 1 });
    await fetchRuns();
  };

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
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField
              label="Marca"
              value={filters.brand_id}
              onChange={(e) => handleFilterBrandChange(e.target.value)}
              size="small"
              select
              sx={{ minWidth: 200 }}
            >
              {brandOptions.map((b) => (
                <MenuItem key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Año"
              type="number"
              value={filters.cut_year}
              onChange={(e) => setFilters({ cut_year: Number(e.target.value) })}
              size="small"
              sx={{ width: 120 }}
            />

            <TextField
              label="Mes"
              value={filters.cut_month}
              onChange={(e) => setFilters({ cut_month: Number(e.target.value) })}
              size="small"
              select
              sx={{ minWidth: 160 }}
            >
              {MONTHS.map((m) => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="Asesor (opcional)"
              value={String(filters.advisor_id || "")}
              onChange={(e) => setFilters({ advisor_id: e.target.value })}
              size="small"
              select
              sx={{ minWidth: 280 }}
            >
              <MenuItem value="">Todos</MenuItem>
              {advisorOptions.map((u) => (
                <MenuItem key={u.id} value={String(u.id)}>
                  {u.full_name} — {u.email}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Estado"
              value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value })}
              size="small"
              select
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="DRAFT">Borrador</MenuItem>
              <MenuItem value="CALCULATED">Calculada</MenuItem>
              <MenuItem value="APPROVED">Aprobada</MenuItem>
              <MenuItem value="PAID">Pagada</MenuItem>
            </TextField>

            <Button
              variant="outlined"
              onClick={async () => { resetFilters(); await fetchRuns(); }}
              sx={{ borderRadius: 2 }}
            >
              Limpiar
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
                  <TableCell sx={{ fontWeight: 900 }}>Unidades</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Total comisión</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 900, width: 100 }} align="right">
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                        <CircularProgress size={18} />
                        <Typography variant="body2">Cargando comisiones…</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography variant="body2" sx={{ py: 2, color: "text.secondary" }}>
                        No hay comisiones para mostrar.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 900 }}>{r.id}</Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {r.advisor_name || r.advisor?.full_name || "—"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {r.advisor_email || r.advisor?.email || ""}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 900 }}>
                          {getMonthName(r.cut_month)} {r.cut_year}{" "}
                          {r.fortnight
                            ? `(${r.fortnight === "FIRST" ? "1ra quincena" : "2da quincena"})`
                            : ""}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {r.brand_code || r.brand?.code || ""}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">{r.units_total ?? 0}</Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 900 }}>
                          {Number(r.total_commission || 0).toLocaleString("es-CO", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
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

                          {/* Eliminar solo en DRAFT o CALCULATED */}
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
                  ))
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

      {/* =========================
          Dialog: Calcular comisión
         ========================= */}
      <Dialog
        open={openCalc}
        onClose={closeCalculate}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 1, overflow: "hidden" } }}
      >
        <DialogTitle
          sx={{
            px: 3, py: 2, fontWeight: 900,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
              Calcular comisión
            </Typography>
            <Chip size="small" label="CALCULAR" sx={{ fontWeight: 900 }} />
          </Stack>
          <Tooltip title="Cerrar">
            <IconButton onClick={closeCalculate} size="small">
              <CloseRoundedIcon />
            </IconButton>
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
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1, bgcolor: "background.paper" }}>
                <Typography sx={{ fontWeight: 900, mb: 2 }}>Parámetros del cálculo</Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Asesor"
                    value={String(calcForm.advisor_id || "")}
                    onChange={(e) => setCalcForm({ advisor_id: e.target.value })}
                    select
                    fullWidth
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
                      label="Año"
                      type="number"
                      value={calcForm.cut_year}
                      onChange={(e) => setCalcForm({ cut_year: Number(e.target.value) })}
                      fullWidth
                    />
                    <TextField
                      label="Mes"
                      value={calcForm.cut_month}
                      onChange={(e) => setCalcForm({ cut_month: Number(e.target.value) })}
                      select
                      fullWidth
                    >
                      {MONTHS.map((m) => (
                        <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                      ))}
                    </TextField>
                  </Stack>

                  <TextField
                    label="Quincena"
                    value={calcForm.fortnight}
                    onChange={(e) => setCalcForm({ fortnight: e.target.value })}
                    select
                    fullWidth
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
                <Paper
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 1, borderColor: "error.main", bgcolor: "error.lighter" }}
                >
                  <Typography variant="body2" sx={{ color: "error.main" }}>{error}</Typography>
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>

        <Divider />

        <DialogActions
          sx={{
            px: 3, py: 2,
            display: "flex", justifyContent: "space-between", gap: 1.5,
            bgcolor: "background.paper",
          }}
        >
          <Button onClick={closeCalculate} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button
            onClick={submitCalculate}
            variant="contained"
            disabled={isCalculating || !calcForm}
            sx={{ fontWeight: 900, borderRadius: 2, px: 2.5 }}
          >
            {isCalculating ? "Calculando…" : "Calcular"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =========================
          Dialog: Detalle comisión
         ========================= */}
      <Dialog
        open={openDetail}
        onClose={closeRunDetail}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "background.paper",
            boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
          },
        }}
      >
        <DialogTitle
          sx={{
            px: 3, py: 2,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2,
            borderBottom: "1px solid", borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
              Detalle comisión
            </Typography>
            <Chip
              size="small"
              label="DETALLE"
              sx={{
                fontWeight: 900,
                bgcolor: "rgba(99,179,237,0.12)",
                color: "#63b3ed",
                border: "1px solid rgba(99,179,237,0.3)",
                fontSize: "0.65rem",
                letterSpacing: 1,
              }}
            />
          </Stack>
          <Tooltip title="Cerrar">
            <IconButton onClick={closeRunDetail} size="small" sx={{ "&:hover": { bgcolor: "action.hover" } }}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
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

              {/* Resumen */}
              <Box sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", overflow: "hidden", bgcolor: "background.paper" }}>
                <Box sx={{ height: 4, background: "linear-gradient(90deg, #63b3ed, #9f7aea, #68d391)" }} />
                <Box sx={{ p: 2.5 }}>
                  <Typography sx={{ fontWeight: 900, mb: 2, color: "text.secondary", fontSize: "0.75rem", letterSpacing: 1, textTransform: "uppercase" }}>
                    Resumen
                  </Typography>

                  <Stack direction={{ xs: "column", md: "row" }} spacing={3} justifyContent="space-between">
                    {/* Columna asesor */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: 1, textTransform: "uppercase", fontSize: "0.65rem" }}>
                        Asesor
                      </Typography>
                      <Typography sx={{ fontWeight: 900, color: "text.primary", fontSize: "1rem", mt: 0.25 }}>
                        {detail.run.advisor_name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#63b3ed", fontWeight: 500 }}>
                        {detail.run.advisor_email}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
                        {detail.run.brand_name} ({detail.run.brand_code})
                      </Typography>

                      <Stack direction="row" sx={{ mt: 1.5, flexWrap: "wrap", gap: 0.75 }}>
                        {detail.run.advisor_document && (
                          <Chip size="small" label={`CC: ${detail.run.advisor_document}`}
                            sx={{ fontWeight: 700, fontSize: "0.7rem", bgcolor: "rgba(99,179,237,0.1)", color: "#63b3ed", border: "1px solid rgba(99,179,237,0.25)" }} />
                        )}
                        {detail.run.advisor_branch && (
                          <Chip size="small" label={`Sede: ${detail.run.advisor_branch}`}
                            sx={{ fontWeight: 700, fontSize: "0.7rem", bgcolor: "rgba(159,122,234,0.1)", color: "#9f7aea", border: "1px solid rgba(159,122,234,0.25)" }} />
                        )}
                        {detail.run.advisor_hire_date && (
                          <Chip size="small"
                            label={`Ingreso: ${new Date(detail.run.advisor_hire_date).toLocaleDateString("es-CO", { timeZone: "UTC" })}`}
                            sx={{ fontWeight: 700, fontSize: "0.7rem", bgcolor: "rgba(104,211,145,0.1)", color: "#68d391", border: "1px solid rgba(104,211,145,0.25)" }} />
                        )}
                        {detail.run.advisor_phone && (
                          <Chip size="small" label={`Tel: ${detail.run.advisor_phone}`}
                            sx={{ fontWeight: 700, fontSize: "0.7rem", bgcolor: "rgba(246,173,85,0.1)", color: "#f6ad55", border: "1px solid rgba(246,173,85,0.25)" }} />
                        )}
                      </Stack>
                    </Box>

                    <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" } }} />

                    {/* Columna corte */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: 1, textTransform: "uppercase", fontSize: "0.65rem" }}>
                        Corte
                      </Typography>
                      <Typography sx={{ fontWeight: 900, color: "text.primary", fontSize: "1rem", mt: 0.25 }}>
                        {getMonthName(detail.run.cut_month)} {detail.run.cut_year}{" "}
                        {detail.run.fortnight === "FIRST" ? "(1ra quincena)" : "(2da quincena)"}
                      </Typography>

                      <Stack direction="row" sx={{ mt: 1.5, flexWrap: "wrap", gap: 1 }}>
                        <Box sx={{ px: 1.5, py: 1, borderRadius: 1.5, bgcolor: "rgba(104,211,145,0.08)", border: "1px solid rgba(104,211,145,0.2)", textAlign: "center", minWidth: 80 }}>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem", letterSpacing: 0.5, textTransform: "uppercase", display: "block" }}>Estado</Typography>
                          <Typography sx={{ fontWeight: 900, color: "#68d391", fontSize: "0.8rem" }}>{String(detail.run.status || "—")}</Typography>
                        </Box>
                        <Box sx={{ px: 1.5, py: 1, borderRadius: 1.5, bgcolor: "rgba(99,179,237,0.08)", border: "1px solid rgba(99,179,237,0.2)", textAlign: "center", minWidth: 80 }}>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem", letterSpacing: 0.5, textTransform: "uppercase", display: "block" }}>Unidades</Typography>
                          <Typography sx={{ fontWeight: 900, color: "#63b3ed", fontSize: "1.1rem" }}>{detail.run.units_total ?? 0}</Typography>
                        </Box>
                        <Box sx={{ px: 1.5, py: 1, borderRadius: 1.5, bgcolor: "rgba(246,173,85,0.08)", border: "1px solid rgba(246,173,85,0.2)", textAlign: "center", minWidth: 140 }}>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem", letterSpacing: 0.5, textTransform: "uppercase", display: "block" }}>Total comisión</Typography>
                          <Typography sx={{ fontWeight: 900, color: "#f6ad55", fontSize: "1rem" }}>
                            ${Number(detail.run.total_commission || 0).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  </Stack>

                  {detail.run.notes && (
                    <Box sx={{ mt: 2, px: 2, py: 1.25, borderRadius: 1.5, bgcolor: "action.hover", border: "1px solid", borderColor: "divider", borderLeft: "3px solid rgba(99,179,237,0.5)" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem", letterSpacing: 1, textTransform: "uppercase" }}>Notas</Typography>
                      <Typography variant="body2" sx={{ color: "text.primary", mt: 0.25 }}>{detail.run.notes}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Tabla items */}
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
                        {["Fecha","Factura","Cliente","Placa","Vehículo"].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 900, color: "text.secondary", fontSize: "0.7rem", letterSpacing: 0.5, textTransform: "uppercase" }}>{h}</TableCell>
                        ))}
                        <TableCell sx={{ fontWeight: 900, color: "text.secondary", fontSize: "0.7rem", letterSpacing: 0.5, textTransform: "uppercase" }} align="right">Rate</TableCell>
                        <TableCell sx={{ fontWeight: 900, color: "text.secondary", fontSize: "0.7rem", letterSpacing: 0.5, textTransform: "uppercase" }}>Notas</TableCell>
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
                          <TableRow key={it.id} hover sx={{ "& td": { borderColor: "divider" }, "&:last-child td": { borderBottom: "none" } }}>
                            <TableCell>
                              <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.78rem" }}>{it.sale_date || "—"}</Typography>
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
                                {Number(it.rate_amount || 0).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

        <DialogActions sx={{ px: 3, py: 2, bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider" }}>
          <Button onClick={closeRunDetail} variant="outlined" sx={{ borderRadius: 2 }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* =========================
          Dialog: Confirmar eliminar
         ========================= */}
      <Dialog
        open={openConfirmDelete}
        onClose={cancelDeleteRun}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, px: 3, py: 2 }}>
          ¿Eliminar comisión?
        </DialogTitle>

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

        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between", bgcolor: "background.paper" }}>
          <Button onClick={cancelDeleteRun} variant="outlined" disabled={isDeleting} sx={{ borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button
            onClick={confirmDeleteRun}
            variant="contained"
            color="error"
            disabled={isDeleting}
            sx={{ fontWeight: 900, borderRadius: 2 }}
          >
            {isDeleting ? "Eliminando…" : "Sí, eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}