import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Stack,
  Alert,
  Chip,
  Tooltip,
  IconButton,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { DataGrid } from "@mui/x-data-grid";

import { useAuthStore } from "../../app/store/auth.store";
import { brandsApi } from "../../api/brands.api";
import { brandsAdminApi } from "../../api/brands.admin.api";

function isAdminRole(role) {
  return String(role || "").toUpperCase() === "ADMIN";
}

const emptyForm = { id: null, name: "", code: "", is_active: true };

export default function Brands() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);

  const [rows, setRows] = React.useState([]);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);

  const fetchBrands = React.useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const data = isAdmin ? await brandsAdminApi.listAll() : await brandsApi.list();
      setRows(data);
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudieron cargar las marcas");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  React.useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((b) => {
      const name = String(b.name || "").toLowerCase();
      const code = String(b.code || "").toLowerCase();
      return name.includes(term) || code.includes(term);
    });
  }, [rows, q]);

  const openCreate = () => {
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row) => {
    setForm({
      id: row.id,
      name: row.name || "",
      code: row.code || "",
      is_active: row.is_active !== false,
    });
    setOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
  };

  const onSave = async () => {
    setSaving(true);
    setErr("");
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        is_active: !!form.is_active,
      };

      if (!payload.name || !payload.code) {
        setErr("Nombre y código son obligatorios");
        return;
      }

      if (!isAdmin) {
        setErr("No tienes permisos para modificar marcas.");
        return;
      }

      if (form.id) {
        await brandsAdminApi.update(form.id, payload);
      } else {
        await brandsAdminApi.create(payload);
      }

      setOpen(false);
      await fetchBrands();
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo guardar la marca");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { field: "code", headerName: "Código", width: 140 },
    { field: "name", headerName: "Nombre", flex: 1, minWidth: 240 },
    {
      field: "is_active",
      headerName: "Estado",
      width: 140,
      valueGetter: (params) => params.row?.is_active,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value === false ? "Inactiva" : "Activa"}
          variant={params.value === false ? "outlined" : "filled"}
        />
      ),
    },
    ...(isAdmin
      ? []
      : [
          {
            field: "can_view",
            headerName: "Ver",
            width: 90,
            renderCell: (p) => <Chip size="small" label={p.value ? "Sí" : "No"} />,
          },
          {
            field: "can_generate",
            headerName: "Generar",
            width: 110,
            renderCell: (p) => <Chip size="small" label={p.value ? "Sí" : "No"} />,
          },
        ]),
    ...(isAdmin
      ? [
          {
            field: "actions",
            headerName: "Acciones",
            width: 200,
            sortable: false,
            filterable: false,
            align: "right",
            headerAlign: "right",
            renderCell: (params) => (
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                <Tooltip title="Configurar comisiones (esquema, rangos, bonos)">
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/brands/${params.row.id}`)}
                  >
                    <SettingsRoundedIcon />
                  </IconButton>
                </Tooltip>

                <Button
                  size="small"
                  startIcon={<EditRoundedIcon />}
                  onClick={() => openEdit(params.row)}
                >
                  Editar
                </Button>
              </Stack>
            ),
          },
        ]
      : []),
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Marcas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isAdmin ? "Gestiona las marcas del sistema." : "Marcas a las que tienes acceso."}
          </Typography>
        </Box>

        {isAdmin && (
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>
            Nueva marca
          </Button>
        )}
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            size="small"
            fullWidth
            label="Buscar por nombre o código"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </Stack>

        <Box sx={{ height: 560 }}>
          <DataGrid
            rows={filtered}
            columns={columns}
            getRowId={(r) => r.id}
            loading={loading}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
            // ✅ UX: doble click en fila -> Configurar
            onRowDoubleClick={(params) => {
              if (!isAdmin) return;
              navigate(`/brands/${params.row.id}`);
            }}
          />
        </Box>
      </Paper>

      <Dialog open={open} onClose={closeModal} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>
          {form.id ? "Editar marca" : "Nueva marca"}
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Nombre"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Código"
              value={form.code}
              onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
              fullWidth
              helperText="Ej: KIA, RENAULT, VW"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={!!form.is_active}
                  onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.checked }))}
                />
              }
              label="Marca activa"
            />

            {!isAdmin && (
              <Alert severity="warning">
                No tienes permisos para guardar cambios en marcas.
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeModal} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={onSave} disabled={saving || !isAdmin}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
