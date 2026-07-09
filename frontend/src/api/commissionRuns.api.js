// frontend/src/api/commissionRuns.api.js
import { http } from "./http";

export const commissionRunsApi = {
  // ── Admin / BrandOp ──────────────────────────────────────────────────────
  list:    async (params = {})          => (await http.get("/commission-runs",            { params })).data,
  getById: async (id, params = {})      => (await http.get(`/commission-runs/${id}`,      { params })).data,
  calculate: async (payload, params = {}) =>
    (await http.post("/commission-runs/calculate", payload, { params })).data,

  // ── Ajuste manual ─────────────────────────────────────────────────────────
  applyAdjustment: async (id, brand, payload) =>
    (await http.patch(`/commission-runs/${id}/adjustment`, payload, { params: { brand } })).data,
  removeAdjustment: async (id, brand) =>
    (await http.delete(`/commission-runs/${id}/adjustment`, { params: { brand } })).data,

  // ── Asesor ────────────────────────────────────────────────────────────────
  myRuns:         async (params = {}) => (await http.get("/commission-runs/my",                      { params })).data,
  myRunById:      async (id)          => (await http.get(`/commission-runs/my/${id}`)).data,
  advisorApprove: async (id)          => (await http.post(`/commission-runs/${id}/advisor-approve`)).data,
  advisorReject:  async (id, note)    => (await http.post(`/commission-runs/${id}/advisor-reject`, { note })).data,

  // ── BrandOp / Admin — flujo posterior ────────────────────────────────────
  validate: async (id, brand) =>
    (await http.post(`/commission-runs/${id}/validate`,   {}, { params: { brand } })).data,
  sendToHR: async (id, brand) =>
    (await http.post(`/commission-runs/${id}/send-to-hr`, {}, { params: { brand } })).data,
  delete: async (id, params = {}) =>
    (await http.delete(`/commission-runs/${id}`, { params })).data,

  // Nota: descarga de PDF individual se hace via exportsApi.downloadPdf(runId)
  // que usa GET /exports/:id/pdf — no requiere ?brand
};