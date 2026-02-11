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
  CircularProgress,
  Grid,
  Paper,
  Chip,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

import { useSalesStore } from "../../app/store/sales.store";

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

export default function Sales() {
  const {
    items,
    total,
    filters,
    brands,
    advisors,
    vehicles,
    isLoading,
    isSaving,
    error,

    openForm,
    formMode,
    formSale,

    setFilters,
    resetFilters,
    hydrateMeta,
    fetchSales,
    fetchVehiclesForBrand,

    openCreate,
    openEdit, // (por si luego agregas editar en la tabla)
    closeForm,
    setFormSale,
    submitForm,
  } = useSalesStore();

  useEffect(() => {
    (async () => {
      await hydrateMeta();
      await fetchSales();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const brandOptions = useMemo(() => brands || [], [brands]);
  const advisorOptions = useMemo(() => advisors || [], [advisors]);
  const vehicleOptions = useMemo(() => vehicles || [], [vehicles]);

  const handleSearch = async () => {
    await fetchSales();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  // ✅ Cambio de marca en filtros => recarga vehículos (para el modal) + lista
  const handleFilterBrandChange = async (value) => {
    setFilters({ brand_id: value, page: 1 });
    await fetchVehiclesForBrand();
    await fetchSales();
  };

  // ✅ Cambio de marca en el MODAL => recarga vehículos también
  const handleFormBrandChange = async (value) => {
    setFormSale({ brand_id: Number(value), vehicle_id: "" });
    // sincroniza filtro de marca (opcional pero recomendado)
    setFilters({ brand_id: String(value) });
    await fetchVehiclesForBrand();
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
              Ventas
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Tooltip title="Buscar">
              <IconButton onClick={handleSearch}>
                <SearchRoundedIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Refrescar">
              <IconButton onClick={fetchSales}>
                <RefreshRoundedIcon />
              </IconButton>
            </Tooltip>

            <Button
              onClick={openCreate}
              variant="contained"
              startIcon={<AddRoundedIcon />}
              sx={{ borderRadius: 2, fontWeight: 900 }}
            >
              Nueva venta
            </Button>
          </Stack>
        </Stack>

        {/* Filters */}
        <Card sx={{ p: 2, borderRadius: 1 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <TextField
              label="Buscar"
              value={filters.q}
              onChange={(e) => setFilters({ q: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="Factura, cliente o placa…"
              size="small"
              sx={{ flex: 1 }}
            />

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
              label="Desde"
              type="date"
              value={filters.date_from || ""}
              onChange={(e) => setFilters({ date_from: e.target.value })}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />

            <TextField
              label="Hasta"
              type="date"
              value={filters.date_to || ""}
              onChange={(e) => setFilters({ date_to: e.target.value })}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />

            <Button
              variant="outlined"
              onClick={async () => {
                resetFilters();
                await fetchVehiclesForBrand();
                await fetchSales();
              }}
              sx={{ borderRadius: 2 }}
            >
              Limpiar
            </Button>
          </Stack>

          {error ? (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ color: "error.main" }}>
                {error}
              </Typography>
            </Box>
          ) : null}
        </Card>

        {/* Table */}
        <Card sx={{ borderRadius: 1, overflow: "hidden" }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>Fecha</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Factura</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Cliente</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Placa</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Vehículo</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Asesor</TableCell>
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
                          Cargando ventas…
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
                        No hay ventas para mostrar.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {s.sale_date || "—"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 900 }}>
                          {s.invoice || "—"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {s.client_name || "—"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {s.plate || "—"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {s.vehicle?.model
                            ? `${s.vehicle.model} ${s.vehicle.version || ""}`.trim()
                            : "—"}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          {s.vehicle?.code || ""}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {s.advisor?.full_name || "—"}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          {s.advisor?.email || ""}
                        </Typography>
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
              await fetchSales();
            }}
            rowsPerPage={filters.limit || 10}
            onRowsPerPageChange={async (e) => {
              setFilters({ limit: Number(e.target.value), page: 1 });
              await fetchSales();
            }}
            rowsPerPageOptions={[5, 10, 20, 50]}
          />
        </Card>
      </Stack>

      {/* =========================
    Dialog: Create / Edit Sale
   ========================= */}
      <Dialog
        open={openForm}
        onClose={closeForm}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 1,
            overflow: "hidden",
          },
        }}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            px: 3,
            py: 2,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
              {formMode === "edit" ? "Editar venta" : "Nueva venta"}
            </Typography>

            <Chip
              size="small"
              label={formMode === "edit" ? "EDITAR" : "CREAR"}
              sx={{ fontWeight: 900 }}
            />
          </Stack>

          <Tooltip title="Cerrar">
            <IconButton onClick={closeForm} size="small">
              <CloseRoundedIcon />
            </IconButton>
          </Tooltip>
        </DialogTitle>

        <Divider />

        <DialogContent
          sx={{
            px: 3,
            py: 2.5,
            bgcolor: "background.default",
          }}
        >
          {!formSale ? (
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
            <Stack spacing={2.5} sx={{ pt: 0.5 }}>
              {/* Sección: Datos principales */}
              <Paper
                variant="outlined"
                sx={{ p: 2.5, borderRadius: 1, bgcolor: "background.paper" }}
              >
                <Typography sx={{ fontWeight: 900, mb: 2 }}>
                  Información de la venta
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Marca"
                      value={String(formSale.brand_id ?? 6)}
                      onChange={(e) => handleFormBrandChange(e.target.value)}
                      select
                      fullWidth
                    >
                      {brandOptions.map((b) => (
                        <MenuItem key={b.id} value={String(b.id)}>
                          {b.name} ({b.code})
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Asesor"
                      value={String(formSale.advisor_id || "")}
                      onChange={(e) =>
                        setFormSale({ advisor_id: e.target.value })
                      }
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
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Vehículo"
                      value={String(formSale.vehicle_id || "")}
                      onChange={(e) =>
                        setFormSale({ vehicle_id: e.target.value })
                      }
                      select
                      fullWidth
                    >
                      <MenuItem value="">Selecciona…</MenuItem>
                      {vehicleOptions.map((v) => (
                        <MenuItem key={v.id} value={String(v.id)}>
                          {v.code} — {v.model} {v.version}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Fecha venta"
                      type="date"
                      value={formSale.sale_date || ""}
                      onChange={(e) =>
                        setFormSale({ sale_date: e.target.value })
                      }
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Sección: Datos de facturación / cliente */}
              <Paper
                variant="outlined"
                sx={{ p: 2.5, borderRadius: 1, bgcolor: "background.paper" }}
              >
                <Typography sx={{ fontWeight: 900, mb: 2 }}>
                  Facturación y cliente
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Factura"
                      value={formSale.invoice || ""}
                      onChange={(e) => setFormSale({ invoice: e.target.value })}
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Placa"
                      value={formSale.plate || ""}
                      onChange={(e) => setFormSale({ plate: e.target.value })}
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Cliente"
                      value={formSale.client_name || ""}
                      onChange={(e) =>
                        setFormSale({ client_name: e.target.value })
                      }
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Notas (opcional)"
                      value={formSale.notes || ""}
                      onChange={(e) => setFormSale({ notes: e.target.value })}
                      fullWidth
                      multiline
                      minRows={2}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Error */}
              {error ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    borderColor: "error.main",
                    bgcolor: "error.lighter",
                  }}
                >
                  <Typography variant="body2" sx={{ color: "error.main" }}>
                    {error}
                  </Typography>
                </Paper>
              ) : null}
            </Stack>
          )}
        </DialogContent>

        <Divider />

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            display: "flex",
            justifyContent: "space-between",
            gap: 1.5,
            bgcolor: "background.paper",
          }}
        >
          <Button
            onClick={closeForm}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={submitForm}
            variant="contained"
            disabled={isSaving || !formSale}
            sx={{ fontWeight: 900, borderRadius: 2, px: 2.5 }}
          >
            {isSaving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
