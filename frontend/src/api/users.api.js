import { http } from "./http";

export const usersApi = {
  list: async () => (await http.get("/users")).data,
  getById: async (id) => (await http.get(`/users/${id}`)).data,
  create: async (payload) => (await http.post("/users", payload)).data,
  update: async (id, payload) => (await http.put(`/users/${id}`, payload)).data,
  setStatus: async (id, isActive) =>
    (await http.patch(`/users/${id}/status`, { is_active: isActive })).data,
};
