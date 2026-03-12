import { http } from "./http";

export const dashboardApi = {
  /**
   * @param {{ sales_year, sales_month, comm_year, comm_month }} params
   * sales_* = mes seleccionado (ventas actuales)
   * comm_*  = mes anterior (comisiones a mostrar)
   */
  getStats: (params = {}) => http.get("/dashboard", { params }).then((r) => r.data),
};