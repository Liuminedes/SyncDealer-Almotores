// frontend/src/pages/reports/Exports.jsx
import { useState, useEffect, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, Stack, Button, Chip,
  TextField, MenuItem, Divider, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Checkbox, Tooltip, LinearProgress,
} from "@mui/material";
import toast from "react-hot-toast";

import DownloadRoundedIcon      from "@mui/icons-material/DownloadRounded";
import SendRoundedIcon          from "@mui/icons-material/SendRounded";
import FileDownloadRoundedIcon  from "@mui/icons-material/FileDownloadRounded";
import PictureAsPdfRoundedIcon  from "@mui/icons-material/PictureAsPdfRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";

import { exportsApi }  from "../../api/exports.api";
import { useAuthStore } from "../../app/store/auth.store";

const MONTHS = [
  { v:1,  l:"Enero" },   { v:2,  l:"Febrero" },   { v:3,  l:"Marzo" },
  { v:4,  l:"Abril" },   { v:5,  l:"Mayo" },       { v:6,  l:"Junio" },
  { v:7,  l:"Julio" },   { v:8,  l:"Agosto" },     { v:9,  l:"Septiembre" },
  { v:10, l:"Octubre" }, { v:11, l:"Noviembre" },  { v:12, l:"Diciembre" },
];
const MN = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const fmtM = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return COP.format(v);
};

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const STATUS_LABEL = {
  ASST_VALIDATED: { label: "Lista para enviar", color: "info" },
  SENT_TO_HR:     { label: "Enviada a RRHH",    color: "success" },
};

