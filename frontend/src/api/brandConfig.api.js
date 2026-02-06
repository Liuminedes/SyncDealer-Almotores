import { http } from "./http";

export const brandConfigApi = {
  // scheme
  getScheme: async (brandId) => {
    const { data } = await http.get(`/brands/${brandId}/scheme`);
    return data; // { scheme }
  },
  upsertScheme: async (brandId, payload) => {
    const { data } = await http.put(`/brands/${brandId}/scheme`, payload);
    return data; // { scheme }
  },

  // tiers
  listTiers: async (schemeId) => {
    const { data } = await http.get(`/schemes/${schemeId}/tiers`);
    return Array.isArray(data?.tiers) ? data.tiers : [];
  },
  createTier: async (schemeId, payload) => {
    const { data } = await http.post(`/schemes/${schemeId}/tiers`, payload);
    return data; // { tier }
  },
  updateTier: async (tierId, payload) => {
    const { data } = await http.put(`/tiers/${tierId}`, payload);
    return data; // { tier }
  },
  deleteTier: async (tierId) => {
    const { data } = await http.delete(`/tiers/${tierId}`);
    return data; // { ok: true }
  },
};
