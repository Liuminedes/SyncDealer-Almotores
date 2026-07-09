// frontend/src/pages/vehicles/Vehicles.jsx
// CAMBIOS: +botón "Importar Excel", +ImportDialog con dropzone, resumen y descarga de plantilla
import { useEffect, useMemo, useRef } from "react";
import {
  Box, Card, Typography, Stack, TextField, Button, Chip, IconButton, Tooltip,
  MenuItem, Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  TablePagination, Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, Switch, FormControlLabel, CircularProgress, Grid, Paper,
  LinearProgress, Alert,
} from "@mui/material";

import AddRoundedIcon                from "@mui/icons-material/AddRounded";
import EditRoundedIcon               from "@mui/icons-material/EditRounded";
import CloseRoundedIcon              from "@mui/icons-material/CloseRounded";
import PowerSettingsNewRoundedIcon   from "@mui/icons-material/PowerSettingsNewRounded";
import RefreshRoundedIcon            from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon             from "@mui/icons-material/SearchRounded";
import UploadFileRoundedIcon         from "@mui/icons-material/UploadFileRounded";
import FileDownloadRoundedIcon       from "@mui/icons-material/FileDownloadRounded";
import InsertDriveFileRoundedIcon    from "@mui/icons-material/InsertDriveFileRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";

import { useVehiclesStore } from "../../app/store/vehicles.store";
import { usePermissions }   from "../../app/hooks/usePermissions";

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency", currency: "COP", maximumFractionDigits: 0,
});

