import { http } from "./http";

export const schemeRulesBonusesApi = {
  // Rules
  listRules:   (schemeId)               => http.get(`/schemes/${schemeId}/rules`).then(r => r.data.data),
  createRule:  (schemeId, payload)      => http.post(`/schemes/${schemeId}/rules`, payload).then(r => r.data.data),
  updateRule:  (schemeId, ruleId, payload) => http.put(`/schemes/${schemeId}/rules/${ruleId}`, payload).then(r => r.data.data),
  deleteRule:  (schemeId, ruleId)       => http.delete(`/schemes/${schemeId}/rules/${ruleId}`).then(r => r.data),

  // Bonuses
  listBonuses:  (schemeId)                 => http.get(`/schemes/${schemeId}/bonuses`).then(r => r.data.data),
  createBonus:  (schemeId, payload)        => http.post(`/schemes/${schemeId}/bonuses`, payload).then(r => r.data.data),
  updateBonus:  (schemeId, bonusId, payload) => http.put(`/schemes/${schemeId}/bonuses/${bonusId}`, payload).then(r => r.data.data),
  deleteBonus:  (schemeId, bonusId)        => http.delete(`/schemes/${schemeId}/bonuses/${bonusId}`).then(r => r.data),
};