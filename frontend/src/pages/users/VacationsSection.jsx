import { useEffect, useState, useCallback } from "react";
import {
  Box, Typography, Stack, Button, IconButton, Tooltip,
  Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Paper, TextField, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  Switch, FormControlLabel,
} from "@mui/material";
import AddRoundedIcon    from "@mui/icons-material/AddRounded";
import EditRoundedIcon   from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CloseRoundedIcon  from "@mui/icons-material/CloseRounded";
import BeachAccessIcon   from "@mui/icons-material/BeachAccess";
import { vacationsApi }  from "../../api/advisorVacations.api";

const emptyForm = { start_date: "", end_date: "", notes: "", is_active: true };

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("es-CO", { timeZone: "UTC" }) : "—";

const isCurrentlyActive = (v) => {
  if (!v.is_active) return false;
  const today = new Date().toISOString().split("T")[0];
  return v.start_date <= today && v.end_date >= today;
};

export default function VacationsSection({ advisorId }) {
  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState(null);
  const [openForm,  setOpenForm]  = useState(false);
  const [editItem,  setEditItem]  = useState(null); // null = crear
  const [form,      setForm]      = useState(emptyForm);
  const [deleting,  setDeleting]  = useState(null); // id en proceso de borrado

  // ── Cargar vacaciones ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!advisorId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await vacationsApi.list(advisorId);
      setItems(res?.data || []);
    } catch {
      setError("No se pudieron cargar las ausencias");
    } finally {
      setLoading(false);
    }
  }, [advisorId]);

  useEffect(() => { load(); }, [load]);

  // ── Abrir formulario ───────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setError(null);
    setOpenForm(true);
  };

  const handleOpenEdit = (v) => {
    setEditItem(v);
    setForm({
      start_date: v.start_date || "",
      end_date:   v.end_date   || "",
      notes:      v.notes      || "",
      is_active:  !!v.is_active,
    });
    setError(null);
    setOpenForm(true);
  };

  // ── Guardar ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.start_date || !form.end_date) {
      setError("Las fechas son obligatorias");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editItem) {
        await vacationsApi.update(advisorId, editItem.id, form);
      } else {
        await vacationsApi.create(advisorId, form);
      }
      setOpenForm(false);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar ───────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await vacationsApi.delete(advisorId, id);
      await load();
    } catch {
      setError("No se pudo eliminar la ausencia");
    } finally {
      setDeleting(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1, bgcolor: "background.paper" }}>
        {/* Header sección */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <BeachAccessIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <Box>
              <Typography sx={{ fontWeight: 900 }}>Ausencias y vacaciones</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Períodos fuera del cálculo de comisiones.
              </Typography>
            </Box>
          </Stack>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddRoundedIcon />}
            onClick={handleOpenCreate}
            sx={{ borderRadius: 2, fontWeight: 800 }}
          >
            Nueva ausencia
          </Button>
        </Stack>

        {/* Error */}
        {error && !openForm && (
          <Typography variant="body2" sx={{ color: "error.main", mb: 1 }}>{error}</Typography>
        )}

        {/* Tabla */}
        {loading ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>Cargando…</Typography>
          </Stack>
        ) : items.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary", py: 1 }}>
            Sin ausencias registradas.
          </Typography>
        ) : (
          <TableContainer sx={{ borderRadius: 1, border: "1px solid", borderColor: "divider" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>Inicio</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Fin</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Notas</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((v) => {
                  const active = isCurrentlyActive(v);
                  return (
                    <TableRow key={v.id} hover>
                      <TableCell>
                        <Typography variant="body2">{formatDate(v.start_date)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDate(v.end_date)}</Typography>
                      </TableCell>
                      <TableCell>
                        {active ? (
                          <Chip size="small" label="En curso" color="warning" sx={{ fontWeight: 800 }} />
                        ) : v.is_active ? (
                          <Chip size="small" label="Activa" color="success" variant="outlined" sx={{ fontWeight: 800 }} />
                        ) : (
                          <Chip size="small" label="Inactiva" variant="outlined" sx={{ fontWeight: 800, opacity: 0.6 }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {v.notes || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => handleOpenEdit(v)}>
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(v.id)}
                              disabled={deleting === v.id}
                              sx={{ color: "error.main" }}
                            >
                              {deleting === v.id
                                ? <CircularProgress size={14} />
                                : <DeleteRoundedIcon fontSize="small" />
                              }
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ── Dialog crear/editar ausencia ── */}
      <Dialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 1 } }}
      >
        <DialogTitle sx={{
          px: 3, py: 2, fontWeight: 900,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {editItem ? "Editar ausencia" : "Nueva ausencia"}
          </Typography>
          <IconButton size="small" onClick={() => setOpenForm(false)}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
          <Stack spacing={2}>
            <TextField
              label="Fecha inicio *"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            />
            <TextField
              label="Fecha fin *"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.end_date}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            />
            <TextField
              label="Notas (opcional)"
              fullWidth
              multiline
              rows={2}
              placeholder="Ej: Vacaciones anuales, incapacidad, etc."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
              }
              label={form.is_active ? "Activa" : "Inactiva"}
            />
            {error && (
              <Typography variant="body2" sx={{ color: "error.main" }}>{error}</Typography>
            )}
          </Stack>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between", bgcolor: "background.paper" }}>
          <Button onClick={() => setOpenForm(false)} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving}
            sx={{ fontWeight: 900, borderRadius: 2 }}
          >
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}