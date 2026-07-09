// frontend/src/pages/sales/Sales.jsx
// CAMBIOS: checkboxes de selección múltiple + barra de acciones + dialogs de eliminación masiva
import { useEffect, useMemo } from "react";
import {
  Box, Card, Typography, Stack, TextField, Button, IconButton, Tooltip,
  MenuItem, Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  TablePagination, Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, CircularProgress, Grid, Paper, Chip, Alert, Checkbox, Collapse,
} from "@mui/material";

import WarningAmberRoundedIcon  from "@mui/icons-material/WarningAmberRounded";
import AddRoundedIcon           from "@mui/icons-material/AddRounded";
import EditRoundedIcon          from "@mui/icons-material/EditRounded";
import CloseRoundedIcon         from "@mui/icons-material/CloseRounded";
import RefreshRoundedIcon       from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon        from "@mui/icons-material/SearchRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DeleteSweepRoundedIcon   from "@mui/icons-material/DeleteSweepRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";

import { useSalesStore }  from "../../app/store/sales.store";
import SalesImportDialog from "./SalesImportDialog";
import { useAuthStore }   from "../../app/store/auth.store";
import { usePermissions } from "../../app/hooks/usePermissions";

export const MONTHS = [
  { value: 1,  label: "Enero"      }, { value: 2,  label: "Febrero"    },
  { value: 3,  label: "Marzo"      }, { value: 4,  label: "Abril"      },
  { value: 5,  label: "Mayo"       }, { value: 6,  label: "Junio"      },
  { value: 7,  label: "Julio"      }, { value: 8,  label: "Agosto"     },
  { value: 9,  label: "Septiembre" }, { value: 10, label: "Octubre"    },
  { value: 11, label: "Noviembre"  }, { value: 12, label: "Diciembre"  },
];

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const formatDate = (d) => d ? new Date(d).toLocaleDateString("es-CO", { timeZone: "UTC" }) : "—";

const STATUS_LABELS = {
  DRAFT: "Borrador", CALCULATED: "Calculada",
  ADVISOR_APPROVED: "Aprobada por asesor", ADVISOR_REJECTED: "Rechazada",
  ASST_VALIDATED: "Validada", SENT_TO_HR: "Enviada a RRHH",
};

