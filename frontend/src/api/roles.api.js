import { http } from "./http";

export const rolesApi = {
    list: async () => {
        const { data } = await http.get("/roles");
        return { data: data?.roles || data?.data || [] }; // { ok, data }
    },
};
