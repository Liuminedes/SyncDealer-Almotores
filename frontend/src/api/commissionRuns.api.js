import { http } from "./http";

export const commissionRunsApi = {
  list:    async (params = {})           => (await http.get("/commission-runs", { params })).data,
  getById: async (id, params = {})       => (await http.get(`/commission-runs/${id}`, { params })).data,
  calculate: async (payload, params = {}) =>
    (await http.post("/commission-runs/calculate", payload, { params })).data,
  delete:  async (id, params = {})       =>
    (await http.delete(`/commission-runs/${id}`, { params })).data,
};