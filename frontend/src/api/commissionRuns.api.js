// frontend/src/api/commissionRuns.api.js
import { http } from "./http";

export const commissionRunsApi = {
  // Admin / BrandOp
  list:      async (params = {})          => (await http.get("/commission-runs",             { params })).data,
  getById:   async (id, params = {})      => (await http.get(`/commission-runs/${id}`,       { params })).data,
  calculate: async (payload, params = {}) => (await http.post("/commission-runs/calculate",   payload, { params })).data,

  // Asesor
  myRuns:         async (params = {}) => (await http.get("/commission-runs/my",                    { params })).data,
  advisorApprove: async (id)          => (await http.post(`/commission-runs/${id}/advisor-approve`)).data,
  advisorReject:  async (id, note)    => (await http.post(`/commission-runs/${id}/advisor-reject`,  { note })).data,

  // BrandOp / Admin — flujo posterior
  validate: async (id, brand) => (await http.post(`/commission-runs/${id}/validate`,   {}, { params: { brand } })).data,
  sendToHR: async (id, brand) => (await http.post(`/commission-runs/${id}/send-to-hr`, {}, { params: { brand } })).data,
  remove:   async (id, brand) => (await http.delete(`/commission-runs/${id}`,              { params: { brand } })).data,
};