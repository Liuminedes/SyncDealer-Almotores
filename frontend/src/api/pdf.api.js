import { http } from "./http";

export const pdfApi = {
  downloadStatementPdf: async (statementId) =>
    http.get(`/pdf/statements/${statementId}`, { responseType: "blob" }),
};
