// frontend/src/pages/commissions/DownloadPdfDialog.jsx
// Modal para seleccionar comisiones y descargar como ZIP de PDFs
import { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Stack, Box, Button, IconButton, Divider,
  Checkbox, Chip, CircularProgress, Alert, LinearProgress,
  Paper, Tooltip, TextField, MenuItem,
} from "@mui/material";

import CloseRoundedIcon           from "@mui/icons-material/CloseRounded";
import FolderZipRoundedIcon       from "@mui/icons-material/FolderZipRounded";
import CheckBoxOutlineBlankIcon   from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon               from "@mui/icons-material/CheckBox";
import FileDownloadRoundedIcon    from "@mui/icons-material/FileDownloadRounded";
import SearchRoundedIcon          from "@mui/icons-material/SearchRounded";

import { commissionRunsApi } from "../../api/commissionRuns.api";
import { exportsApi }        from "../../api/exports.api";
import { useCommissionRunsStore } from "../../app/store/commissionRuns.store";

import toast from "react-hot-toast";

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency", currency: "COP", maximumFractionDigits: 0,
});

const MONTHS = [
  { value: 1,  label: "Enero"      }, { value: 2,  label: "Febrero"    },
  { value: 3,  label: "Marzo"      }, { value: 4,  label: "Abril"      },
  { value: 5,  label: "Mayo"       }, { value: 6,  label: "Junio"      },
  { value: 7,  label: "Julio"      }, { value: 8,  label: "Agosto"     },
  { value: 9,  label: "Septiembre" }, { value: 10, label: "Octubre"    },
  { value: 11, label: "Noviembre"  }, { value: 12, label: "Diciembre"  },
];

const getMonthName = (m) => MONTHS.find(x => x.value === Number(m))?.label ?? "—";

const STATUS_LABELS = {
  CALCULATED:       "Calculada",
  ADVISOR_APPROVED: "Aprobada",
  ADVISOR_REJECTED: "Rechazada",
  ASST_VALIDATED:   "Validada",
  SENT_TO_HR:       "Enviada a RRHH",
};

const STATUS_COLORS = {
  CALCULATED:       { bgcolor: "rgba(99,179,237,0.1)",    color: "#63b3ed" },
  ADVISOR_APPROVED: { bgcolor: "rgba(104,211,145,0.1)",   color: "#68d391" },
  ADVISOR_REJECTED: { bgcolor: "rgba(252,129,129,0.1)",   color: "#fc8181" },
  ASST_VALIDATED:   { bgcolor: "rgba(246,173,85,0.1)",    color: "#f6ad55" },
  SENT_TO_HR:       { bgcolor: "rgba(159,122,234,0.1)",   color: "#9f7aea" },
};

