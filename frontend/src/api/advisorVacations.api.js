import { http } from "./http";

export const vacationsApi = {
  list:   (advisorId)           => http.get(`/users/${advisorId}/vacations`).then(r => r.data),
  create: (advisorId, payload)  => http.post(`/users/${advisorId}/vacations`, payload).then(r => r.data),
  update: (advisorId, id, payload) => http.put(`/users/${advisorId}/vacations/${id}`, payload).then(r => r.data),
  delete: (advisorId, id)       => http.delete(`/users/${advisorId}/vacations/${id}`).then(r => r.data),
};