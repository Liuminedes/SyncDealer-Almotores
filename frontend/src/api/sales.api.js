import { http } from "./http";

export const salesApi = {
  list: async (params) => (await http.get("/sales", { params })).data,
  create: async (payload) => (await http.post("/sales", payload)).data,
};