// ─── ImportDialog ─────────────────────────────────────────────────────────────
function ImportDialog() {
  const {
    openImportDialog, importFile, importFileName, isImporting, importResults,
    filters, closeImport, setImportFile, clearImportFile, runImport, downloadTemplate,
  } = useVehiclesStore();

  const fileInputRef = useRef(null);
  const brandId      = filters.brand_id ? Number(filters.brand_id) : null;
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
          <UploadFileRoundedIcon sx={{ color: "primary.main" }} />
          <Typography variant="h6" sx={{ fontWeight: 900 }}>Importar vehículos desde Excel</Typography>
        </Stack>
        <IconButton onClick={closeImport} size="small"><CloseRoundedIcon /></IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
        <Stack spacing={2.5}>

          {/* Aviso de marca */}
          {!brandId && (
            <Alert severity="warning" sx={{ fontSize: "0.8rem" }}>
              Selecciona una marca en los filtros antes de importar.
            </Alert>
          )}
          {brandId && !hasResults && (
            <Alert severity="info" sx={{ "& .MuiAlert-message": { fontSize: "0.8rem" } }}>
              Los vehículos se importarán a la marca seleccionada. Si el código ya existe se actualiza,
              si no existe se crea. El precio comercial no se toca en este proceso.
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
                Procesando archivo… puede tomar unos segundos según el tamaño.
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
                  { label: "Creados",      value: importResults.created,  color: "#68d391", bg: "rgba(104,211,145,0.08)", border: "rgba(104,211,145,0.3)" },
                  { label: "Actualizados", value: importResults.updated,  color: "#63b3ed", bg: "rgba(99,179,237,0.08)",  border: "rgba(99,179,237,0.3)"  },
                  { label: "Omitidos",     value: importResults.skipped,  color: "text.secondary", bg: "rgba(160,160,160,0.08)", border: "rgba(160,160,160,0.2)" },
                ].map(({ label, value, color, bg, border }) => (
                  <Box key={label} sx={{ p: 1.5, borderRadius: 1.5, textAlign: "center", bgcolor: bg, border: `0.5px solid ${border}` }}>
                    <Typography sx={{ fontSize: "1.5rem", fontWeight: 900, color, lineHeight: 1 }}>{value}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>{label}</Typography>
                  </Box>
                ))}
              </Box>

              {hasErrors && (
                <Box sx={{ borderRadius: 1.5, border: "0.5px solid", borderColor: "warning.main",
                  bgcolor: "rgba(246,173,85,0.05)", p: 1.5, maxHeight: 180, overflowY: "auto" }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "warning.main", mb: 0.5, display: "block" }}>
                    Filas con problemas ({importResults.errors.length}):
                  </Typography>
                  {importResults.errors.map((e, i) => (
                    <Typography key={i} variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.8 }}>
                      Fila {e.row} — {e.code || "sin código"}: {e.error}
                    </Typography>
                  ))}
                </Box>
              )}

              <Button variant="outlined" size="small" sx={{ borderRadius: 2, alignSelf: "flex-start" }}
                onClick={() => { clearImportFile(); useVehiclesStore.setState({ importResults: null }); }}>
                Importar otro archivo
              </Button>
            </Stack>
          )}

          {/* Descarga de plantilla */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            p: 1.25, borderRadius: 1.5, bgcolor: "background.paper",
            border: "0.5px solid", borderColor: "divider" }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>¿No tienes el formato correcto?</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Descarga la plantilla con las columnas y datos de ejemplo.
              </Typography>
            </Box>
            <Button size="small" variant="outlined" startIcon={<FileDownloadRoundedIcon />}
              onClick={downloadTemplate} sx={{ borderRadius: 2, whiteSpace: "nowrap", flexShrink: 0, ml: 1 }}>
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
            disabled={!importFile || isImporting || !brandId}
            sx={{ fontWeight: 900, borderRadius: 2 }}>
            {isImporting ? "Importando…" : "Importar vehículos"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── Vehicles (página principal) ─────────────────────────────────────────────
export default function Vehicles() {
  const {
    items, total, filters, brands,
    isLoading, isSaving, error,
    openForm, formMode, formVehicle,
    tiersPct, tiersLoading, autoCalcRates,
    setFilters, resetFilters, hydrateMeta, fetchVehicles,
    openCreate, openEdit, closeForm, setFormVehicle, setRate, submitForm, toggleStatus,
    recalcRatesFromPrice, setSalePrice, setBrandId,
    openImport,
  } = useVehiclesStore();

  const perms        = usePermissions();
  const canWrite     = perms.is?.admin || perms.is?.brandOp;
  const brandOptions = useMemo(() => brands || [], [brands]);
  const tierKeys     = useMemo(() => Object.keys(tiersPct).sort(), [tiersPct]);

  const visibleTierCols = useMemo(() => {
    const cols = new Set();
    items.forEach((v) => Object.keys(v.rates || {}).forEach((k) => {
      if (/^TABLA_\d+$/.test(k) && v.rates[k] != null) cols.add(k);
    }));
    return Array.from(cols).sort();
  }, [items]);

  useEffect(() => {
    (async () => { await hydrateMeta(); await fetchVehicles(); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!openForm || !formVehicle?.brand_id) return;
    (async () => {
      const { ensureTierPercents } = useVehiclesStore.getState();
      await ensureTierPercents(formVehicle.brand_id);
      recalcRatesFromPrice();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openForm, formVehicle?.brand_id]);

  return (
    <Box sx={{ width: "100%" }}>
      <Stack spacing={2}>

        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>Vehículos</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Catálogo de vehículos y comisiones por tabla
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refrescar">
              <IconButton onClick={() => fetchVehicles()}><RefreshRoundedIcon /></IconButton>
            </Tooltip>
            {canWrite && (
              <>
                <Button onClick={openImport} variant="outlined"
                  startIcon={<UploadFileRoundedIcon />}
                  sx={{ borderRadius: 2, fontWeight: 700 }}>
                  Importar Excel
                </Button>
                <Button onClick={openCreate} variant="contained"
                  startIcon={<AddRoundedIcon />} sx={{ borderRadius: 2, fontWeight: 900 }}>
                  Agregar vehículo
                </Button>
              </>
            )}
          </Stack>
        </Stack>

        {/* Filtros */}
        <Card sx={{ p: 2, borderRadius: 1 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="flex-end">
            <TextField label="Marca" value={filters.brand_id}
              onChange={(e) => setFilters({ brand_id: e.target.value })}
              size="small" select sx={{ minWidth: 200 }}>
              {brandOptions.map((b) => (
                <MenuItem key={b.id} value={String(b.id)}>{b.name} ({b.code})</MenuItem>
              ))}
            </TextField>
            <TextField label="Buscar" value={filters.q}
              onChange={(e) => setFilters({ q: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && fetchVehicles()}
              size="small" sx={{ minWidth: 220 }}
              InputProps={{ startAdornment: <SearchRoundedIcon fontSize="small" sx={{ mr: 0.5, color: "text.secondary" }} /> }} />
            <TextField label="Estado" value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value })}
              size="small" select sx={{ minWidth: 140 }}>
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="active">Activos</MenuItem>
              <MenuItem value="inactive">Inactivos</MenuItem>
            </TextField>
            <Button variant="contained" onClick={() => fetchVehicles()} sx={{ borderRadius: 2 }}>Buscar</Button>
            <Button variant="outlined" onClick={() => { resetFilters(); fetchVehicles(); }} sx={{ borderRadius: 2 }}>Limpiar</Button>
          </Stack>
        </Card>

        {/* Tabla de vehículos */}
        <Card sx={{ borderRadius: 1, overflow: "hidden" }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>Código</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Modelo</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Versión</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Año</TableCell>
                  {visibleTierCols.map((key) => (
                    <TableCell key={key} sx={{ fontWeight: 900 }} align="right">
                      {key.replace("_", " ")}
                    </TableCell>
                  ))}
                  <TableCell sx={{ fontWeight: 900 }} align="center">Estado</TableCell>
                  <TableCell sx={{ fontWeight: 900, width: 100 }} align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6 + visibleTierCols.length}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                      <CircularProgress size={18} />
                      <Typography variant="body2">Cargando vehículos…</Typography>
                    </Stack>
                  </TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={6 + visibleTierCols.length}>
                    <Typography variant="body2" sx={{ py: 2, color: "text.secondary" }}>
                      No hay vehículos. Usa "Importar Excel" para carga masiva.
                    </Typography>
                  </TableCell></TableRow>
                ) : items.map((v) => (
                  <TableRow key={v.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 900, fontFamily: "monospace", fontSize: "0.78rem" }}>
                        {v.code}
                      </Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2">{v.model}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ color: "text.secondary" }}>{v.version}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{v.model_year || "—"}</Typography></TableCell>
                    {visibleTierCols.map((key) => (
                      <TableCell key={key} align="right">
                        <Typography variant="body2" sx={{ color: "#f6ad55", fontWeight: 700, fontFamily: "monospace", fontSize: "0.8rem" }}>
                          {v.rates?.[key] != null ? COP.format(Number(v.rates[key])) : "—"}
                        </Typography>
                      </TableCell>
                    ))}
                    <TableCell align="center">
                      <Chip size="small" label={v.is_active ? "Activo" : "Inactivo"}
                        color={v.is_active ? "success" : "default"}
                        sx={{ fontWeight: 700, fontSize: "0.65rem" }} />
                    </TableCell>
                    <TableCell align="right">
                      {canWrite && (
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => openEdit(v)}>
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={v.is_active ? "Desactivar" : "Activar"}>
                            <IconButton size="small" onClick={() => toggleStatus(v)}
                              sx={{ color: v.is_active ? "warning.main" : "success.main" }}>
                              <PowerSettingsNewRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Divider />
          <TablePagination component="div" count={total}
            page={(filters.page || 1) - 1}
            onPageChange={(_, p) => { setFilters({ page: p + 1 }); fetchVehicles(); }}
            rowsPerPage={filters.limit || 10}
            onRowsPerPageChange={(e) => { setFilters({ limit: Number(e.target.value), page: 1 }); fetchVehicles(); }}
            rowsPerPageOptions={[5, 10, 20, 50]} />
        </Card>
      </Stack>

      {/* Dialog: Crear / Editar vehículo */}
      <Dialog open={openForm} onClose={closeForm} fullWidth maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 2, overflow: "hidden" } }}>
        <DialogTitle sx={{ px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {formMode === "create" ? "Agregar vehículo" : "Editar vehículo"}
            </Typography>
            <Chip size="small" label={formMode === "create" ? "CREAR" : "EDITAR"} sx={{ fontWeight: 900 }} />
          </Stack>
          <IconButton onClick={closeForm} size="small"><CloseRoundedIcon /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
          {!formVehicle ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2">Cargando…</Typography>
            </Stack>
          ) : (
            <Stack spacing={2.5} sx={{ pt: 0.5 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1, bgcolor: "background.paper" }}>
                <Typography sx={{ fontWeight: 900, mb: 2 }}>Información del vehículo</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField label="Marca" value={String(formVehicle.brand_id ?? 6)}
                      onChange={(e) => setBrandId(e.target.value)} select fullWidth>
                      {brandOptions.map((b) => (
                        <MenuItem key={b.id} value={String(b.id)}>{b.name} ({b.code})</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Código" value={formVehicle.code}
                      onChange={(e) => setFormVehicle({ code: e.target.value })}
                      fullWidth disabled={formMode === "edit"}
                      helperText={formMode === "edit" ? "El código no se puede modificar" : ""} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Modelo" value={formVehicle.model}
                      onChange={(e) => setFormVehicle({ model: e.target.value })} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Versión" value={formVehicle.version}
                      onChange={(e) => setFormVehicle({ version: e.target.value })} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Año modelo" value={formVehicle.model_year}
                      onChange={(e) => setFormVehicle({ model_year: e.target.value })} type="number" fullWidth />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Precio venta (COP)" value={formVehicle.sale_price}
                      onChange={(e) => setSalePrice(e.target.value)} type="number" fullWidth />
                  </Grid>
                </Grid>
              </Paper>

              {/* Tablas de comisión — dinámicas */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1, bgcolor: "background.paper" }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}
                  alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between" sx={{ mb: 2 }}>
                  <Stack spacing={0.25}>
                    <Typography sx={{ fontWeight: 900 }}>Valores por Tabla</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {tierKeys.length > 0
                        ? `${tierKeys.length} tablas configuradas para esta marca`
                        : "Cargando tablas del scheme activo…"}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <FormControlLabel sx={{ m: 0 }}
                      control={<Switch checked={!!autoCalcRates}
                        onChange={(e) => {
                          useVehiclesStore.setState({ autoCalcRates: e.target.checked });
                          if (e.target.checked) recalcRatesFromPrice();
                        }} />}
                      label="Autocalcular" />
                    {tiersLoading && <CircularProgress size={16} />}
                  </Stack>
                </Stack>

                {tierKeys.length === 0 ? (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
                    {tiersLoading
                      ? <><CircularProgress size={16} /><Typography variant="body2" sx={{ color: "text.secondary" }}>Cargando tablas…</Typography></>
                      : <Typography variant="body2" sx={{ color: "text.secondary" }}>No hay tablas configuradas para esta marca.</Typography>
                    }
                  </Stack>
                ) : (
                  <Grid container spacing={2}>
                    {tierKeys.map((key) => (
                      <Grid item xs={12} md={Math.max(3, Math.floor(12 / Math.min(tierKeys.length, 4)))} key={key}>
                        <Stack spacing={0.8}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography sx={{ fontWeight: 700 }}>{key.replace("_", " ")}</Typography>
                            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                              {tiersLoading ? "…" : `${tiersPct?.[key] ?? "—"}%`}
                            </Typography>
                          </Stack>
                          <TextField value={formVehicle.rates?.[key] ?? ""}
                            onChange={(e) => setRate(key, e.target.value)}
                            type="number" fullWidth size="small"
                            disabled={!!autoCalcRates} placeholder="Valor comisión" />
                        </Stack>
                      </Grid>
                    ))}
                  </Grid>
                )}
                <Typography variant="caption" sx={{ color: "text.secondary", mt: 1.5, display: "block" }}>
                  Tip: si no aplica una tabla para este vehículo, deja 0.
                </Typography>
              </Paper>

              <Paper variant="outlined"
                sx={{ p: 2.5, borderRadius: 1, bgcolor: "background.paper", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography sx={{ fontWeight: 900 }}>Estado</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Controla si aparece disponible en el catálogo.
                  </Typography>
                </Box>
                <FormControlLabel sx={{ m: 0 }}
                  control={<Switch checked={!!formVehicle.is_active}
                    onChange={(e) => setFormVehicle({ is_active: e.target.checked })} />}
                  label={formVehicle.is_active ? "Activo" : "Inactivo"} />
              </Paper>

              {error && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, borderColor: "error.main" }}>
                  <Typography variant="body2" sx={{ color: "error.main" }}>{error}</Typography>
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Button onClick={closeForm} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button onClick={submitForm} variant="contained" disabled={isSaving || !formVehicle}
            sx={{ fontWeight: 900, borderRadius: 2 }}>
            {isSaving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Importar Excel */}
      <ImportDialog />
    </Box>
  );
}
