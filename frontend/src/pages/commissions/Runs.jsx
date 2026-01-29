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
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";

import { useCommissionRunsStore } from "../../app/store/commissionRuns.store";

export const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

const getMonthName = (month) =>
  MONTHS.find((m) => m.value === Number(month))?.label ?? "Mes inválido";

const statusChip = (status) => {
  const s = String(status || "—").toUpperCase();
  const map = {
    DRAFT: { label: "Borrador", variant: "outlined" },
    CALCULATED: { label: "Calculada", variant: "filled" },
    APPROVED: { label: "Aprobada", variant: "filled" },
    PAID: { label: "Pagada", variant: "filled" },
  };
  const conf = map[s] || { label: s, variant: "outlined" };
  return (
    <Chip
      size="small"
      label={conf.label}
      variant={conf.variant}
      sx={{ fontWeight: 800 }}
    />
  );
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
    error,

    openCalc,
    calcForm,
    openDetail,
    detail,

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
  } = useCommissionRunsStore();

  // 🔹 Carga inicial
  useEffect(() => {
    (async () => {
      await hydrateMeta();
      await fetchRuns();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔥 FIX CLAVE: si se abre el modal y no hay asesores → recargar
  useEffect(() => {
    if (openCalc && advisors.length === 0) {
      hydrateMeta();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCalc]);

  const brandOptions = useMemo(() => brands || [], [brands]);
  const advisorOptions = useMemo(() => advisors || [], [advisors]);

  const handleFilterBrandChange = async (value) => {
    setFilters({ brand_id: value, page: 1 });
    await fetchRuns();
  };

  const handleRefresh = async () => {
    await fetchRuns();
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Stack spacing={2}>
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Cálculo de comisiones
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Liquidación automática por asesor (mes vencido)
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Tooltip title="Refrescar">
              <IconButton onClick={handleRefresh}>
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

        {/* Filters */}
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
              onChange={(e) =>
                setFilters({ cut_month: Number(e.target.value) })
              }
              size="small"
              select
              sx={{ minWidth: 160 }}
            >
              {MONTHS.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
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
              onClick={async () => {
                resetFilters();
                await fetchRuns();
              }}
              sx={{ borderRadius: 2 }}
            >
              Limpiar
            </Button>
          </Stack>
        </Card>

        {/* Table */}
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
                  <TableCell sx={{ fontWeight: 900, width: 90 }} align="right">
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ py: 2 }}
                      >
                        <CircularProgress size={18} />
                        <Typography variant="body2">
                          Cargando comisiones…
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography
                        variant="body2"
                        sx={{ py: 2, color: "text.secondary" }}
                      >
                        No hay comisiones para mostrar.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 900 }}>
                          {r.id}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {r.advisor_name || r.advisor?.full_name || "—"}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
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
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          {r.brand_code || r.brand?.code || ""}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {r.units_total ?? 0}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 900 }}>
                          {Number(r.total_commission || 0).toLocaleString(
                            "es-CO",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </Typography>
                      </TableCell>

                      <TableCell>{statusChip(r.status)}</TableCell>

                      <TableCell align="right">
                        <Tooltip title="Ver detalle">
                          <IconButton onClick={() => openRunDetail(r.id)}>
                            <VisibilityRoundedIcon />
                          </IconButton>
                        </Tooltip>
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
      <Dialog open={openCalc} onClose={closeCalculate} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Calcular comisión</DialogTitle>

        <DialogContent dividers>
          {!calcForm ? (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ py: 2 }}
            >
              <CircularProgress size={18} />
              <Typography variant="body2">Cargando…</Typography>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
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
                  onChange={(e) =>
                    setCalcForm({ cut_year: Number(e.target.value) })
                  }
                  fullWidth
                />

                <TextField
                  label="Mes"
                  value={calcForm.cut_month}
                  onChange={(e) =>
                    setCalcForm({ cut_month: Number(e.target.value) })
                  }
                  select
                  fullWidth
                >
                  {MONTHS.map((m) => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
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
          )}

          {error ? (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ color: "error.main" }}>
                {error}
              </Typography>
            </Box>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={closeCalculate} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={submitCalculate}
            variant="contained"
            disabled={isCalculating || !calcForm}
            sx={{ fontWeight: 900 }}
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
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Detalle comisión</DialogTitle>

        <DialogContent dividers>
          {isLoadingDetail ? (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ py: 2 }}
            >
              <CircularProgress size={18} />
              <Typography variant="body2">Cargando detalle…</Typography>
            </Stack>
          ) : !detail?.run ? (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              No hay información para mostrar.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {/* Summary */}
              <Card sx={{ p: 2, borderRadius: 2 }}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ color: "text.secondary" }}
                    >
                      Asesor
                    </Typography>
                    <Typography sx={{ fontWeight: 900 }}>
                      {detail.run.advisor_name}{" "}
                      <Typography
                        component="span"
                        sx={{ color: "text.secondary", fontWeight: 600 }}
                      >
                        ({detail.run.advisor_email})
                      </Typography>
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      {detail.run.brand_name} ({detail.run.brand_code})
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ color: "text.secondary" }}
                    >
                      Corte
                    </Typography>
                    <Typography sx={{ fontWeight: 900 }}>
                      {getMonthName(detail.run.cut_month)} {detail.run.cut_year}{" "}
                      {detail.run.fortnight === "FIRST"
                        ? "(1ra quincena)"
                        : "(2da quincena)"}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      {statusChip(detail.run.status)}
                      <Chip
                        size="small"
                        label={`Unidades: ${detail.run.units_total ?? 0}`}
                        variant="outlined"
                        sx={{ fontWeight: 800 }}
                      />
                      <Chip
                        size="small"
                        label={`Total: ${Number(
                          detail.run.total_commission || 0,
                        ).toLocaleString("es-CO", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`}
                        variant="outlined"
                        sx={{ fontWeight: 800 }}
                      />
                    </Stack>
                  </Box>
                </Stack>

                {detail.run.notes ? (
                  <Typography
                    variant="body2"
                    sx={{ mt: 1, color: "text.secondary" }}
                  >
                    Nota: {detail.run.notes}
                  </Typography>
                ) : null}
              </Card>

              {/* Items */}
              <Card sx={{ borderRadius: 2, overflow: "hidden" }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 900 }}>Fecha</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Factura</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Cliente</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Placa</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Vehículo</TableCell>
                        <TableCell sx={{ fontWeight: 900 }} align="right">
                          Rate
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Notas</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {(detail.items || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7}>
                            <Typography
                              variant="body2"
                              sx={{ py: 2, color: "text.secondary" }}
                            >
                              No hay items para esta comisión.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        (detail.items || []).map((it) => (
                          <TableRow key={it.id} hover>
                            <TableCell>
                              <Typography variant="body2">
                                {it.sale_date || "—"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 900 }}
                              >
                                {it.invoice || "—"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {it.client_name || "—"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {it.plate || "—"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {it.vehicle_model
                                  ? `${it.vehicle_model} ${it.vehicle_version || ""}`.trim()
                                  : "—"}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: "text.secondary" }}
                              >
                                {it.vehicle_code || ""}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 900 }}
                              >
                                {Number(it.rate_amount || 0).toLocaleString(
                                  "es-CO",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="caption"
                                sx={{ color: "text.secondary" }}
                              >
                                {it.notes || ""}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Stack>
          )}

          {error ? (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ color: "error.main" }}>
                {error}
              </Typography>
            </Box>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={closeRunDetail} variant="outlined">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
