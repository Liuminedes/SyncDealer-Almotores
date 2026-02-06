import { http } from "./http";

export const brandsAdminApi = {

  getById: async (id) => {
    const res = await http.get(`/brands/${id}`);
    return res?.data?.brand || null;
  },

  listAll: async () => {
    const res = await http.get("/brands/admin");
    const brands = res?.data?.brands;
    return Array.isArray(brands) ? brands : [];
  },

  create: async ({ name, code, is_active }) => {
    const res = await http.post("/brands", { name, code, is_active });
    return res?.data;
  },

  update: async (id, { name, code, is_active }) => {
    const res = await http.put(`/brands/${id}`, { name, code, is_active });
    return res?.data;
  },
};