export default function Sales() {
  const {
    items, total, filters, brands, vehicles, advisors,
    isLoading, isSaving, isDeleting, error,
    openForm, formMode, formSale,
    selected,
    openConfirmDelete, openForceDelete, forceDeleteMessage, forceDeleteStatus,
    openConfirmBulk, openForceBulk, forceBulkSkipped, forceBulkMessage,
    setFilters, resetFilters, hydrateMeta, fetchSales,
    openCreate, openEdit, closeForm, setFormSale, submitForm,
    toggleSelect, toggleSelectAll, clearSelection,
    promptDelete, cancelDelete, confirmDelete,
    cancelForceDelete, confirmForceDelete,
    promptBulkDelete, cancelBulkDelete, confirmBulkDelete,
    cancelForceBulk, confirmForceBulk,
    openImport,
  } = useSalesStore();

  const { user }  = useAuthStore();
  const perms     = usePermissions();
  const isAdvisor = String(user?.role || "").toUpperCase() === "ADVISOR";
  const canWrite  = perms.is?.admin || perms.is?.brandOp;

  useEffect(() => {
    (async () => { await hydrateMeta(); await fetchSales(); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const brandOptions   = useMemo(() => brands   || [], [brands]);
  const vehicleOptions = useMemo(() => vehicles || [], [vehicles]);
  const advisorOptions = useMemo(() => advisors || [], [advisors]);

  const allSelected  = items.length > 0 && items.every((i) => selected.has(i.id));
  const someSelected = items.some((i) => selected.has(i.id));
  const selectedCount = selected.size;

  return (
    <Box sx={{ width: "100%" }}>
      <Stack spacing={2}>

        {/* Header */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}
          justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>Ventas</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Registro de ventas por asesor y período
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refrescar">
              <IconButton onClick={() => fetchSales()}><RefreshRoundedIcon /></IconButton>
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
                  Registrar venta
                </Button>
              </>
            )}
          </Stack>
        </Stack>

        {/* Filtros */}
        <Card sx={{ p: 2, borderRadius: 1 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} flexWrap="wrap"
            alignItems={{ xs: "stretch", md: "center" }}>
            <TextField label="Buscar" value={filters.q} size="small" sx={{ minWidth: 220 }}
              placeholder="Factura, cliente, placa…"
              InputProps={{ startAdornment: <SearchRoundedIcon fontSize="small" sx={{ mr: 0.5, color: "text.secondary" }} /> }}
              onChange={(e) => setFilters({ q: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && fetchSales()} />
            {!isAdvisor && (
              <TextField label="Marca" value={filters.brand_id} size="small" select sx={{ minWidth: 180 }}
                onChange={(e) => { setFilters({ brand_id: e.target.value }); fetchSales(); }}>
                {brandOptions.map((b) => (
                  <MenuItem key={b.id} value={String(b.id)}>{b.name} ({b.code})</MenuItem>
                ))}
              </TextField>
            )}
            {!isAdvisor && (
              <TextField label="Asesor" value={filters.advisor_id || ""} size="small" select sx={{ minWidth: 220 }}
                onChange={(e) => { setFilters({ advisor_id: e.target.value }); fetchSales(); }}>
                <MenuItem value="">Todos los asesores</MenuItem>
                <MenuItem value="none">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "warning.main", flexShrink: 0 }} />
                    Sin asesor asignado
                  </Box>
                </MenuItem>
                {advisorOptions.map((u) => (
                  <MenuItem key={u.id} value={String(u.id)}>{u.full_name}</MenuItem>
                ))}
              </TextField>
            )}
            <TextField label="Desde" value={filters.date_from} size="small" type="date"
              InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }}
              onChange={(e) => setFilters({ date_from: e.target.value })} />
            <TextField label="Hasta" value={filters.date_to} size="small" type="date"
              InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }}
              onChange={(e) => setFilters({ date_to: e.target.value })} />
            <Button variant="contained" onClick={() => fetchSales()} sx={{ borderRadius: 2 }}>Buscar</Button>
            <Button variant="outlined" sx={{ borderRadius: 2 }}
              onClick={() => { resetFilters(); fetchSales(); }}>Limpiar</Button>
          </Stack>
        </Card>

        {/* Barra de acciones masivas — aparece cuando hay selección */}
        <Collapse in={someSelected && canWrite}>
          <Card sx={{
            p: 1.5, borderRadius: 1,
            bgcolor: "rgba(252,129,129,0.06)",
            border: "1px solid rgba(252,129,129,0.25)",
          }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Chip
                  size="small"
                  label={`${selectedCount} venta${selectedCount !== 1 ? "s" : ""} seleccionada${selectedCount !== 1 ? "s" : ""}`}
                  sx={{ fontWeight: 900, bgcolor: "rgba(252,129,129,0.15)", color: "#fc8181" }}
                />
                <Button size="small" variant="text"
                  sx={{ color: "text.secondary", fontSize: "0.75rem" }}
                  onClick={clearSelection}>
                  Deseleccionar todas
                </Button>
              </Stack>
              <Button
                variant="contained" color="error" size="small"
                startIcon={<DeleteSweepRoundedIcon />}
                onClick={promptBulkDelete}
                disabled={isDeleting}
                sx={{ fontWeight: 900, borderRadius: 2 }}>
                Eliminar {selectedCount} seleccionada{selectedCount !== 1 ? "s" : ""}
              </Button>
            </Stack>
          </Card>
        </Collapse>

        {/* Tabla */}
        <Card sx={{ borderRadius: 1, overflow: "hidden" }}>
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  {/* Checkbox maestro — solo para usuarios con permisos de escritura */}
                  {canWrite && (
                    <TableCell padding="checkbox" sx={{ width: 48 }}>
                      <Checkbox
                        size="small"
                        checked={allSelected}
                        indeterminate={someSelected && !allSelected}
                        onChange={toggleSelectAll}
                        disabled={items.length === 0}
                      />
                    </TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 900 }}>Factura</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Fecha</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Cliente</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Placa</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Vehículo</TableCell>
                  {!isAdvisor && <TableCell sx={{ fontWeight: 900 }}>Asesor</TableCell>}
                  <TableCell sx={{ fontWeight: 900 }}>Período</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, width: 90 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={canWrite ? 9 : 8}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                        <CircularProgress size={18} />
                        <Typography variant="body2">Cargando ventas…</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canWrite ? 9 : 8}>
                      <Typography variant="body2" sx={{ py: 2, color: "text.secondary" }}>
                        No hay ventas con esos filtros.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : items.map((s) => {
                  const isSelected = selected.has(s.id);
                  return (
                    <TableRow key={s.id} hover
                      selected={isSelected}
                      sx={{ "&.Mui-selected": { bgcolor: "rgba(252,129,129,0.05)" } }}>
                      {canWrite && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={isSelected}
                            onChange={() => toggleSelect(s.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Typography sx={{ fontWeight: 900, color: "#63b3ed", fontSize: "0.82rem" }}>
                          {s.invoice || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDate(s.sale_date)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.client_name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "inline-block", px: 1, py: 0.25, borderRadius: 1,
                          bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
                          <Typography sx={{ fontWeight: 800, fontSize: "0.75rem", letterSpacing: 1 }}>
                            {s.plate || "—"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {s.vehicle?.model || "—"}{" "}
                          <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
                            {s.vehicle?.version || ""}
                          </Typography>
                        </Typography>
                      </TableCell>
                      {!isAdvisor && (
                        <TableCell>
                          <Typography variant="body2">{s.advisor?.full_name || "—"}</Typography>
                        </TableCell>
                      )}
                      <TableCell>
                        <Chip size="small"
                          label={`${s.cut_month ? MONTHS.find((m) => m.value === s.cut_month)?.label || s.cut_month : "—"} ${s.cut_year || ""} ${s.fortnight === "FIRST" ? "1ra" : s.fortnight === "SECOND" ? "2da" : ""}`}
                          sx={{ fontWeight: 700, fontSize: "0.65rem" }} />
                      </TableCell>
                      <TableCell align="right">
                        {canWrite && (
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="Editar">
                              <IconButton size="small" onClick={() => openEdit(s)}>
                                <EditRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton size="small" onClick={() => promptDelete(s.id)}
                                sx={{ color: "error.main" }}>
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Divider />
          <TablePagination component="div" count={total}
            page={(filters.page || 1) - 1}
            onPageChange={(_, p) => { setFilters({ page: p + 1 }); fetchSales(); }}
            rowsPerPage={filters.limit || 10}
            onRowsPerPageChange={(e) => { setFilters({ limit: Number(e.target.value), page: 1 }); fetchSales(); }}
            rowsPerPageOptions={[5, 10, 20, 50]} />
        </Card>
      </Stack>

      {/* ── Dialog: Crear / Editar ── */}
      <Dialog open={openForm} onClose={closeForm} fullWidth maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 2, overflow: "hidden" } }}>
        <DialogTitle sx={{ px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {formMode === "create" ? "Registrar venta" : "Editar venta"}
            </Typography>
            <Chip size="small" label={formMode === "create" ? "NUEVA" : "EDITAR"} sx={{ fontWeight: 900 }} />
          </Stack>
          <IconButton onClick={closeForm} size="small"><CloseRoundedIcon /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
          {!formSale ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 3 }}>
              <CircularProgress size={18} /><Typography variant="body2">Cargando…</Typography>
            </Stack>
          ) : (
            <Stack spacing={2.5} sx={{ pt: 0.5 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: "background.paper" }}>
                <Typography sx={{ fontWeight: 900, mb: 2, fontSize: "0.8rem",
                  textTransform: "uppercase", letterSpacing: 1, color: "text.secondary" }}>
                  Datos de la venta
                </Typography>
                <Grid container spacing={2}>
                  {!isAdvisor && (
                    <Grid item xs={12} md={6}>
                      <TextField label="Asesor *" fullWidth select
                        value={String(formSale.advisor_id || "")}
                        onChange={(e) => setFormSale({ advisor_id: e.target.value })}>
                        <MenuItem value="">Selecciona…</MenuItem>
                        {advisorOptions.map((u) => (
                          <MenuItem key={u.id} value={String(u.id)}>
                            {u.full_name} — {u.email}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  )}
                  <Grid item xs={12} md={isAdvisor ? 12 : 6}>
                    <TextField label="Vehículo *" fullWidth select
                      value={String(formSale.vehicle_id || "")}
                      onChange={(e) => setFormSale({ vehicle_id: e.target.value })}>
                      <MenuItem value="">Selecciona…</MenuItem>
                      {vehicleOptions.map((v) => (
                        <MenuItem key={v.id} value={String(v.id)}>
                          {v.model} {v.version} — {v.code}
                          {v.sale_price ? ` (${COP.format(v.sale_price)})` : ""}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Fecha de venta *" fullWidth type="date"
                      InputLabelProps={{ shrink: true }}
                      value={formSale.sale_date || ""}
                      onChange={(e) => setFormSale({ sale_date: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="N° Factura" fullWidth value={formSale.invoice || ""}
                      onChange={(e) => setFormSale({ invoice: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Cliente *" fullWidth value={formSale.client_name || ""}
                      onChange={(e) => setFormSale({ client_name: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Placa" fullWidth placeholder="Ej: ABC123"
                      value={formSale.plate || ""}
                      onChange={(e) => setFormSale({ plate: e.target.value.toUpperCase() })} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Notas" fullWidth multiline rows={2}
                      value={formSale.notes || ""}
                      onChange={(e) => setFormSale({ notes: e.target.value })} />
                  </Grid>
                </Grid>
              </Paper>
              {error && (
                <Paper variant="outlined"
                  sx={{ p: 2, borderRadius: 1.5, borderColor: "error.main", bgcolor: "rgba(252,129,129,0.06)" }}>
                  <Typography variant="body2" sx={{ color: "error.main" }}>{error}</Typography>
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between", bgcolor: "background.paper" }}>
          <Button onClick={closeForm} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button onClick={submitForm} variant="contained" disabled={isSaving || !formSale}
            sx={{ fontWeight: 900, borderRadius: 2 }}>
            {isSaving ? "Guardando…" : formMode === "create" ? "Registrar venta" : "Guardar cambios"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog 1: Confirmar eliminar individual ── */}
      <Dialog open={openConfirmDelete} onClose={cancelDelete} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 900, px: 3, py: 2 }}>¿Eliminar venta?</DialogTitle>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Esta acción es permanente. Si ya fue incluida en una corrida de comisión,
            puede afectar el cálculo.
          </Typography>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Button onClick={cancelDelete} variant="outlined" disabled={isDeleting} sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button onClick={confirmDelete} variant="contained" color="error"
            disabled={isDeleting} sx={{ fontWeight: 900, borderRadius: 2 }}>
            {isDeleting ? "Verificando…" : "Sí, eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog 2: Segunda confirmación individual (comisión avanzada) ── */}
      <Dialog open={openForceDelete} onClose={cancelForceDelete} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 2, border: "1px solid", borderColor: "warning.main" } }}>
        <DialogTitle sx={{ px: 3, py: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <WarningAmberRoundedIcon sx={{ color: "warning.main", fontSize: 22 }} />
          <Typography sx={{ fontWeight: 900 }}>Confirmación adicional requerida</Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
          <Stack spacing={2}>
            <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Esta venta pertenece a una comisión en estado:
              </Typography>
              <Chip size="small" label={STATUS_LABELS[forceDeleteStatus] || forceDeleteStatus}
                color="warning" sx={{ fontWeight: 900, fontSize: "0.75rem" }} />
            </Alert>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
              Eliminarla <strong>modificará el cálculo de la comisión</strong> asociada.
              ¿Estás completamente seguro?
            </Typography>
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Button onClick={cancelForceDelete} variant="outlined" disabled={isDeleting} sx={{ borderRadius: 2 }}>No, cancelar</Button>
          <Button onClick={confirmForceDelete} variant="contained" color="error"
            disabled={isDeleting} sx={{ fontWeight: 900, borderRadius: 2 }}>
            {isDeleting ? "Eliminando…" : "Sí, eliminar de todas formas"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog 3: Confirmar eliminación masiva ── */}
      <Dialog open={openConfirmBulk} onClose={cancelBulkDelete} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 900, px: 3, py: 2 }}>
          ¿Eliminar {selectedCount} venta{selectedCount !== 1 ? "s" : ""}?
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Se eliminarán permanentemente las <strong>{selectedCount}</strong> ventas seleccionadas.
            Si alguna pertenece a una comisión en estado avanzado, se te pedirá una confirmación adicional.
          </Typography>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Button onClick={cancelBulkDelete} variant="outlined" disabled={isDeleting} sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button onClick={confirmBulkDelete} variant="contained" color="error"
            disabled={isDeleting} sx={{ fontWeight: 900, borderRadius: 2 }}>
            {isDeleting ? "Verificando…" : `Sí, eliminar ${selectedCount}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog 4: Segunda confirmación masiva (comisiones avanzadas) ── */}
      <Dialog open={openForceBulk} onClose={cancelForceBulk} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 2, border: "1px solid", borderColor: "warning.main" } }}>
        <DialogTitle sx={{ px: 3, py: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <WarningAmberRoundedIcon sx={{ color: "warning.main", fontSize: 22 }} />
          <Typography sx={{ fontWeight: 900 }}>Confirmación adicional requerida</Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
          <Stack spacing={2}>
            <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {forceBulkSkipped.length} venta{forceBulkSkipped.length !== 1 ? "s" : ""} pertenecen
                a comisiones en estado avanzado:
              </Typography>
            </Alert>

            {/* Lista de ventas bloqueadas */}
            <Box sx={{ maxHeight: 160, overflowY: "auto", borderRadius: 1.5,
              border: "0.5px solid", borderColor: "divider", p: 1 }}>
              {forceBulkSkipped.map((s) => (
                <Stack key={s.id} direction="row" justifyContent="space-between"
                  alignItems="center" sx={{ py: 0.5, px: 0.5 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Venta #{s.id}
                  </Typography>
                  <Chip size="small"
                    label={STATUS_LABELS[s.commissionStatus] || s.commissionStatus}
                    color="warning" sx={{ fontWeight: 700, fontSize: "0.62rem" }} />
                </Stack>
              ))}
            </Box>

            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
              Eliminarlas <strong>afectará el cálculo de las comisiones</strong> asociadas.
              ¿Confirmas que deseas eliminar <strong>todas</strong> las seleccionadas de todas formas?
            </Typography>
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Button onClick={cancelForceBulk} variant="outlined" disabled={isDeleting} sx={{ borderRadius: 2 }}>
            No, cancelar
          </Button>
          <Button onClick={confirmForceBulk} variant="contained" color="error"
            disabled={isDeleting} sx={{ fontWeight: 900, borderRadius: 2 }}>
            {isDeleting ? "Eliminando…" : "Sí, eliminar todas de todas formas"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Importar Excel ── */}
      <SalesImportDialog />
    </Box>
  );
}
