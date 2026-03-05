import { http } from "./http";

export const dashboardApi = {
  getStats: (params = {}) => http.get("/dashboard", { params }).then((r) => r.data),
};