export default function Exports() {
  const { user } = useAuthStore();
  const now      = new Date();

  const [year,     setYear]     = useState(now.getFullYear());
  const [month,    setMonth]    = useState(now.getMonth() + 1);
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [busyPdf,  setBusyPdf]  = useState(null); // id del pdf en descarga

  const years = [now.getFullYear(), now.getFullYear() - 1];

  const load = useCallback(async (y, m) => {
    setLoading(true); setSelected(new Set());
    try {
      const res = await exportsApi.list({ year: y, month: m });
      setItems(res?.data?.items || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudieron cargar las corridas");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(year, month); }, []); // eslint-disable-line

  const handlePeriod = (y, m) => { setYear(y); setMonth(m); load(y, m); };

  const toggleAll = () => {
    selected.size === items.length
      ? setSelected(new Set())
      : setSelected(new Set(items.map(i => i.id)));
  };
  const toggleOne = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const selectedItems = items.filter(i => selected.has(i.id));
  const brandCodes    = [...new Set(selectedItems.map(i => i.brand_code))];
  const brandLabel    = brandCodes.length === 1 ? brandCodes[0] : null;
  const totalSelected = selectedItems.reduce((s, i) => s + Number(i.total_commission || 0), 0);

  // ── ZIP ────────────────────────────────────────────────────────────────────
  const handleDownloadZip = async () => {
    if (selected.size === 0) return;
    const filename = `comisiones_${year}_${String(month).padStart(2, "0")}.zip`;
    await toast.promise(
      exportsApi.downloadZip({ run_ids: [...selected], year, month }).then(blob => {
        downloadBlob(blob, filename);
      }),
      {
        loading: `Generando ZIP (${selected.size} comisiones)…`,
        success: `ZIP descargado: ${filename}`,
        error:   (e) => e?.response?.data?.message || "Error al generar el ZIP",
      }
    );
  };

  // ── Email a RRHH ───────────────────────────────────────────────────────────
  const handleSendToHR = async () => {
    if (selected.size === 0) return;
    await toast.promise(
      exportsApi.sendToHR({ run_ids: [...selected], year, month, brand: brandLabel }),
      {
        loading: `Enviando ${selected.size} comisión${selected.size > 1 ? "es" : ""} a Talento Humano…`,
        success: (res) => res?.message || "Correo enviado correctamente a Talento Humano",
        error:   (e) => e?.response?.data?.message || "Error al enviar el correo",
      }
    );
    await load(year, month); // refrescar estados
  };

  // ── PDF individual ─────────────────────────────────────────────────────────
  const handleDownloadPdf = async (id) => {
    setBusyPdf(id);
    const item     = items.find(i => i.id === id);
    const filename = `comision_${item?.advisor_document || id}_${year}_${String(month).padStart(2, "0")}.pdf`;
    try {
      await toast.promise(
        exportsApi.downloadPdf(id).then(blob => { downloadBlob(blob, filename); }),
        {
          loading: `Generando PDF de ${item?.advisor_name?.split(" ")[0] || "asesor"}…`,
          success: `PDF descargado`,
          error:   "Error al descargar el PDF",
        }
      );
    } finally { setBusyPdf(null); }
  };

  const isBusyGlobal = false; // las acciones globales son await, no bloquean toda la UI

  return (
    <Box sx={{ width: "100%" }}>
      <Stack spacing={3}>

        {/* Header */}
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }} spacing={1.5}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>Exportaciones</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Descarga o envía a Talento Humano las comisiones validadas.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <CalendarMonthRoundedIcon sx={{ color: "text.secondary", fontSize: 18 }} />
            <TextField select size="small" value={year}
              onChange={e => handlePeriod(Number(e.target.value), month)} sx={{ width: 100 }}>
              {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
            <TextField select size="small" value={month}
              onChange={e => handlePeriod(year, Number(e.target.value))} sx={{ width: 138 }}>
              {MONTHS.map(m => <MenuItem key={m.v} value={m.v}>{m.l}</MenuItem>)}
            </TextField>
          </Stack>
        </Stack>

        {/* Barra de acciones */}
        <Card sx={{ borderRadius: 2 }}>
          <CardContent sx={{ py: 1.5 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}
              alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Chip size="small"
                  label={`${selected.size} seleccionada${selected.size !== 1 ? "s" : ""}`}
                  sx={{ fontWeight: 800 }} />
                {selected.size > 0 && (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Total: <strong style={{ color: "#f6ad55" }}>{fmtM(totalSelected)}</strong>
                  </Typography>
                )}
              </Stack>

              <Stack direction="row" spacing={1}>
                <Tooltip title="Descargar ZIP con todos los PDFs seleccionados">
                  <span>
                    <Button variant="outlined"
                      startIcon={<DownloadRoundedIcon />}
                      onClick={handleDownloadZip}
                      disabled={selected.size === 0}
                      sx={{ fontWeight: 800, borderRadius: 2 }}>
                      Descargar ZIP
                    </Button>
                  </span>
                </Tooltip>

                <Tooltip title="Enviar ZIP por email a Talento Humano y marcar como SENT_TO_HR">
                  <span>
                    <Button variant="contained"
                      startIcon={<SendRoundedIcon />}
                      onClick={handleSendToHR}
                      disabled={selected.size === 0}
                      sx={{ fontWeight: 900, borderRadius: 2 }}>
                      Enviar a RRHH
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card sx={{ borderRadius: 2 }}>
          {loading && <LinearProgress />}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th": { borderColor: "divider", bgcolor: "action.hover" } }}>
                  <TableCell padding="checkbox">
                    <Checkbox size="small"
                      checked={items.length > 0 && selected.size === items.length}
                      indeterminate={selected.size > 0 && selected.size < items.length}
                      onChange={toggleAll}
                      disabled={items.length === 0}
                    />
                  </TableCell>
                  {["Asesor","Cédula","Marca","Período","Quincena","Unidades","Base","Ajuste","Total","Estado","PDF"].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 900, color: "text.secondary", fontSize: "0.66rem", letterSpacing: 0.5, textTransform: "uppercase" }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {!loading && items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12}>
                      <Stack alignItems="center" spacing={1} sx={{ py: 5 }}>
                        <FileDownloadRoundedIcon sx={{ fontSize: 40, color: "text.disabled" }} />
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          No hay comisiones validadas para {MONTHS.find(m => m.v === month)?.l} {year}.
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.disabled" }}>
                          Solo aparecen corridas en estado "Validada" (ASST_VALIDATED).
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : items.map(r => {
                  const st  = STATUS_LABEL[r.status] || { label: r.status, color: "default" };
                  const sel = selected.has(r.id);
                  const hasAdj = r.manual_adjustment != null;
                  return (
                    <TableRow key={r.id} hover selected={sel}
                      sx={{ "& td": { borderColor: "divider" }, "&:last-child td": { borderBottom: "none" } }}>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={sel} onChange={() => toggleOne(r.id)} />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.8rem" }}>
                          {r.advisor_name?.split(" ").slice(0, 3).join(" ") || "—"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {r.advisor_document || "—"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip size="small" label={r.brand_code} sx={{ fontWeight: 800, fontSize: "0.66rem" }} />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: "0.76rem", color: "text.secondary" }}>
                          {MN[r.cut_month]} {r.cut_year}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {r.fortnight === "FIRST" ? "1ra" : "2da"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#63b3ed" }}>
                          {r.units_total ?? 0}
                        </Typography>
                      </TableCell>

                      {/* Base */}
                      <TableCell>
                        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.78rem" }}>
                          {fmtM(r.base_commission || r.total_commission)}
                        </Typography>
                      </TableCell>

                      {/* Ajuste */}
                      <TableCell>
                        {hasAdj ? (
                          <Chip size="small"
                            label={`${r.manual_adjustment_type === "ADD" ? "+" : "-"}${fmtM(r.manual_adjustment)}`}
                            sx={{
                              fontWeight: 700, fontSize: "0.62rem",
                              bgcolor: r.manual_adjustment_type === "ADD" ? "rgba(104,211,145,0.1)" : "rgba(252,129,129,0.1)",
                              color:   r.manual_adjustment_type === "ADD" ? "#68d391" : "#fc8181",
                            }} />
                        ) : (
                          <Typography variant="caption" sx={{ color: "text.disabled" }}>—</Typography>
                        )}
                      </TableCell>

                      {/* Total */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 900, color: "#f6ad55", fontSize: "0.82rem" }}>
                          {fmtM(r.total_commission)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip size="small" label={st.label} color={st.color}
                          sx={{ fontWeight: 800, fontSize: "0.66rem" }} />
                      </TableCell>

                      <TableCell>
                        <Tooltip title="Descargar PDF individual">
                          <span>
                            <Button size="small" variant="outlined"
                              startIcon={busyPdf === r.id ? <CircularProgress size={12} /> : <PictureAsPdfRoundedIcon />}
                              onClick={() => handleDownloadPdf(r.id)}
                              disabled={busyPdf !== null}
                              sx={{ minWidth: 0, px: 1, fontSize: "0.7rem", borderRadius: 1.5 }}>
                              PDF
                            </Button>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Nota */}
        <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "rgba(99,179,237,0.06)", border: "1px solid rgba(99,179,237,0.2)", borderLeft: "3px solid #63b3ed" }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Solo se muestran corridas en estado <strong>Validada</strong> (ASST_VALIDATED).
            Al hacer clic en <strong>Enviar a RRHH</strong>, el ZIP se envía por email a Talento Humano
            y las corridas seleccionadas pasan automáticamente a estado <strong>Enviada a RRHH</strong>.
          </Typography>
        </Box>

      </Stack>
    </Box>
  );
}
