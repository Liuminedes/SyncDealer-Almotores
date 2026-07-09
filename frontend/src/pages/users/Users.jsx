// frontend/src/pages/users/Users.jsx
// CAMBIOS: +botón "Importar asesores", +ImportDialog con dropzone, resumen y descarga de plantilla
import { useEffect, useMemo, useRef } from "react";
import {
  Box, Card, Typography, Stack, TextField, Button, Chip, IconButton,
  Tooltip, MenuItem, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, TablePagination, Dialog, DialogTitle, DialogContent,
  DialogActions, Divider, Switch, FormControlLabel, CircularProgress,
  useMediaQuery, Grid, Paper, Checkbox, LinearProgress, Alert,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import AddRoundedIcon              from "@mui/icons-material/AddRounded";
import EditRoundedIcon             from "@mui/icons-material/EditRounded";
import CloseRoundedIcon            from "@mui/icons-material/CloseRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import RefreshRoundedIcon          from "@mui/icons-material/RefreshRounded";
import CheckBoxOutlineBlankIcon    from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon                from "@mui/icons-material/CheckBox";
import UploadFileRoundedIcon       from "@mui/icons-material/UploadFileRounded";
import FileDownloadRoundedIcon     from "@mui/icons-material/FileDownloadRounded";
import InsertDriveFileRoundedIcon  from "@mui/icons-material/InsertDriveFileRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import GroupAddRoundedIcon         from "@mui/icons-material/GroupAddRounded";

import VacationsSection from "./VacationsSection";
import { useUsersStore } from "../../app/store/users.store";

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("es-CO", { timeZone: "UTC" }) : "—";

// ─── ImportDialog ─────────────────────────────────────────────────────────────
function ImportDialog() {
  const {
    openImportDialog, importFile, importFileName, isImporting, importResults,
    closeImport, setImportFile, clearImportFile, runImport, downloadUsersTemplate,
  } = useUsersStore();

  const fileInputRef = useRef(null);
  const hasResults   = !!importResults;
  const hasErrors    = (importResults?.errors?.length || 0) > 0;

  const handleDrop     = (e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) setImportFile(f); };
  const handleDragOver = (e) => e.preventDefault();
  const handleInput    = (e) => { const f = e.target.files?.[0]; if (f) setImportFile(f); e.target.value = ""; };

  return (
    <Dialog open={openImportDialog} onClose={closeImport} fullWidth maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 2, overflow: "hidden" } }}>

      <DialogTitle sx={{ px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <GroupAddRoundedIcon sx={{ color: "primary.main" }} />
          <Typography variant="h6" sx={{ fontWeight: 900 }}>Importar asesores desde Excel</Typography>
        </Stack>
        <IconButton onClick={closeImport} size="small"><CloseRoundedIcon /></IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
        <Stack spacing={2.5}>

          {!hasResults && (
            <Alert severity="info" sx={{ "& .MuiAlert-message": { fontSize: "0.8rem" } }}>
              Si el correo ya existe → se actualizan los datos. Si no existe → se crea con rol
              <strong> ADVISOR</strong> y contraseña igual a la cédula.
            </Alert>
          )}

          {/* Dropzone */}
          {!hasResults && (
            <Box
              onDrop={handleDrop} onDragOver={handleDragOver}
              onClick={() => !importFile && fileInputRef.current?.click()}
              sx={{
                border: "1.5px dashed",
                borderColor: importFile ? "success.main" : "divider",
                borderRadius: 2, p: 3, textAlign: "center",
                cursor: importFile ? "default" : "pointer",
                bgcolor: importFile ? "rgba(104,211,145,0.05)" : "background.paper",
                transition: "all .2s",
                "&:hover": !importFile ? { borderColor: "primary.main", bgcolor: "action.hover" } : {},
              }}>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls"
                style={{ display: "none" }} onChange={handleInput} />

              {!importFile ? (
                <Stack spacing={1} alignItems="center">
                  <UploadFileRoundedIcon sx={{ fontSize: 40, color: "text.disabled" }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Arrastra el Excel aquí o haz clic para seleccionarlo
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Formatos: .xlsx, .xls — Máx. 10 MB
                  </Typography>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
                  <InsertDriveFileRoundedIcon sx={{ color: "success.main", fontSize: 28 }} />
                  <Box sx={{ textAlign: "left" }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "success.main" }}>
                      {importFileName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Archivo listo para importar
                    </Typography>
                  </Box>
                  <Tooltip title="Cambiar archivo">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); clearImportFile(); }}>
                      <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )}
            </Box>
          )}

          {/* Progreso */}
          {isImporting && (
            <Box>
              <LinearProgress sx={{ borderRadius: 1 }} />
              <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
                Procesando archivo… puede tomar unos segundos.
              </Typography>
            </Box>
          )}

          {/* Resultados */}
          {hasResults && (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircleOutlineRoundedIcon sx={{ color: "success.main" }} />
                <Typography sx={{ fontWeight: 900 }}>Importación completada</Typography>
              </Stack>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1 }}>
                {[
                  { label: "Creados",      value: importResults.created, color: "#68d391", bg: "rgba(104,211,145,0.08)", border: "rgba(104,211,145,0.3)" },
                  { label: "Actualizados", value: importResults.updated, color: "#63b3ed", bg: "rgba(99,179,237,0.08)",  border: "rgba(99,179,237,0.3)"  },
                  { label: "Omitidos",     value: importResults.skipped, color: "text.secondary", bg: "rgba(160,160,160,0.08)", border: "rgba(160,160,160,0.2)" },
                ].map(({ label, value, color, bg, border }) => (
                  <Box key={label} sx={{ p: 1.5, borderRadius: 1.5, textAlign: "center", bgcolor: bg, border: `0.5px solid ${border}` }}>
                    <Typography sx={{ fontSize: "1.5rem", fontWeight: 900, color, lineHeight: 1 }}>{value}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>{label}</Typography>
                  </Box>
                ))}
              </Box>

              {hasErrors && (
                <Box sx={{ borderRadius: 1.5, border: "0.5px solid", borderColor: "warning.main",
                  bgcolor: "rgba(246,173,85,0.05)", p: 1.5, maxHeight: 200, overflowY: "auto" }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "warning.main", mb: 0.5, display: "block" }}>
                    Filas con problemas ({importResults.errors.length}):
                  </Typography>
                  {importResults.errors.map((e, i) => (
                    <Typography key={i} variant="caption"
                      sx={{ color: "text.secondary", display: "block", lineHeight: 1.8 }}>
                      Fila {e.row} — {e.nombre || "sin nombre"}: {e.error}
                    </Typography>
                  ))}
                </Box>
              )}

              <Button variant="outlined" size="small" sx={{ borderRadius: 2, alignSelf: "flex-start" }}
                onClick={() => { clearImportFile(); useUsersStore.setState({ importResults: null }); }}>
                Importar otro archivo
              </Button>
            </Stack>
          )}

          {/* Descarga plantilla */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            p: 1.25, borderRadius: 1.5, bgcolor: "background.paper",
            border: "0.5px solid", borderColor: "divider" }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>¿No tienes el formato correcto?</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Descarga la plantilla con columnas y filas de ejemplo.
              </Typography>
            </Box>
            <Button size="small" variant="outlined" startIcon={<FileDownloadRoundedIcon />}
              onClick={downloadUsersTemplate}
              sx={{ borderRadius: 2, whiteSpace: "nowrap", flexShrink: 0, ml: 1 }}>
              Descargar plantilla
            </Button>
          </Box>

        </Stack>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between", bgcolor: "background.paper" }}>
        <Button onClick={closeImport} variant="outlined" sx={{ borderRadius: 2 }}>
          {hasResults ? "Cerrar" : "Cancelar"}
        </Button>
        {!hasResults && (
          <Button onClick={runImport} variant="contained"
            disabled={!importFile || isImporting}
            sx={{ fontWeight: 900, borderRadius: 2 }}>
            {isImporting ? "Importando…" : "Importar asesores"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── Users (página principal) ─────────────────────────────────────────────────
export default function Users() {
  const {
    items, total, filters,
    roles, brands, branches,
    isLoading, isSaving, error,
    openForm, formMode, formUser, formBrandsSelection,
    openConfirmDelete, deleteTargetName, isDeleting,
    setFilters, resetFilters, hydrateMeta, fetchUsers,
    openCreate, openEdit, closeForm,
    setFormUser, toggleBrand, toggleAllBrands,
    submitForm, toggleStatus,
    promptDelete, cancelDelete, confirmDelete,
    openImport,
  } = useUsersStore();

  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    (async () => { await hydrateMeta(); await fetchUsers(); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleOptions   = useMemo(() => roles    || [], [roles]);
  const brandOptions  = useMemo(() => brands   || [], [brands]);
  const branchOptions = useMemo(() => branches || [], [branches]);

  const allAssigned  = formBrandsSelection?.every((b) => b.assigned) ?? false;
  const someAssigned = formBrandsSelection?.some((b) => b.assigned)  ?? false;

  const runSearch = async () => { setFilters({ page: 1 }); await fetchUsers(); };

  return (
    <Box sx={{ width: "100%" }}>
      <Stack spacing={2}>

        {/* Header */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}
          justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }}>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>Usuarios</Typography>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refrescar">
              <IconButton onClick={() => fetchUsers()}><RefreshRoundedIcon /></IconButton>
            </Tooltip>
            <Button onClick={openImport} variant="outlined"
              startIcon={<UploadFileRoundedIcon />}
              sx={{ borderRadius: 2, fontWeight: 700 }}>
              Importar asesores
            </Button>
            <Button onClick={openCreate} variant="contained"
              startIcon={<AddRoundedIcon />} sx={{ borderRadius: 2, fontWeight: 900 }}>
              Nuevo usuario
            </Button>
          </Stack>
        </Stack>

        {/* Filtros */}
        <Card sx={{ p: 2, borderRadius: 1 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}
            alignItems={{ xs: "stretch", md: "center" }}>
            <TextField label="Buscar" value={filters.q} size="small" sx={{ flex: 1 }}
              placeholder="Nombre, email o cédula…"
              onChange={(e) => setFilters({ q: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && runSearch()} />
            <TextField label="Rol" value={filters.role} size="small" select sx={{ minWidth: 180 }}
              onChange={(e) => setFilters({ role: e.target.value })}>
              <MenuItem value="">Todos</MenuItem>
              {roleOptions.map((r) => <MenuItem key={r.id} value={r.name}>{r.name}</MenuItem>)}
            </TextField>
            <TextField label="Estado" value={filters.status} size="small" select sx={{ minWidth: 150 }}
              onChange={(e) => setFilters({ status: e.target.value })}>
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="active">Activos</MenuItem>
              <MenuItem value="inactive">Inactivos</MenuItem>
            </TextField>
            <TextField label="Marca" value={filters.brand_id} size="small" select sx={{ minWidth: 180 }}
              onChange={(e) => setFilters({ brand_id: e.target.value })}>
              <MenuItem value="">Todas</MenuItem>
              {brandOptions.map((b) => <MenuItem key={b.id} value={String(b.id)}>{b.name} ({b.code})</MenuItem>)}
            </TextField>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={runSearch} sx={{ borderRadius: 2 }}>Buscar</Button>
              <Button variant="outlined" sx={{ borderRadius: 2 }}
                onClick={() => { resetFilters(); fetchUsers(); }}>Limpiar</Button>
            </Stack>
          </Stack>
        </Card>

        {/* Tabla */}
        <Card sx={{ borderRadius: 1, overflow: "hidden" }}>
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>Usuario</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Cédula</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Sede</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Ingreso</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Rol</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Marcas</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Estado</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                      <CircularProgress size={18} />
                      <Typography variant="body2">Cargando usuarios…</Typography>
                    </Stack>
                  </TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={8}>
                    <Typography variant="body2" sx={{ py: 2, color: "text.secondary" }}>
                      No hay resultados. Usa "Importar asesores" para carga masiva.
                    </Typography>
                  </TableCell></TableRow>
                ) : items.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box sx={{
                          width: 34, height: 34, borderRadius: "50%", bgcolor: "primary.main",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 900, fontSize: "0.7rem", color: "primary.contrastText", flexShrink: 0,
                        }}>
                          {(u.full_name || "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 900, lineHeight: 1.2, fontSize: "0.85rem" }}>
                            {u.full_name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>{u.email}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                        {u.document_number || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{u.branch?.name || "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(u.hire_date)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={u?.role?.name || "—"} sx={{ fontWeight: 800, fontSize: "0.7rem" }} />
                    </TableCell>
                    <TableCell>
                      {u.brands?.length ? (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                          {u.brands.slice(0, 3).map((b) => (
                            <Chip key={b.brand_id || b.id} size="small" label={b.code || b.name}
                              sx={{ fontWeight: 700, fontSize: "0.65rem",
                                bgcolor: "rgba(99,179,237,0.1)", color: "#63b3ed" }} />
                          ))}
                          {u.brands.length > 3 && (
                            <Chip size="small" label={`+${u.brands.length - 3}`} sx={{ fontWeight: 700, fontSize: "0.65rem" }} />
                          )}
                        </Stack>
                      ) : (
                        <Typography variant="caption" sx={{ color: "text.disabled" }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={u.is_active ? "Activo" : "Inactivo"}
                        color={u.is_active ? "success" : "default"}
                        sx={{ fontWeight: 800, fontSize: "0.7rem", opacity: u.is_active ? 1 : 0.7 }} />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => openEdit(u)}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={u.is_active ? "Desactivar" : "Activar"}>
                          <IconButton size="small" onClick={() => toggleStatus(u)}
                            sx={{ color: u.is_active ? "warning.main" : "success.main" }}>
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
          <TablePagination component="div" count={total}
            page={(filters.page || 1) - 1}
            onPageChange={(_, p) => { setFilters({ page: p + 1 }); fetchUsers(); }}
            rowsPerPage={filters.limit || 10}
            onRowsPerPageChange={(e) => { setFilters({ limit: Number(e.target.value), page: 1 }); fetchUsers(); }}
            rowsPerPageOptions={[5, 10, 20, 50]} />
        </Card>
      </Stack>

      {/* Dialog: Crear / Editar usuario */}
      <Dialog open={openForm} onClose={closeForm} fullWidth maxWidth="md"
        fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2, overflow: "hidden" } }}>
        <DialogTitle sx={{ px: 3, py: 2, fontWeight: 900,
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {formMode === "create" ? "Nuevo usuario" : "Editar usuario"}
            </Typography>
            <Chip size="small" label={formMode === "create" ? "CREAR" : "EDITAR"} sx={{ fontWeight: 900 }} />
          </Stack>
          <IconButton onClick={closeForm} size="small"><CloseRoundedIcon /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
          {!formUser ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 3 }}>
              <CircularProgress size={18} />
              <Typography variant="body2">Cargando…</Typography>
            </Stack>
          ) : (
            <Stack spacing={2.5} sx={{ pt: 0.5 }}>
              {/* Info personal */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: "background.paper" }}>
                <Typography sx={{ fontWeight: 900, mb: 2, fontSize: "0.85rem",
                  textTransform: "uppercase", letterSpacing: 1, color: "text.secondary" }}>
                  Información del usuario
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField label="Nombre completo *" fullWidth value={formUser.full_name || ""}
                      onChange={(e) => setFormUser({ full_name: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Cédula / Documento" fullWidth value={formUser.document_number || ""}
                      onChange={(e) => setFormUser({ document_number: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Email *" fullWidth type="email" value={formUser.email || ""}
                      onChange={(e) => setFormUser({ email: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Teléfono" fullWidth value={formUser.phone || ""}
                      onChange={(e) => setFormUser({ phone: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label={formMode === "create" ? "Contraseña *" : "Contraseña (vacío = sin cambios)"}
                      fullWidth type="password" value={formUser.password || ""}
                      onChange={(e) => setFormUser({ password: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Rol *" fullWidth select value={formUser.role_id || ""}
                      onChange={(e) => setFormUser({ role_id: e.target.value })}>
                      <MenuItem value="">Selecciona…</MenuItem>
                      {roleOptions.map((r) => <MenuItem key={r.id} value={String(r.id)}>{r.name}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Sede" fullWidth select value={formUser.branch_id || ""}
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
                    <TextField label="Fecha de ingreso" fullWidth type="date"
                      InputLabelProps={{ shrink: true }}
                      helperText="Para cálculo de antigüedad en comisiones"
                      value={formUser.hire_date || ""}
                      onChange={(e) => setFormUser({ hire_date: e.target.value })} />
                  </Grid>
                </Grid>
              </Paper>

              {/* Marcas — checkboxes simples */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: "background.paper" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 900, mb: 0.25, fontSize: "0.85rem",
                      textTransform: "uppercase", letterSpacing: 1, color: "text.secondary" }}>
                      Marcas asignadas
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Los permisos los controla el rol.
                    </Typography>
                  </Box>
                  {formBrandsSelection && formBrandsSelection.length > 1 && (
                    <Tooltip title={allAssigned ? "Quitar todas" : "Asignar todas"}>
                      <Checkbox
                        checked={allAssigned}
                        indeterminate={someAssigned && !allAssigned}
                        onChange={(e) => toggleAllBrands(e.target.checked)}
                        icon={<CheckBoxOutlineBlankIcon />}
                        checkedIcon={<CheckBoxIcon />}
                        size="small"
                      />
                    </Tooltip>
                  )}
                </Stack>

                {formBrandsSelection === null ? (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>Cargando marcas…</Typography>
                  </Stack>
                ) : formBrandsSelection.length === 0 ? (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>No hay marcas configuradas.</Typography>
                ) : (
                  <Stack spacing={0.5}>
                    {formBrandsSelection.map((b) => (
                      <Box key={b.brand_id} onClick={() => toggleBrand(b.brand_id)}
                        sx={{
                          display: "flex", alignItems: "center", gap: 1.5,
                          px: 1.5, py: 1, borderRadius: 1.5, cursor: "pointer",
                          border: "0.5px solid",
                          borderColor: b.assigned ? "rgba(99,179,237,0.4)" : "divider",
                          bgcolor: b.assigned ? "rgba(99,179,237,0.06)" : "transparent",
                          transition: "all .15s",
                          "&:hover": { bgcolor: b.assigned ? "rgba(99,179,237,0.1)" : "action.hover" },
                        }}>
                        <Checkbox checked={!!b.assigned} onChange={() => toggleBrand(b.brand_id)}
                          onClick={(e) => e.stopPropagation()} size="small"
                          sx={{ p: 0, color: b.assigned ? "#63b3ed" : "text.disabled",
                            "&.Mui-checked": { color: "#63b3ed" } }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem",
                            color: b.assigned ? "text.primary" : "text.secondary" }}>
                            {b.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>{b.code}</Typography>
                        </Box>
                        {b.assigned && (
                          <Chip size="small" label="Asignada" sx={{ fontWeight: 700, fontSize: "0.65rem",
                            bgcolor: "rgba(104,211,145,0.1)", color: "#68d391" }} />
                        )}
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>

              {/* Estado */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: "background.paper",
                display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography sx={{ fontWeight: 900 }}>Estado</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Controla si el usuario puede ingresar al sistema.
                  </Typography>
                </Box>
                <FormControlLabel sx={{ m: 0 }}
                  control={<Switch checked={!!formUser.is_active}
                    onChange={(e) => setFormUser({ is_active: e.target.checked })} />}
                  label={<Chip size="small" label={formUser.is_active ? "Activo" : "Inactivo"}
                    color={formUser.is_active ? "success" : "default"} sx={{ fontWeight: 700, fontSize: "0.7rem" }} />}
                />
              </Paper>

              {/* Vacaciones (solo edición + ADVISOR) */}
              {formMode === "edit" && formUser?.id && (
                <VacationsSection advisorId={formUser.id} />
              )}

              {error && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, borderColor: "error.main",
                  bgcolor: "rgba(252,129,129,0.06)" }}>
                  <Typography variant="body2" sx={{ color: "error.main" }}>{error}</Typography>
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between", bgcolor: "background.paper" }}>
          <Button onClick={closeForm} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button onClick={submitForm} variant="contained" disabled={isSaving || !formUser}
            sx={{ fontWeight: 900, borderRadius: 2, px: 3 }}>
            {isSaving ? "Guardando…" : formMode === "create" ? "Crear usuario" : "Guardar cambios"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Confirmar desactivar */}
      <Dialog open={openConfirmDelete} onClose={cancelDelete} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 900, px: 3, py: 2 }}>¿Desactivar usuario?</DialogTitle>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            <strong>{deleteTargetName}</strong> quedará inactivo y no podrá ingresar al sistema.
            Puedes reactivarlo en cualquier momento.
          </Typography>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Button onClick={cancelDelete} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button onClick={confirmDelete} variant="contained" color="error"
            disabled={isDeleting} sx={{ fontWeight: 900, borderRadius: 2 }}>
            {isDeleting ? "Procesando…" : "Sí, desactivar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Importar Excel */}
      <ImportDialog />
    </Box>
  );
}
