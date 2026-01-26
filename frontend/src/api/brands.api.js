import { http } from "./http";

export const brandsApi = {
  // ✅ Siempre devuelve un array
  list: async () => {
    const res = await http.get("/brands");
    const brands = res?.data?.brands;
    return Array.isArray(brands) ? brands : [];
  },
};
