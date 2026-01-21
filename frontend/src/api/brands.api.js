import { http } from "./http";

export const brandsApi = {
    list: async () => {
        const { data } = await http.get("/brands");
        return { data: data?.brands || [] }; // { ok, data }
    },
};
