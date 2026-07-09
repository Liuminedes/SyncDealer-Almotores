// frontend/src/pages/brands/Brands.jsx — solo ADMIN
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Card, CardActionArea, CardContent, CardActions,
  Typography, Stack, Button, TextField, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControlLabel, Switch, Divider, CircularProgress,
  IconButton, Tooltip,
} from "@mui/material";
import toast from "react-hot-toast";

import AddRoundedIcon        from "@mui/icons-material/AddRounded";
import EditRoundedIcon       from "@mui/icons-material/EditRounded";
import TuneRoundedIcon       from "@mui/icons-material/TuneRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import RefreshRoundedIcon    from "@mui/icons-material/RefreshRounded";

import { brandsAdminApi } from "../../api/brands.admin.api";

const emptyForm    = { id: null, name: "", code: "", is_active: true };
const BRAND_COLORS = ["#63b3ed","#68d391","#f6ad55","#9f7aea","#fc8181","#4fd1c5","#f687b3","#fbd38d"];

export default function Brands() {
  const navigate = useNavigate();

  const [rows,    setRows]    = React.useState([]);
  const [q,       setQ]       = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [open,    setOpen]    = React.useState(false);
  const [form,    setForm]    = React.useState(emptyForm);
  const [formErr, setFormErr] = React.useState("");
  const [saving,  setSaving]  = React.useState(false);

  const fetchBrands = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await brandsAdminApi.listAll();
      setRows(data || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudieron cargar las marcas");
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const filtered = rows.filter(b =>
    !q ||
    b.name.toLowerCase().includes(q.toLowerCase()) ||
    b.code.toLowerCase().includes(q.toLowerCase())
  );

  const openCreate = () => { setForm(emptyForm); setFormErr(""); setOpen(true); };
  const openEdit   = (b, e) => {
    e.stopPropagation();
    setForm({ id: b.id, name: b.name, code: b.code, is_active: !!b.is_active });
    setFormErr(""); setOpen(true);
  };
  const closeForm  = () => { if (saving) return; setOpen(false); setFormErr(""); };

  const submit = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setFormErr("Nombre y código son obligatorios.");
      return;
    }
    setSaving(true); setFormErr("");
    const isEdit = !!form.id;
    const toastId = toast.loading(isEdit ? "Actualizando marca…" : "Creando marca…");
    try {
      isEdit
        ? await brandsAdminApi.update(form.id, form)
        : await brandsAdminApi.create(form);
      toast.success(
        isEdit ? `Marca "${form.name}" actualizada` : `Marca "${form.name}" creada`,
        { id: toastId }
      );
      setOpen(false);
      await fetchBrands();
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudo guardar la marca";
      toast.error(msg, { id: toastId });
      setFormErr(msg);
    } finally { setSaving(false); }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Stack spacing={3}>

        {/* Header */}
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }} spacing={1.5}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>Marcas</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Gestiona las marcas y accede a su configuración de comisiones.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refrescar">
              <IconButton onClick={fetchBrands} disabled={loading}>
                <RefreshRoundedIcon />
              </IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}
              sx={{ fontWeight: 900, borderRadius: 2, whiteSpace: "nowrap" }}>
              Nueva marca
            </Button>
          </Stack>
        </Stack>

        <TextField size="small" placeholder="Buscar marca…" value={q}
          onChange={e => setQ(e.target.value)} sx={{ maxWidth: 320 }} />

        {/* Grid */}
        {loading ? (
          <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <StorefrontRoundedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {q ? "Sin resultados para esa búsqueda." : "No hay marcas configuradas aún."}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 2 }}>
            {filtered.map((b, i) => {
              const color = BRAND_COLORS[i % BRAND_COLORS.length];
              return (
                <Card key={b.id} sx={{
                  borderRadius: 2, border: "1px solid", borderColor: "divider",
                  opacity: b.is_active ? 1 : 0.55, transition: "all .15s",
                  "&:hover": { borderColor: color, boxShadow: `0 4px 20px ${color}22` },
                }}>
                  <CardActionArea onClick={() => navigate(`/brands/${b.id}?from=brands`)}>
                    <CardContent sx={{ p: 2.5, pb: 1.5 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{
                          width: 48, height: 48, borderRadius: 1.5, flexShrink: 0,
                          bgcolor: `${color}18`, border: `1px solid ${color}30`,
                          display: "grid", placeItems: "center",
                        }}>
                          <StorefrontRoundedIcon sx={{ color, fontSize: 24 }} />
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
                      <Typography variant="caption" sx={{ color: "text.secondary", mt: 1.5, display: "block" }}>
                        Configurar esquemas, tiers, reglas y bonos →
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                  <Divider />
                  <CardActions sx={{ px: 2, py: 1, justifyContent: "space-between" }}>
                    <Button size="small" startIcon={<TuneRoundedIcon />}
                      onClick={() => navigate(`/brands/${b.id}?from=brands`)}
                      sx={{ fontWeight: 800, fontSize: "0.75rem" }}>
                      Parámetros
                    </Button>
                    <Tooltip title="Editar marca">
                      <IconButton size="small" onClick={e => openEdit(b, e)}>
                        <EditRoundedIcon fontSize="small" />
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
          {form.id ? "Editar marca" : "Nueva marca"}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
          <Stack spacing={2}>
            <TextField label="Nombre *" fullWidth value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <TextField label="Código *" fullWidth placeholder="Ej: KIA, VW, REN"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              helperText="Identificador corto, se muestra en chips y reportes" />
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
    </Box>
  );
}
