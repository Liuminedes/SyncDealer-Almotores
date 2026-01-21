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
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

import { useUsersStore } from "../../app/store/users.store";

export default function Users() {
  const {
    items,
    total,
    filters,
    roles,
    brands,
    isLoading,
    isSaving,
    error,

    openForm,
    formMode,
    formUser,
    formBrandsSelection,

    setFilters,
    resetFilters,
    hydrateMeta,
    fetchUsers,

    openCreate,
    openEdit,
    closeForm,
    setFormUser,
    setFormBrandPerm,
    submitForm,

    toggleStatus
  } = useUsersStore();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    (async () => {
      await hydrateMeta();
      await fetchUsers();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleOptions = useMemo(() => roles || [], [roles]);
  const brandOptions = useMemo(() => brands || [], [brands]);

  const actionBtnSx = {
    borderRadius: 2,
    transition: "all .15s ease",
    "&:hover": {
      bgcolor: "primary.main",
      color: "primary.contrastText",
      transform: "translateY(-1px)",
      boxShadow: "0 8px 20px rgba(124,58,237,.22)",
    },
  };

  const runSearch = async () => {
    setFilters({ page: 1 });
    await fetchUsers();
  };

  const onSearchKeyDown = (e) => {
    if (e.key === "Enter") runSearch();
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Stack spacing={2}>
        {/* Header */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Usuarios
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              CRUD + roles + permisos por marca (Sprint 4)
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} justifyContent={{ xs: "flex-end", sm: "flex-end" }}>
            <Button
              onClick={openCreate}
              variant="contained"
              startIcon={<AddRoundedIcon />}
              sx={{ borderRadius: 2, fontWeight: 800 }}
            >
              Nuevo usuario
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
              onKeyDown={onSearchKeyDown}
              placeholder="Nombre o email…"
              size="small"
              sx={{ flex: 1 }}
            />

            <TextField
              label="Rol"
              value={filters.role}
              onChange={(e) => setFilters({ role: e.target.value })}
              size="small"
              select
              sx={{ minWidth: { xs: "100%", md: 180 } }}
            >
              <MenuItem value="">Todos</MenuItem>
              {roleOptions.map((r) => (
                <MenuItem key={r.id} value={r.name}>
                  {r.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Estado"
              value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value })}
              size="small"
              select
              sx={{ minWidth: { xs: "100%", md: 160 } }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="active">Activos</MenuItem>
              <MenuItem value="inactive">Inactivos</MenuItem>
            </TextField>

            <TextField
              label="Marca"
              value={filters.brand_id}
              onChange={(e) => setFilters({ brand_id: e.target.value })}
              size="small"
              select
              sx={{ minWidth: { xs: "100%", md: 200 } }}
            >
              <MenuItem value="">Todas</MenuItem>
              {brandOptions.map((b) => (
                <MenuItem key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={runSearch} sx={{ borderRadius: 2 }}>
                Buscar
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  resetFilters();
                  fetchUsers();
                }}
                sx={{ borderRadius: 2 }}
              >
                Limpiar
              </Button>
            </Stack>
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
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>Usuario</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Rol</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Marcas</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900 }}>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                        <CircularProgress size={18} />
                        <Typography variant="body2">Cargando usuarios…</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" sx={{ py: 2, color: "text.secondary" }}>
                        No hay resultados con esos filtros.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                          {u.full_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {u.email}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip size="small" label={u?.role?.name || "—"} sx={{ fontWeight: 800 }} />
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={u.is_active ? "Activo" : "Inactivo"}
                          sx={{ fontWeight: 800, opacity: u.is_active ? 1 : 0.7 }}
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          {u.brands?.length ? `${u.brands.length} asignadas` : "—"}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                          <Tooltip title="Editar">
                            <IconButton onClick={() => openEdit(u)} size="small" sx={actionBtnSx}>
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title={u.is_active ? "Desactivar" : "Activar"}>
                            <IconButton onClick={() => toggleStatus(u)} size="small" sx={actionBtnSx}>
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
            onPageChange={(_, newPage) => {
              setFilters({ page: newPage + 1 });
              fetchUsers();
            }}
            rowsPerPage={filters.limit || 10}
            onRowsPerPageChange={(e) => {
              setFilters({ limit: Number(e.target.value), page: 1 });
              fetchUsers();
            }}
            rowsPerPageOptions={[5, 10, 20, 50]}
          />
        </Card>
      </Stack>

      {/* =========================
          Dialog: Create/Edit User
         ========================= */}
      <Dialog
        open={openForm}
        onClose={closeForm}
        fullWidth
        maxWidth="md"
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          {formMode === "create" ? "Nuevo usuario" : "Editar usuario"}
        </DialogTitle>

        <DialogContent dividers>
          {!formUser ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2">Cargando…</Typography>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Nombre completo"
                  value={formUser.full_name}
                  onChange={(e) => setFormUser({ full_name: e.target.value })}
                  fullWidth
                />

                <TextField
                  label="Email"
                  value={formUser.email}
                  onChange={(e) => setFormUser({ email: e.target.value })}
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label={formMode === "create" ? "Contraseña" : "Contraseña (opcional)"}
                  value={formUser.password}
                  onChange={(e) => setFormUser({ password: e.target.value })}
                  type="password"
                  fullWidth
                />

                <TextField
                  label="Rol"
                  value={formUser.role_id}
                  onChange={(e) => setFormUser({ role_id: e.target.value })}
                  select
                  fullWidth
                >
                  <MenuItem value="">Selecciona…</MenuItem>
                  {roleOptions.map((r) => (
                    <MenuItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <FormControlLabel
                control={
                  <Switch
                    checked={!!formUser.is_active}
                    onChange={(e) => setFormUser({ is_active: e.target.checked })}
                  />
                }
                label="Activo"
              />

              {/* Permisos por marca en el Form */}
              <Card sx={{ p: 2, borderRadius: 3 }}>
                <Typography sx={{ fontWeight: 900, mb: 0.5 }}>
                  Permisos por marca
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                  Define si este usuario puede ver o generar reportes por marca.
                </Typography>

                {formBrandsSelection === null ? (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
                    <CircularProgress size={18} />
                    <Typography variant="body2">Cargando marcas…</Typography>
                  </Stack>
                ) : formBrandsSelection.length === 0 ? (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    No hay marcas para mostrar.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {formBrandsSelection.map((b) => (
                      <Card key={b.brand_id} sx={{ p: 1.5, borderRadius: 2 }}>
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          spacing={1}
                          alignItems={{ xs: "flex-start", md: "center" }}
                          justifyContent="space-between"
                        >
                          <Box>
                            <Typography sx={{ fontWeight: 900 }}>
                              {b.name} <span style={{ opacity: 0.7 }}>({b.code})</span>
                            </Typography>
                          </Box>

                          <Stack direction="row" spacing={2}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={!!b.can_view}
                                  onChange={(e) =>
                                    setFormBrandPerm(b.brand_id, { can_view: e.target.checked })
                                  }
                                />
                              }
                              label="View"
                            />
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={!!b.can_generate}
                                  onChange={(e) =>
                                    setFormBrandPerm(b.brand_id, { can_generate: e.target.checked })
                                  }
                                />
                              }
                              label="Generate"
                            />
                          </Stack>
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Card>

              {error ? (
                <Box>
                  <Typography variant="body2" sx={{ color: "error.main" }}>
                    {error}
                  </Typography>
                </Box>
              ) : null}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={closeForm} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={submitForm}
            variant="contained"
            disabled={isSaving || !formUser}
            sx={{ fontWeight: 900 }}
          >
            {isSaving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
