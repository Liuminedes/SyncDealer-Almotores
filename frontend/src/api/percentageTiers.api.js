import { http } from "./http";

export const percentageTiersApi = {
  listByScheme: async (schemeId) => {
    const { data } = await http.get(`/schemes/${schemeId}/percentage-tiers`);
    return data; // { items: [...] }
  },
  upsert: async (schemeId, tierId, payload) => {
    const { data } = await http.put(`/schemes/${schemeId}/percentage-tiers/${tierId}`, payload);
    return data; // { item }
  },
};
