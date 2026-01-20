import { http } from "./http";

export const notificationsApi = {
  list: async () => (await http.get("/notifications")).data,
};
