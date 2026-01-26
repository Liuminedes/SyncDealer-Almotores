
import { useEffect, useMemo } from "react";
import {
  Box,
  Card,
  Typography,
  Stack,
  TextField,
  Button,
  Chip,
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
  Switch,
  FormControlLabel,
  CircularProgress,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

import { useVehiclesStore } from "../../app/store/vehicles.store";

export default function Vehicles() {
  const {
    items,
    total,
    filters,
    brands,
    isLoading,
    isSaving,
    error,

    openForm,
    formMode,
    formVehicle,
    formatMoney,

    setFilters,
    resetFilters,
    hydrateMeta,
    fetchVehicles,

    openCreate,
    openEdit,
    closeForm,
    setFormVehicle,
    setRate,
    submitForm,
    toggleStatus,
  } = useVehiclesStore();

  useEffect(() => {
    (async () => {
      await hydrateMeta();
      await fetchVehicles();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const brandOptions = useMemo(() => brands || [], [brands]);

  const handleSearch = async () => {
    await fetchVehicles();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Stack spacing={2}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Vehículos
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Catálogo + precio + valores por Tabla (KIA primero 🔥)
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Tooltip title="Buscar">
              <IconButton onClick={handleSearch}>
                <SearchRoundedIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Refrescar">
              <IconButton onClick={fetchVehicles}>
                <RefreshRoundedIcon />
              </IconButton>
            </Tooltip>

            <Button
              onClick={openCreate}
              variant="contained"
              startIcon={<AddRoundedIcon />}
              sx={{ borderRadius: 2, fontWeight: 900 }}
            >
              Nuevo vehículo
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
              placeholder="Código, modelo o versión…"
              size="small"
              sx={{ flex: 1 }}
            />

            <TextField
              label="Marca"
              value={filters.brand_id}
              onChange={(e) => setFilters({ brand_id: e.target.value })}
              size="small"
              select
              sx={{ minWidth: 200 }}
            >
              {/* KIA por defecto, pero listo para multi-marca */}
              {brandOptions.map((b) => (
                <MenuItem key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Estado"
              value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value })}
              size="small"
              select
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="active">Activos</MenuItem>
              <MenuItem value="inactive">Inactivos</MenuItem>
              <MenuItem value="all">Todos</MenuItem>
            </TextField>

            <Button
              variant="outlined"
              onClick={async () => {
                resetFilters();
                await fetchVehicles();
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
                  <TableCell sx={{ fontWeight: 900 }}>Código</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Modelo</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Versión</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Año</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Precio</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Tabla 1</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Tabla 2</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Tabla 3</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Estado</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900 }}>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                        <CircularProgress size={18} />
                        <Typography variant="body2">Cargando vehículos…</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10}>
                      <Typography variant="body2" sx={{ py: 2, color: "text.secondary" }}>
                        No hay resultados con esos filtros.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((v) => (
                    <TableRow key={v.id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                          {v.code}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">{v.model}</Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">{v.version}</Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          {v.model_year || "—"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {v.sale_price ? formatMoney(v.sale_price) : "—"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">{formatMoney(v._rate1 || 0)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatMoney(v._rate2 || 0)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatMoney(v._rate3 || 0)}</Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={v.is_active ? "Activo" : "Inactivo"}
                          sx={{ fontWeight: 900, opacity: v.is_active ? 1 : 0.7 }}
                        />
                      </TableCell>

                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Editar">
                            <IconButton
                              onClick={() => openEdit(v)}
                              size="small"
                              sx={{
                                "&:hover": {
                                  bgcolor: "primary.main",
                                  color: "primary.contrastText",
                                },
                              }}
                            >
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title={v.is_active ? "Desactivar" : "Activar"}>
                            <IconButton
                              onClick={() => toggleStatus(v)}
                              size="small"
                              sx={{
                                "&:hover": {
                                  bgcolor: "primary.main",
                                  color: "primary.contrastText",
                                },
                              }}
                            >
                              <PowerSettingsNewRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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
              await fetchVehicles();
            }}
            rowsPerPage={filters.limit || 10}
            onRowsPerPageChange={async (e) => {
              setFilters({ limit: Number(e.target.value), page: 1 });
              await fetchVehicles();
            }}
            rowsPerPageOptions={[5, 10, 20, 50]}
          />
        </Card>
      </Stack>

      {/* =========================
          Dialog: Create/Edit Vehicle
         ========================= */}
      <Dialog open={openForm} onClose={closeForm} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 900 }}>
          {formMode === "create" ? "Nuevo vehículo" : "Editar vehículo"}
        </DialogTitle>

        <DialogContent dividers>
          {!formVehicle ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2">Cargando…</Typography>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Marca"
                  value={String(formVehicle.brand_id ?? 6)}
                  onChange={(e) => setFormVehicle({ brand_id: Number(e.target.value) })}
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
                  label="Código"
                  value={formVehicle.code}
                  onChange={(e) => setFormVehicle({ code: e.target.value })}
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Modelo"
                  value={formVehicle.model}
                  onChange={(e) => setFormVehicle({ model: e.target.value })}
                  fullWidth
                />

                <TextField
                  label="Versión"
                  value={formVehicle.version}
                  onChange={(e) => setFormVehicle({ version: e.target.value })}
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Año modelo"
                  value={formVehicle.model_year}
                  onChange={(e) => setFormVehicle({ model_year: e.target.value })}
                  type="number"
                  fullWidth
                />

                <TextField
                  label="Precio venta (COP)"
                  value={formVehicle.sale_price}
                  onChange={(e) => setFormVehicle({ sale_price: e.target.value })}
                  type="number"
                  fullWidth
                />
              </Stack>

              <Card sx={{ p: 2, borderRadius: 2 }}>
                <Typography sx={{ fontWeight: 900, mb: 1 }}>
                  Valores por Tabla (comisión asesor)
                </Typography>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    label="TABLA 1"
                    value={formVehicle.rates?.TABLA_1 ?? ""}
                    onChange={(e) => setRate("TABLA_1", e.target.value)}
                    type="number"
                    fullWidth
                  />
                  <TextField
                    label="TABLA 2"
                    value={formVehicle.rates?.TABLA_2 ?? ""}
                    onChange={(e) => setRate("TABLA_2", e.target.value)}
                    type="number"
                    fullWidth
                  />
                  <TextField
                    label="TABLA 3"
                    value={formVehicle.rates?.TABLA_3 ?? ""}
                    onChange={(e) => setRate("TABLA_3", e.target.value)}
                    type="number"
                    fullWidth
                  />
                </Stack>

                <Typography variant="caption" sx={{ color: "text.secondary", mt: 1, display: "block" }}>
                  Tip: si no aplica una tabla para un vehículo, deja 0.
                </Typography>
              </Card>

              <FormControlLabel
                control={
                  <Switch
                    checked={!!formVehicle.is_active}
                    onChange={(e) => setFormVehicle({ is_active: e.target.checked })}
                  />
                }
                label="Activo"
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
            disabled={isSaving || !formVehicle}
            sx={{ fontWeight: 900 }}
          >
            {isSaving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