export default function DownloadPdfDialog({ open, onClose, brandCode: brandCodeProp }) {
  const { filters, items: storeItems } = useCommissionRunsStore();

  const [runs, setRuns]           = useState([]);
  const [loading, setLoading]     = useState(false);
  // Cargar desde el store al abrir
  const [selected, setSelected]   = useState(new Set());
  const [downloading, setDownloading] = useState(false);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Cargar comisiones del período actual cuando abre el dialog
  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setSearch("");
    setStatusFilter("");
    fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const brandCode = brandCodeProp || "KIA";
      // Paginar para traer TODOS los runs del período — máx 50 por página
      const PAGE_SIZE = 50;
      let page        = 1;
      let allItems    = [];
      let totalPages  = 1;

      do {
        const res = await commissionRunsApi.list({
          brand:     brandCode,
          cut_year:  filters.cut_year,
          cut_month: filters.cut_month,
          fortnight: filters.fortnight,
          limit:     PAGE_SIZE,
          page,
        });
        const payload = res?.data ?? res ?? {};
        const items   = payload?.items || payload?.runs || [];
        const total   = payload?.total ?? items.length;
        totalPages    = Math.ceil(total / PAGE_SIZE) || 1;
        allItems      = [...allItems, ...items];
        page++;
      } while (page <= totalPages && allItems.length < 500);

      setRuns(allItems);
    } catch (e) {
      // Fallback: usar items del store (solo página actual)
      if (storeItems?.length) {
        setRuns(storeItems);
        toast(`Solo se cargaron ${storeItems.length} comisiones (página actual)`, { icon: "⚠️" });
      } else {
        toast.error("No se pudieron cargar las comisiones");
      }
    } finally {
      setLoading(false);
    }
  };

  // Filtrado local por búsqueda y estado
  const filtered = useMemo(() => {
    let list = runs;
    if (statusFilter) list = list.filter(r => String(r.status).toUpperCase() === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => (r.advisor_name || "").toLowerCase().includes(q));
    }
    return list;
  }, [runs, search, statusFilter]);

  const allSelected  = filtered.length > 0 && filtered.every(r => selected.has(r.id));
  const someSelected = filtered.some(r => selected.has(r.id));

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      // Deseleccionar los filtrados
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(r => next.delete(r.id));
        return next;
      });
    } else {
      // Seleccionar todos los filtrados
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(r => next.add(r.id));
        return next;
      });
    }
  };

  const handleDownload = async () => {
    if (selected.size === 0) {
      toast.error("Selecciona al menos una comisión");
      return;
    }
    setDownloading(true);
    const toastId = toast.loading(`Generando ZIP con ${selected.size} PDF(s)…`);
    try {
      const blob = await exportsApi.downloadZip({ run_ids: [...selected] });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const month = getMonthName(filters.cut_month);
      const q     = filters.fortnight === "FIRST" ? "1ra" : "2da";
      a.href     = url;
      a.download = `comisiones_${month}_${filters.cut_year}_${q}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`ZIP descargado con ${selected.size} PDF(s)`, { id: toastId, duration: 4000 });
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo generar el ZIP", { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  const monthLabel = getMonthName(filters.cut_month);
  const quinLabel  = filters.fortnight === "FIRST" ? "1ra quincena" : "2da quincena";

  return (
    <Dialog open={open} onClose={downloading ? undefined : onClose}
      fullWidth maxWidth="md" disableEscapeKeyDown={downloading}
      PaperProps={{ sx: { borderRadius: 2, overflow: "hidden" } }}>

      {/* Barra superior de color */}
      <Box sx={{
        height: 3,
        background: "linear-gradient(90deg, #63b3ed, #9f7aea, #68d391)",
      }} />

      <DialogTitle sx={{ px: 3, py: 2,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FolderZipRoundedIcon sx={{ color: "primary.main" }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
              Descargar comisiones en PDF
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {monthLabel} {filters.cut_year} — {quinLabel}
            </Typography>
          </Box>
        </Stack>
        {!downloading && (
          <IconButton onClick={onClose} size="small"><CloseRoundedIcon /></IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
        <Stack spacing={2}>

          {/* Filtros de búsqueda */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              placeholder="Buscar asesor…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              size="small" sx={{ flex: 1 }}
              InputProps={{
                startAdornment: <SearchRoundedIcon fontSize="small"
                  sx={{ mr: 0.5, color: "text.secondary" }} />,
              }}
            />
            <TextField
              label="Estado" value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              size="small" select sx={{ minWidth: 180 }}>
              <MenuItem value="">Todos los estados</MenuItem>
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <MenuItem key={val} value={val}>{label}</MenuItem>
              ))}
            </TextField>
          </Stack>

          {/* Info de selección */}
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <Checkbox
                size="small"
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onChange={toggleAll}
                disabled={loading || filtered.length === 0}
              />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {allSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                {filtered.length !== runs.length && ` (${filtered.length} visibles)`}
              </Typography>
            </Stack>
            {selected.size > 0 && (
              <Chip
                size="small"
                label={`${selected.size} seleccionada${selected.size !== 1 ? "s" : ""}`}
                sx={{ fontWeight: 900, bgcolor: "rgba(99,179,237,0.1)", color: "#63b3ed" }}
              />
            )}
          </Stack>

          {/* Lista de comisiones */}
          {loading ? (
            <Box>
              <LinearProgress sx={{ borderRadius: 1, mb: 1 }} />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Cargando comisiones…
              </Typography>
            </Box>
          ) : filtered.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 1.5 }}>
              No hay comisiones para el período y filtros seleccionados.
            </Alert>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
              {/* Header de la lista */}
              <Box sx={{ px: 2, py: 1, bgcolor: "action.hover",
                borderBottom: "0.5px solid", borderColor: "divider",
                display: "grid",
                gridTemplateColumns: "40px 1fr 140px 100px 120px",
                gap: 1, alignItems: "center" }}>
                {["", "Asesor", "Corte", "Uds.", "Total"].map((h, i) => (
                  <Typography key={i} variant="caption"
                    sx={{ fontWeight: 900, color: "text.secondary",
                      textTransform: "uppercase", fontSize: "0.65rem", letterSpacing: 0.5 }}>
                    {h}
                  </Typography>
                ))}
              </Box>

              {/* Filas */}
              <Box sx={{ maxHeight: 380, overflowY: "auto" }}>
                {filtered.map((r, i) => {
                  const isSelected = selected.has(r.id);
                  const statusConf = STATUS_COLORS[String(r.status).toUpperCase()] || {};
                  return (
                    <Box key={r.id}
                      onClick={() => toggleOne(r.id)}
                      sx={{
                        px: 2, py: 1.25, cursor: "pointer",
                        display: "grid",
                        gridTemplateColumns: "40px 1fr 140px 100px 120px",
                        gap: 1, alignItems: "center",
                        borderBottom: i < filtered.length - 1 ? "0.5px solid" : "none",
                        borderColor: "divider",
                        bgcolor: isSelected ? "rgba(99,179,237,0.05)" : "transparent",
                        transition: "background .12s",
                        "&:hover": { bgcolor: isSelected ? "rgba(99,179,237,0.08)" : "action.hover" },
                      }}>

                      {/* Checkbox */}
                      <Checkbox size="small" checked={isSelected}
                        onChange={() => toggleOne(r.id)}
                        onClick={e => e.stopPropagation()}
                        sx={{ p: 0,
                          color: isSelected ? "#63b3ed" : "text.disabled",
                          "&.Mui-checked": { color: "#63b3ed" },
                        }} />

                      {/* Asesor */}
                      <Box>
                        <Typography variant="body2"
                          sx={{ fontWeight: isSelected ? 700 : 400, lineHeight: 1.2 }}>
                          {r.advisor_name || "—"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {r.advisor_email || ""}
                        </Typography>
                      </Box>

                      {/* Estado */}
                      <Box>
                        <Chip size="small"
                          label={STATUS_LABELS[String(r.status).toUpperCase()] || r.status}
                          sx={{ fontWeight: 700, fontSize: "0.62rem",
                            ...statusConf }} />
                      </Box>

                      {/* Unidades */}
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        {r.units_total ?? 0} ud.
                      </Typography>

                      {/* Total */}
                      <Typography variant="body2"
                        sx={{ fontWeight: 900, color: "#f6ad55", fontFamily: "monospace" }}>
                        {COP.format(Number(r.total_commission || 0))}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          )}

          {downloading && (
            <Box>
              <LinearProgress sx={{ borderRadius: 1 }} />
              <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
                Generando PDFs y empaquetando ZIP… puede tomar unos segundos.
              </Typography>
            </Box>
          )}

        </Stack>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between",
        bgcolor: "background.paper" }}>
        <Button onClick={onClose} variant="outlined" disabled={downloading}
          sx={{ borderRadius: 2 }}>
          Cancelar
        </Button>

        <Stack direction="row" spacing={1.5} alignItems="center">
          {selected.size > 0 && (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {selected.size} PDF{selected.size !== 1 ? "s" : ""} en el ZIP
            </Typography>
          )}
          <Button
            onClick={handleDownload}
            variant="contained"
            disabled={selected.size === 0 || downloading || loading}
            startIcon={downloading
              ? <CircularProgress size={14} sx={{ color: "inherit" }} />
              : <FileDownloadRoundedIcon />
            }
            sx={{
              fontWeight: 900, borderRadius: 2,
              background: "linear-gradient(135deg, #63b3ed, #9f7aea)",
              "&:hover": { background: "linear-gradient(135deg, #4299e1, #805ad5)" },
              "&.Mui-disabled": { opacity: 0.5 },
            }}>
            {downloading
              ? "Generando ZIP…"
              : `Descargar ZIP (${selected.size})`
            }
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}