import { http } from "./http";

export const commissionsApi = {
  schemes: async (brand) => (await http.get("/commission-schemes", { params: { brand } })).data,
};
