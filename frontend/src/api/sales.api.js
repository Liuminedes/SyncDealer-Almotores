import { http } from "./http";

export const salesApi = {
  list: async (params = {}) => (await http.get("/sales", { params })).data,
  getById: async (id) => (await http.get(`/sales/${id}`)).data,
  create: async (payload) => (await http.post("/sales", payload)).data,
  update: async (id, payload) => (await http.put(`/sales/${id}`, payload)).data,
  remove: async (id) => (await http.delete(`/sales/${id}`)).data,
};
