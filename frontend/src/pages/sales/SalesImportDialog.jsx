// frontend/src/pages/sales/SalesImportDialog.jsx
// Dialog de importación de ventas desde Excel con flujo de dos pasos:
//   1. Dropzone → subir archivo
//   2. Preview  → ver resumen de validación (vehículos OK/faltantes/asesores)
//   3. Confirmar → importar los válidos
import { useRef } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Stack, Box, Button, IconButton, Tooltip,
  Divider, LinearProgress, Alert, Chip, Paper,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  CircularProgress,
} from "@mui/material";

import CloseRoundedIcon              from "@mui/icons-material/CloseRounded";
import UploadFileRoundedIcon         from "@mui/icons-material/UploadFileRounded";
import InsertDriveFileRoundedIcon    from "@mui/icons-material/InsertDriveFileRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import WarningAmberRoundedIcon       from "@mui/icons-material/WarningAmberRounded";
import FileDownloadRoundedIcon       from "@mui/icons-material/FileDownloadRounded";
import ArrowBackRoundedIcon          from "@mui/icons-material/ArrowBackRounded";

import { useSalesStore } from "../../app/store/sales.store";

const STEP_LABELS = {
  dropzone:      "Selecciona el archivo",
  previewing:    "Analizando…",
  preview_ready: "Resumen de importación",
  importing:     "Importando…",
  done:          "Importación completada",
};

