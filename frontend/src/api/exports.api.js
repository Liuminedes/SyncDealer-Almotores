import { http } from "./http";

export const exportsApi = {
  // Listar corridas ASST_VALIDATED
  list: (params) => http.get("/exports", { params }).then(r => r.data),

  // Descargar PDF individual — retorna blob
  downloadPdf: (runId) =>
    http.get(`/exports/${runId}/pdf`, { responseType: "blob" }).then(r => r.data),

  // Descargar ZIP masivo — retorna blob
  downloadZip: (payload) =>
    http.post("/exports/zip", payload, { responseType: "blob" }).then(r => r.data),

  // Enviar por email a RRHH
  sendToHR: (payload) =>
    http.post("/exports/send-to-hr", payload).then(r => r.data),
};