import { useEffect, useMemo } from "react";
import {
  Box, Card, Typography, Stack, TextField, Button, Chip,
  IconButton, Tooltip, MenuItem, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, TablePagination,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, Switch, FormControlLabel, CircularProgress,
  useMediaQuery, Grid, Paper,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import AddRoundedIcon              from "@mui/icons-material/AddRounded";
import EditRoundedIcon             from "@mui/icons-material/EditRounded";
import CloseRoundedIcon            from "@mui/icons-material/CloseRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";

import { useUsersStore } from "../../app/store/users.store";

export default function Users() {
  const {
    items, total, filters,
    roles, brands, branches,
    isLoading, isSaving, error,
    openForm, formMode, formUser, formBrandsSelection,
    setFilters, resetFilters, hydrateMeta, fetchUsers,
    openCreate, openEdit, closeForm,
    setFormUser, setFormBrandPerm, submitForm,
    toggleStatus,
  } = useUsersStore();

  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    (async () => {
      await hydrateMeta();
      await fetchUsers();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleOptions   = useMemo(() => roles    || [], [roles]);
  const brandOptions  = useMemo(() => brands   || [], [brands]);
  const branchOptions = useMemo(() => branches || [], [branches]);

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

  const runSearch       = async () => { setFilters({ page: 1 }); await fetchUsers(); };
  const onSearchKeyDown = (e)       => { if (e.key === "Enter") runSearch(); };

  const permChip = (b) => {
    const v = !!b.can_view, g = !!b.can_generate;
    if (v && g) return { label: "Ver + Generar", color: "success" };
    if (v)      return { label: "Solo Ver",       color: "info"    };
    if (g)      return { label: "Solo Generar",   color: "warning" };
    return        { label: "Sin permisos",      color: "default" };
  };

  const applyAllPerms = (patch) => {
    if (!formBrandsSelection?.length) return;
    formBrandsSelection.forEach((b) => setFormBrandPerm(b.brand_id, patch));
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("es-CO", { timeZone: "UTC" }) : "—";

  return (
    <Box sx={{ width: "100%" }}>
      <Stack spacing={2}>

        {/* ── Header ── */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}
          justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }}>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>Usuarios</Typography>
          <Button onClick={openCreate} variant="contained" startIcon={<AddRoundedIcon />}
            sx={{ borderRadius: 2, fontWeight: 800 }}>
            Nuevo usuario
          </Button>
        </Stack>

        {/* ── Filtros ── */}
        <Card sx={{ p: 2, borderRadius: 1 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}
            alignItems={{ xs: "stretch", md: "center" }}>
            <TextField
              label="Buscar" value={filters.q} size="small" sx={{ flex: 1 }}
              placeholder="Nombre, email o cédula…"
              onChange={(e) => setFilters({ q: e.target.value })}
              onKeyDown={onSearchKeyDown}
            />
            <TextField label="Rol" value={filters.role} size="small" select
              sx={{ minWidth: { xs: "100%", md: 180 } }}
              onChange={(e) => setFilters({ role: e.target.value })}>
              <MenuItem value="">Todos</MenuItem>
              {roleOptions.map((r) => (
                <MenuItem key={r.id} value={r.name}>{r.name}</MenuItem>
              ))}
            </TextField>
            <TextField label="Estado" value={filters.status} size="small" select
              sx={{ minWidth: { xs: "100%", md: 160 } }}
              onChange={(e) => setFilters({ status: e.target.value })}>
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="active">Activos</MenuItem>
              <MenuItem value="inactive">Inactivos</MenuItem>
            </TextField>
            <TextField label="Marca" value={filters.brand_id} size="small" select
              sx={{ minWidth: { xs: "100%", md: 200 } }}
              onChange={(e) => setFilters({ brand_id: e.target.value })}>
              <MenuItem value="">Todas</MenuItem>
              {brandOptions.map((b) => (
                <MenuItem key={b.id} value={String(b.id)}>{b.name} ({b.code})</MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={runSearch} sx={{ borderRadius: 2 }}>
                Buscar
              </Button>
              <Button variant="outlined" sx={{ borderRadius: 2 }}
                onClick={() => { resetFilters(); fetchUsers(); }}>
                Limpiar
              </Button>
            </Stack>
          </Stack>
          {error && (
            <Typography variant="body2" sx={{ color: "error.main", mt: 1 }}>{error}</Typography>
          )}
        </Card>

        {/* ── Tabla ── */}
        <Card sx={{ borderRadius: 1, overflow: "hidden" }}>
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 1000 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>Usuario</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Cédula</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Sede</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Ingreso</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Rol</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Marcas</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                        <CircularProgress size={18} />
                        <Typography variant="body2">Cargando usuarios…</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography variant="body2" sx={{ py: 2, color: "text.secondary" }}>
                        No hay resultados con esos filtros.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : items.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 900, lineHeight: 1.1 }}>{u.full_name}</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>{u.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{u.document_number || "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{u.branch?.name || "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(u.hire_date)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={u?.role?.name || "—"} sx={{ fontWeight: 800 }} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small"
                        label={u.is_active ? "Activo" : "Inactivo"}
                        color={u.is_active ? "success" : "default"}
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
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider />

          <TablePagination
            component="div"
            count={total}
            page={(filters.page || 1) - 1}
            onPageChange={(_, newPage) => { setFilters({ page: newPage + 1 }); fetchUsers(); }}
            rowsPerPage={filters.limit || 10}
            onRowsPerPageChange={(e) => { setFilters({ limit: Number(e.target.value), page: 1 }); fetchUsers(); }}
            rowsPerPageOptions={[5, 10, 20, 50]}
          />
        </Card>

      </Stack>

      {/* ══════════════════════════════════════
           Dialog: Crear / Editar usuario
         ══════════════════════════════════════ */}
      <Dialog
        open={openForm}
        onClose={closeForm}
        fullWidth
        maxWidth="md"
        fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 1, overflow: "hidden" } }}
      >
        <DialogTitle sx={{
          px: 3, py: 2, fontWeight: 900,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2,
        }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
              {formMode === "create" ? "Nuevo usuario" : "Editar usuario"}
            </Typography>
            <Chip size="small"
              label={formMode === "create" ? "CREAR" : "EDITAR"}
              sx={{ fontWeight: 900 }}
            />
          </Stack>
          <Tooltip title="Cerrar">
            <IconButton onClick={closeForm} size="small"><CloseRoundedIcon /></IconButton>
          </Tooltip>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
          {!formUser ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2">Cargando…</Typography>
            </Stack>
          ) : (
            <Stack spacing={2.5} sx={{ pt: 0.5 }}>

              {/* ── Información personal ── */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1, bgcolor: "background.paper" }}>
                <Typography sx={{ fontWeight: 900, mb: 2 }}>Información del usuario</Typography>
                <Grid container spacing={2}>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Nombre completo *" fullWidth
                      value={formUser.full_name || ""}
                      onChange={(e) => setFormUser({ full_name: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Cédula / Documento *" fullWidth
                      placeholder="Ej: 1234567890"
                      value={formUser.document_number || ""}
                      onChange={(e) => setFormUser({ document_number: e.target.value })}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Email *" fullWidth type="email"
                      value={formUser.email || ""}
                      onChange={(e) => setFormUser({ email: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Teléfono" fullWidth
                      placeholder="Ej: 3001234567"
                      value={formUser.phone || ""}
                      onChange={(e) => setFormUser({ phone: e.target.value })}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label={formMode === "create" ? "Contraseña *" : "Contraseña (vacío = sin cambios)"}
                      fullWidth type="password"
                      value={formUser.password || ""}
                      onChange={(e) => setFormUser({ password: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Rol *" fullWidth select
                      value={formUser.role_id || ""}
                      onChange={(e) => setFormUser({ role_id: e.target.value })}>
                      <MenuItem value="">Selecciona…</MenuItem>
                      {roleOptions.map((r) => (
                        <MenuItem key={r.id} value={String(r.id)}>{r.name}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Sede" fullWidth select
                      value={formUser.branch_id || ""}
                      onChange={(e) => setFormUser({ branch_id: e.target.value })}>
                      <MenuItem value="">Sin sede asignada</MenuItem>
                      {branchOptions.map((br) => (
                        <MenuItem key={br.id} value={String(br.id)}>
                          {br.name}{br.code ? ` (${br.code})` : ""}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Fecha de ingreso" fullWidth type="date"
                      InputLabelProps={{ shrink: true }}
                      helperText="Usada para calcular antigüedad en reglas de comisión"
                      value={formUser.hire_date || ""}
                      onChange={(e) => setFormUser({ hire_date: e.target.value })}
                    />
                  </Grid>

                </Grid>
              </Paper>

              {/* ── Estado ── */}
              <Paper variant="outlined" sx={{
                p: 2.5, borderRadius: 1, bgcolor: "background.paper",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2,
              }}>
                <Box>
                  <Typography sx={{ fontWeight: 900 }}>Estado</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Controla si el usuario puede ingresar al sistema.
                  </Typography>
                </Box>
                <FormControlLabel sx={{ m: 0 }}
                  control={
                    <Switch
                      checked={!!formUser.is_active}
                      onChange={(e) => setFormUser({ is_active: e.target.checked })}
                    />
                  }
                  label={formUser.is_active ? "Activo" : "Inactivo"}
                />
              </Paper>

              {/* ── Permisos por marca ── */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1, bgcolor: "background.paper" }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}
                  alignItems={{ xs: "flex-start", md: "center" }}
                  justifyContent="space-between" sx={{ mb: 2 }}>
                  <Stack spacing={0.25}>
                    <Typography sx={{ fontWeight: 900 }}>Permisos por marca</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Define qué puede hacer este usuario dentro de cada marca.
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <FormControlLabel sx={{ m: 0 }}
                      control={<Switch onChange={(e) => applyAllPerms({ can_view: e.target.checked })} />}
                      label="Ver todas"
                    />
                    <FormControlLabel sx={{ m: 0 }}
                      control={<Switch onChange={(e) => applyAllPerms({ can_generate: e.target.checked })} />}
                      label="Generar todas"
                    />
                  </Stack>
                </Stack>

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
                  <TableContainer sx={{
                    borderRadius: 1, border: "1px solid", borderColor: "divider",
                    maxHeight: { xs: "55vh", md: 300 },
                  }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 900 }}>Marca</TableCell>
                          <TableCell sx={{ fontWeight: 900, width: 140 }} align="center">Ver</TableCell>
                          <TableCell sx={{ fontWeight: 900, width: 160 }} align="center">Generar</TableCell>
                          <TableCell sx={{ fontWeight: 900, width: 160 }} align="right">Estado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {formBrandsSelection.map((b) => {
                          const chip = permChip(b);
                          return (
                            <TableRow key={b.brand_id} hover>
                              <TableCell>
                                <Typography sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                                  {b.name}{" "}
                                  <Typography component="span"
                                    sx={{ color: "text.secondary", fontWeight: 700 }}>
                                    ({b.code})
                                  </Typography>
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Switch checked={!!b.can_view}
                                  onChange={(e) => setFormBrandPerm(b.brand_id, { can_view: e.target.checked })}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Switch checked={!!b.can_generate}
                                  onChange={(e) => setFormBrandPerm(b.brand_id, { can_generate: e.target.checked })}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Chip size="small" label={chip.label} color={chip.color}
                                  variant={chip.color === "default" ? "outlined" : "filled"}
                                  sx={{ fontWeight: 900 }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>

              {/* ── Error ── */}
              {error && (
                <Paper variant="outlined" sx={{
                  p: 2, borderRadius: 1,
                  borderColor: "error.main", bgcolor: "error.lighter",
                }}>
                  <Typography variant="body2" sx={{ color: "error.main" }}>{error}</Typography>
                </Paper>
              )}

            </Stack>
          )}
        </DialogContent>

        <Divider />

        <DialogActions sx={{
          px: 3, py: 2, display: "flex",
          justifyContent: "space-between", gap: 1.5, bgcolor: "background.paper",
        }}>
          <Button onClick={closeForm} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button onClick={submitForm} variant="contained"
            disabled={isSaving || !formUser}
            sx={{ fontWeight: 900, borderRadius: 2, px: 2.5 }}>
            {isSaving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}