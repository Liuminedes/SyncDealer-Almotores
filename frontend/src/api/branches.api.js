import { http } from "./http";

export const branchesApi = {
  list:    ()         => http.get("/branches").then(r => r.data),
  getById: (id)       => http.get(`/branches/${id}`).then(r => r.data),
  create:  (payload)  => http.post("/branches", payload).then(r => r.data),
  update:  (id, payload) => http.put(`/branches/${id}`, payload).then(r => r.data),
  remove:  (id)       => http.delete(`/branches/${id}`).then(r => r.data),
};