export default function SalesImportDialog() {
  const {
    openImportDialog, importStep,
    importFile, importFileName, importPreview, importResults, isImporting,
    closeImport, setImportFile, clearImportFile,
    runPreview, runImport, downloadSalesTemplate,
  } = useSalesStore();

  const fileInputRef = useRef(null);

  const handleDrop     = (e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) setImportFile(f); };
  const handleDragOver = (e) => e.preventDefault();
  const handleInput    = (e) => { const f = e.target.files?.[0]; if (f) setImportFile(f); e.target.value = ""; };

  const preview = importPreview;
  const results = importResults;

  return (
    <Dialog open={openImportDialog} onClose={closeImport} fullWidth maxWidth="md"
      PaperProps={{ sx: { borderRadius: 2, overflow: "hidden" } }}>

      <DialogTitle sx={{ px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <UploadFileRoundedIcon sx={{ color: "primary.main" }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
              Importar ventas desde Excel
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {STEP_LABELS[importStep] || ""}
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={closeImport} size="small"><CloseRoundedIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "background.default" }}>
        <Stack spacing={2.5}>

          {/* ── Paso 1: Dropzone ── */}
          {(importStep === "dropzone" || importStep === "previewing") && (
            <>
              <Alert severity="info" sx={{ "& .MuiAlert-message": { fontSize: "0.8rem" } }}>
                Exporta el reporte de ventas de tu plataforma y súbelo aquí.
                El sistema extrae automáticamente el código del vehículo del campo <strong>Cod.modelo</strong>
                y te avisa si alguno no está registrado antes de importar.
              </Alert>

              <Box onDrop={handleDrop} onDragOver={handleDragOver}
                onClick={() => !importFile && fileInputRef.current?.click()}
                sx={{
                  border: "1.5px dashed",
                  borderColor: importFile ? "success.main" : "divider",
                  borderRadius: 2, p: 3.5, textAlign: "center",
                  cursor: importFile ? "default" : "pointer",
                  bgcolor: importFile ? "rgba(104,211,145,0.05)" : "background.paper",
                  transition: "all .2s",
                  "&:hover": !importFile ? { borderColor: "primary.main", bgcolor: "action.hover" } : {},
                }}>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls"
                  style={{ display: "none" }} onChange={handleInput} />

                {!importFile ? (
                  <Stack spacing={1} alignItems="center">
                    <UploadFileRoundedIcon sx={{ fontSize: 44, color: "text.disabled" }} />
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
                        Listo para analizar
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

              {importStep === "previewing" && (
                <Box>
                  <LinearProgress sx={{ borderRadius: 1 }} />
                  <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
                    Verificando vehículos y asesores en el sistema…
                  </Typography>
                </Box>
              )}
            </>
          )}

          {/* ── Paso 2: Preview / resumen de validación ── */}
          {(importStep === "preview_ready" || importStep === "importing") && preview && (
            <Stack spacing={2}>

              {/* Resumen numérico */}
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1 }}>
                {[
                  { label: "Total en Excel",     value: preview.total,                  color: "text.primary",  bg: "action.hover",                        border: "divider" },
                  { label: "Listas p/ importar", value: preview.summary.canImport,      color: "#68d391",       bg: "rgba(104,211,145,0.08)",              border: "rgba(104,211,145,0.3)" },
                  { label: "Sin vehículo ❌",    value: preview.summary.blockedByVehicle, color: "#fc8181",      bg: "rgba(252,129,129,0.08)",              border: "rgba(252,129,129,0.3)" },
                  { label: "Sin asesor ⚠️",      value: preview.summary.withoutAdvisor,  color: "#f6ad55",      bg: "rgba(246,173,85,0.08)",               border: "rgba(246,173,85,0.3)" },
                ].map(({ label, value, color, bg, border }) => (
                  <Box key={label} sx={{ p: 1.5, borderRadius: 1.5, textAlign: "center", bgcolor: bg, border: `0.5px solid`, borderColor: border }}>
                    <Typography sx={{ fontSize: "1.6rem", fontWeight: 900, color, lineHeight: 1 }}>{value}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>{label}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Alerta de vehículos faltantes — bloqueante */}
              {preview.vehicleCodesNotFound?.length > 0 && (
                <Alert severity="error" icon={<WarningAmberRoundedIcon />} sx={{ borderRadius: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
                    {preview.vehicleCodesNotFound.length} código(s) de vehículo NO encontrados en el sistema:
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.5}>
                    {preview.vehicleCodesNotFound.map((code) => (
                      <Chip key={code} size="small" label={code}
                        sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.7rem",
                          bgcolor: "rgba(252,129,129,0.15)", color: "#fc8181" }} />
                    ))}
                  </Stack>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.75 }}>
                    Estas ventas NO se importarán. Primero agrega estos vehículos en el catálogo o importa el Excel de vehículos.
                  </Typography>
                </Alert>
              )}

              {/* Alerta de asesores no encontrados — no bloqueante */}
              {preview.missingAdvisors?.length > 0 && (
                <Paper variant="outlined" sx={{ borderRadius: 1.5, border: "1px solid", borderColor: "warning.main", overflow: "hidden" }}>
                  <Box sx={{ px: 2, py: 1.25, bgcolor: "rgba(246,173,85,0.08)",
                    borderBottom: "0.5px solid", borderColor: "warning.main",
                    display: "flex", alignItems: "center", gap: 1 }}>
                    <WarningAmberRoundedIcon sx={{ fontSize: 16, color: "warning.main" }} />
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "warning.main" }}>
                      {preview.missingAdvisors.length} venta(s) sin asesor reconocido — se importarán sin asignar
                    </Typography>
                  </Box>
                  <TableContainer sx={{ maxHeight: 180 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {["Factura","Fecha","Cliente","Placa","Asesor en Excel"].map(h => (
                            <TableCell key={h} sx={{ fontWeight: 900, fontSize: "0.68rem",
                              color: "text.secondary", textTransform: "uppercase",
                              letterSpacing: 0.5, bgcolor: "action.hover" }}>
                              {h}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {preview.missingAdvisors.map((r, i) => (
                          <TableRow key={i} sx={{ "&:last-child td": { borderBottom: "none" } }}>
                            <TableCell>
                              <Typography sx={{ fontWeight: 700, color: "#f6ad55", fontSize: "0.76rem" }}>
                                {r.invoice || "—"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" sx={{ color: "text.secondary" }}>{r.saleDate}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontSize: "0.76rem" }}>{r.clientName}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography sx={{ fontFamily: "monospace", fontSize: "0.72rem", fontWeight: 700 }}>
                                {r.plate || "—"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" sx={{ color: "warning.main", fontStyle: "italic" }}>
                                "{r.rawAdvisor}" — no encontrado
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box sx={{ px: 2, py: 1, borderTop: "0.5px solid", borderColor: "divider" }}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Podrás asignar el asesor manualmente editando cada venta después de importar,
                      o filtrando por "Sin asesor asignado" en la tabla de ventas.
                    </Typography>
                  </Box>
                </Paper>
              )}

              {/* Tabla de ventas válidas */}
              {preview.valid?.length > 0 && (
                <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
                  <Box sx={{ px: 2, py: 1.25, borderBottom: "0.5px solid", borderColor: "divider",
                    display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>
                      Ventas que se importarán ({preview.valid.length})
                    </Typography>
                    <Chip size="small" label="Vista previa" sx={{ fontWeight: 700, fontSize: "0.65rem" }} />
                  </Box>
                  <TableContainer sx={{ maxHeight: 260 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          {["Factura","Fecha","Cliente","Placa","Vehículo","Asesor"].map((h) => (
                            <TableCell key={h} sx={{ fontWeight: 900, fontSize: "0.7rem", color: "text.secondary",
                              textTransform: "uppercase", letterSpacing: 0.5, bgcolor: "action.hover" }}>
                              {h}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {preview.valid.slice(0, 50).map((r) => (
                          <TableRow key={r.row} hover sx={{ "&:last-child td": { borderBottom: "none" } }}>
                            <TableCell>
                              <Typography sx={{ fontWeight: 700, color: "#63b3ed", fontSize: "0.78rem" }}>
                                {r.invoice || "—"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" sx={{ color: "text.secondary" }}>{r.saleDate}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontSize: "0.78rem" }}>{r.clientName}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography sx={{ fontFamily: "monospace", fontSize: "0.72rem", fontWeight: 700 }}>
                                {r.plate || "—"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                                {r.vehicleLabel}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                {!r.advisorFound && (
                                  <Tooltip title="Asesor no encontrado — quedará sin asignar">
                                    <WarningAmberRoundedIcon sx={{ fontSize: 13, color: "warning.main" }} />
                                  </Tooltip>
                                )}
                                <Typography variant="caption" sx={{ color: r.advisorFound ? "text.primary" : "text.disabled" }}>
                                  {r.advisorFound ? r.advisorName : "Sin asignar"}
                                </Typography>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                        {preview.valid.length > 50 && (
                          <TableRow>
                            <TableCell colSpan={6} sx={{ textAlign: "center", py: 1 }}>
                              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                … y {preview.valid.length - 50} más
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}

              {preview.summary.canImport === 0 && (
                <Alert severity="error">
                  No hay ventas válidas para importar. Verifica que los códigos de vehículo existan en el sistema.
                </Alert>
              )}

              {importStep === "importing" && (
                <Box>
                  <LinearProgress sx={{ borderRadius: 1 }} />
                  <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
                    Insertando ventas en el sistema…
                  </Typography>
                </Box>
              )}
            </Stack>
          )}

          {/* ── Paso 3: Resultado final ── */}
          {importStep === "done" && results && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircleOutlineRoundedIcon sx={{ color: "success.main", fontSize: 22 }} />
                <Typography sx={{ fontWeight: 900 }}>Importación completada</Typography>
              </Stack>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1 }}>
                {[
                  { label: "Creadas",      value: results.created, color: "#68d391", bg: "rgba(104,211,145,0.08)", border: "rgba(104,211,145,0.3)" },
                  { label: "Actualizadas", value: results.updated, color: "#63b3ed", bg: "rgba(99,179,237,0.08)",  border: "rgba(99,179,237,0.3)"  },
                  { label: "Omitidas",     value: results.skipped, color: "text.secondary", bg: "rgba(160,160,160,0.08)", border: "rgba(160,160,160,0.2)" },
                ].map(({ label, value, color, bg, border }) => (
                  <Box key={label} sx={{ p: 1.5, borderRadius: 1.5, textAlign: "center", bgcolor: bg, border: `0.5px solid ${border}` }}>
                    <Typography sx={{ fontSize: "1.6rem", fontWeight: 900, color, lineHeight: 1 }}>{value}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>{label}</Typography>
                  </Box>
                ))}
              </Box>

              {results.errors?.length > 0 && (
                <Box sx={{ borderRadius: 1.5, border: "0.5px solid", borderColor: "warning.main",
                  bgcolor: "rgba(246,173,85,0.05)", p: 1.5, maxHeight: 160, overflowY: "auto" }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "warning.main", mb: 0.5, display: "block" }}>
                    Errores ({results.errors.length}):
                  </Typography>
                  {results.errors.map((e, i) => (
                    <Typography key={i} variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.8 }}>
                      {e.invoice || `Fila ${e.row}`}: {e.error}
                    </Typography>
                  ))}
                </Box>
              )}
            </Stack>
          )}

          {/* Descarga plantilla — siempre visible */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            p: 1.25, borderRadius: 1.5, bgcolor: "background.paper",
            border: "0.5px solid", borderColor: "divider" }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>¿Necesitas la plantilla?</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Descarga el formato de ejemplo con las columnas correctas.
              </Typography>
            </Box>
            <Button size="small" variant="outlined" startIcon={<FileDownloadRoundedIcon />}
              onClick={downloadSalesTemplate} sx={{ borderRadius: 2, whiteSpace: "nowrap", flexShrink: 0, ml: 1 }}>
              Descargar plantilla
            </Button>
          </Box>

        </Stack>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between", bgcolor: "background.paper" }}>

        {/* Botón izquierdo */}
        {importStep === "preview_ready" ? (
          <Button startIcon={<ArrowBackRoundedIcon />} variant="outlined" sx={{ borderRadius: 2 }}
            onClick={() => useSalesStore.setState({ importStep: "dropzone", importPreview: null })}>
            Cambiar archivo
          </Button>
        ) : (
          <Button onClick={closeImport} variant="outlined" sx={{ borderRadius: 2 }}>
            {importStep === "done" ? "Cerrar" : "Cancelar"}
          </Button>
        )}

        {/* Botón derecho */}
        {importStep === "dropzone" && (
          <Button onClick={runPreview} variant="contained" disabled={!importFile || isImporting}
            sx={{ fontWeight: 900, borderRadius: 2 }}>
            {isImporting ? <><CircularProgress size={14} sx={{ mr: 1 }} />Analizando…</> : "Analizar archivo"}
          </Button>
        )}

        {importStep === "preview_ready" && preview?.summary?.canImport > 0 && (
          <Button onClick={runImport} variant="contained" disabled={isImporting}
            sx={{ fontWeight: 900, borderRadius: 2, bgcolor: "#68d391", color: "#1A202C",
              "&:hover": { bgcolor: "#48BB78" } }}>
            {isImporting
              ? <><CircularProgress size={14} sx={{ mr: 1 }} />Importando…</>
              : `✓ Importar ${preview.summary.canImport} venta(s)`
            }
          </Button>
        )}

        {importStep === "done" && (
          <Button onClick={closeImport} variant="contained" sx={{ fontWeight: 900, borderRadius: 2 }}>
            Listo
          </Button>
        )}

      </DialogActions>
    </Dialog>
  );
}
