import { http } from "./http";

export const branchesApi = {
  list: (params) =>
    http.get("/branches", { params }).then((r) => r.data),

  getById: (id) =>
    http.get(`/branches/${id}`).then((r) => r.data),
};