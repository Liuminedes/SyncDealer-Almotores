import { http } from "./http";

export const authApi = {
  login: async ({ email, password }) => {
    const { data } = await http.post("/auth/login", { email, password });
    return data; // { token, user }
  },
  me: async () => {
    const { data } = await http.get("/auth/me");
    return data; // { user }
  },
};
