// frontend/src/pages/branches/Branches.jsx — solo ADMIN
import React, { useState, useCallback, useEffect } from "react";
import {
  Box, Card, CardContent, CardActions,
  Typography, Stack, Button, TextField, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControlLabel, Switch, Divider, CircularProgress,
  IconButton, Tooltip,
} from "@mui/material";
import toast from "react-hot-toast";

import AddRoundedIcon           from "@mui/icons-material/AddRounded";
import EditRoundedIcon          from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LocationOnRoundedIcon    from "@mui/icons-material/LocationOnRounded";
import RefreshRoundedIcon       from "@mui/icons-material/RefreshRounded";

import { branchesApi } from "../../api/branches.api";

const emptyForm = { id: null, name: "", code: "", is_active: true };
const COLORS    = ["#63b3ed","#68d391","#f6ad55","#9f7aea","#fc8181","#4fd1c5","#f687b3","#fbd38d"];

export default function Branches() {
  const [rows,     setRows]     = useState([]);
  const [q,        setQ]        = useState("");
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const [form,     setForm]     = useState(emptyForm);
  const [formErr,  setFormErr]  = useState("");
  const [saving,   setSaving]   = useState(false);
  const [delId,    setDelId]    = useState(null);
  const [delName,  setDelName]  = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await branchesApi.list();
      const list = res?.data?.items ?? res?.data ?? [];
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudieron cargar las sedes");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(b =>
    !q ||
    b.name.toLowerCase().includes(q.toLowerCase()) ||
    b.code.toLowerCase().includes(q.toLowerCase())
  );

  const openCreate = () => { setForm(emptyForm); setFormErr(""); setOpen(true); };
  const openEdit   = (b, e) => {
    e?.stopPropagation();
    setForm({ id: b.id, name: b.name, code: b.code, is_active: !!b.is_active });
    setFormErr(""); setOpen(true);
  };
  const closeForm  = () => { if (saving) return; setOpen(false); setFormErr(""); };

  const submit = async () => {
    if (!form.name.trim()) { setFormErr("El nombre es obligatorio."); return; }
    if (!form.code.trim()) { setFormErr("El código es obligatorio."); return; }
    setSaving(true); setFormErr("");
    const isEdit  = !!form.id;
    const toastId = toast.loading(isEdit ? "Actualizando sede…" : "Creando sede…");
    try {
      isEdit
        ? await branchesApi.update(form.id, form)
        : await branchesApi.create(form);
      toast.success(
        isEdit ? `Sede "${form.name}" actualizada` : `Sede "${form.name}" creada`,
        { id: toastId }
      );
      setOpen(false);
      await load();
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudo guardar la sede";
      toast.error(msg, { id: toastId });
      setFormErr(msg);
    } finally { setSaving(false); }
  };

  const promptDelete = (b, e) => {
    e?.stopPropagation();
    setDelId(b.id);
    setDelName(b.name);
  };

  const cancelDelete = () => { setDelId(null); setDelName(""); };

  const confirmDelete = async () => {
    if (!delId) return;
    setDeleting(true);
    const toastId = toast.loading(`Eliminando "${delName}"…`);
    try {
      await branchesApi.remove(delId);
      toast.success(`Sede "${delName}" eliminada`, { id: toastId });
      setDelId(null); setDelName("");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo eliminar la sede", { id: toastId });
      setDelId(null); setDelName("");
    } finally { setDeleting(false); }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Stack spacing={3}>

        {/* Header */}
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }} spacing={1.5}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>Sedes</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Gestiona las sedes de la organización y sus códigos identificadores.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refrescar">
              <IconButton onClick={load} disabled={loading}><RefreshRoundedIcon /></IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}
              sx={{ fontWeight: 900, borderRadius: 2, whiteSpace: "nowrap" }}>
              Nueva sede
            </Button>
          </Stack>
        </Stack>

        <TextField size="small" placeholder="Buscar sede…" value={q}
          onChange={e => setQ(e.target.value)} sx={{ maxWidth: 320 }} />

        {loading ? (
          <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <LocationOnRoundedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {q ? "Sin resultados." : "No hay sedes configuradas aún."}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 2 }}>
            {filtered.map((b, i) => {
              const color = COLORS[i % COLORS.length];
              return (
                <Card key={b.id} sx={{
                  borderRadius: 2, border: "1px solid", borderColor: "divider",
                  opacity: b.is_active ? 1 : 0.55, transition: "all .15s",
                  "&:hover": { borderColor: color, boxShadow: `0 4px 20px ${color}22` },
                }}>
                  <CardContent sx={{ p: 2.5, pb: 1.5 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{
                        width: 44, height: 44, borderRadius: 1.5, flexShrink: 0,
                        bgcolor: `${color}18`, border: `1px solid ${color}30`,
                        display: "grid", placeItems: "center",
                      }}>
                        <LocationOnRoundedIcon sx={{ color, fontSize: 22 }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 900, lineHeight: 1.2 }} noWrap>{b.name}</Typography>
                        <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }}>
                          <Chip size="small" label={b.code} sx={{
                            fontWeight: 800, fontSize: "0.65rem",
                            bgcolor: `${color}18`, color, border: `1px solid ${color}30`,
                          }} />
                          <Chip size="small" label={b.is_active ? "Activa" : "Inactiva"}
                            color={b.is_active ? "success" : "default"}
                            sx={{ fontWeight: 800, fontSize: "0.65rem" }} />
                        </Stack>
                      </Box>
                    </Stack>
                  </CardContent>
                  <Divider />
                  <CardActions sx={{ px: 2, py: 1, justifyContent: "flex-end" }}>
                    <Tooltip title="Editar sede">
                      <IconButton size="small" onClick={e => openEdit(b, e)}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar sede">
                      <IconButton size="small" onClick={e => promptDelete(b, e)}
                        sx={{ color: "error.main" }}>
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              );
            })}
          </Box>
        )}
      </Stack>

      {/* Dialog crear / editar */}
      <Dialog open={open} onClose={closeForm} fullWidth maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 900, px: 3, py: 2 }}>
          {form.id ? "Editar sede" : "Nueva sede"}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
          <Stack spacing={2}>
            <TextField label="Nombre *" fullWidth value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <TextField label="Código *" fullWidth placeholder="Ej: SN, SC, SO"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              helperText="Identificador corto visible en reportes" />
            <FormControlLabel
              control={
                <Switch checked={!!form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              }
              label={form.is_active ? "Activa" : "Inactiva"}
            />
            {formErr && (
              <Typography variant="body2" sx={{ color: "error.main" }}>{formErr}</Typography>
            )}
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Button onClick={closeForm} variant="outlined" disabled={saving} sx={{ borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button onClick={submit} variant="contained" disabled={saving}
            sx={{ fontWeight: 900, borderRadius: 2 }}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog confirmar eliminación */}
      <Dialog open={!!delId} onClose={cancelDelete} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 900, px: 3, py: 2 }}>¿Eliminar sede?</DialogTitle>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Vas a eliminar la sede <strong>"{delName}"</strong>. Esta acción no se puede deshacer
            y podría afectar a los usuarios que tienen esta sede asignada.
          </Typography>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Button onClick={cancelDelete} variant="outlined" disabled={deleting} sx={{ borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button onClick={confirmDelete} variant="contained" color="error"
            disabled={deleting} sx={{ fontWeight: 900, borderRadius: 2 }}>
            {deleting ? "Eliminando…" : "Sí, eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
