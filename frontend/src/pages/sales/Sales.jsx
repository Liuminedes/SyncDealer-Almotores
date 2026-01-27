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
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

import { useSalesStore } from "../../app/store/sales.store";

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
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Ventas
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Registro manual de ventas (Sprint 5)
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
                  <TableCell sx={{ fontWeight: 900 }}>Corte</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                        <CircularProgress size={18} />
                        <Typography variant="body2">Cargando ventas…</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography variant="body2" sx={{ py: 2, color: "text.secondary" }}>
                        No hay ventas para mostrar.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell>
                        <Typography variant="body2">{s.sale_date || "—"}</Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 900 }}>
                          {s.invoice || "—"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">{s.client_name || "—"}</Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">{s.plate || "—"}</Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {s.vehicle?.model
                            ? `${s.vehicle.model} ${s.vehicle.version || ""}`.trim()
                            : "—"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {s.vehicle?.code || ""}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {s.advisor?.full_name || "—"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {s.advisor?.email || ""}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 900 }}>
                          {s.cut_month ? `Mes ${s.cut_month}` : "—"}{" "}
                          {s.fortnight ? `(${s.fortnight === "FIRST" ? "1ra" : "2da"})` : ""}
                        </Typography>
                        {s.charge_month ? (
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            Cobro: mes {s.charge_month}
                          </Typography>
                        ) : null}
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
      <Dialog open={openForm} onClose={closeForm} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 900 }}>
          {formMode === "edit" ? "Editar venta" : "Nueva venta"}
        </DialogTitle>

        <DialogContent dividers>
          {!formSale ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2">Cargando…</Typography>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
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

                <TextField
                  label="Asesor"
                  value={String(formSale.advisor_id || "")}
                  onChange={(e) => setFormSale({ advisor_id: e.target.value })}
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
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Vehículo"
                  value={String(formSale.vehicle_id || "")}
                  onChange={(e) => setFormSale({ vehicle_id: e.target.value })}
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

                <TextField
                  label="Fecha venta"
                  type="date"
                  value={formSale.sale_date || ""}
                  onChange={(e) => setFormSale({ sale_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Mes corte (1-12)"
                  type="number"
                  value={formSale.cut_month ?? ""}
                  onChange={(e) => setFormSale({ cut_month: e.target.value })}
                  fullWidth
                />

                <TextField
                  label="Quincena"
                  value={formSale.fortnight || "FIRST"}
                  onChange={(e) => setFormSale({ fortnight: e.target.value })}
                  select
                  fullWidth
                >
                  <MenuItem value="FIRST">Primera</MenuItem>
                  <MenuItem value="SECOND">Segunda</MenuItem>
                </TextField>

                <TextField
                  label="Mes cobro (opcional)"
                  type="number"
                  value={formSale.charge_month ?? ""}
                  onChange={(e) => setFormSale({ charge_month: e.target.value })}
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Factura"
                  value={formSale.invoice || ""}
                  onChange={(e) => setFormSale({ invoice: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Placa"
                  value={formSale.plate || ""}
                  onChange={(e) => setFormSale({ plate: e.target.value })}
                  fullWidth
                />
              </Stack>

              <TextField
                label="Cliente"
                value={formSale.client_name || ""}
                onChange={(e) => setFormSale({ client_name: e.target.value })}
                fullWidth
              />

              <TextField
                label="Notas (opcional)"
                value={formSale.notes || ""}
                onChange={(e) => setFormSale({ notes: e.target.value })}
                fullWidth
                multiline
                minRows={2}
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
          <Button onClick={closeForm} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={submitForm}
            variant="contained"
            disabled={isSaving || !formSale}
            sx={{ fontWeight: 900 }}
          >
            {isSaving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
