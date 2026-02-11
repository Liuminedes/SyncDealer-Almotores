import { http } from "./http";

export const schemeTiersApi = {
  listByScheme: async (schemeId) => (await http.get(`/schemes/${schemeId}/tiers`)).data,
};
