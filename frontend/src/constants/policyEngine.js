// Espejo del backend — tipos de condición disponibles en el frontend

export const CONDITION_META = {
  // Para REGLAS
  ADVISOR_ON_VACATION:          { label: "Asesor en vacaciones",                   needsValue: false, needsVehicle: false, scope: "rule"  },
  ADVISOR_TENURE_LESS_THAN:     { label: "Antigüedad menor a X meses",             needsValue: true,  needsVehicle: false, scope: "rule",  valuePlaceholder: "Meses" },
  ADVISOR_TENURE_GREATER_EQUAL: { label: "Antigüedad mayor o igual a X meses",     needsValue: true,  needsVehicle: false, scope: "rule",  valuePlaceholder: "Meses" },
  UNITS_LESS_THAN:              { label: "Vendió menos de X unidades",             needsValue: true,  needsVehicle: false, scope: "rule",  valuePlaceholder: "Unidades" },
  UNITS_GREATER_EQUAL:          { label: "Vendió X o más unidades",                needsValue: true,  needsVehicle: false, scope: "rule",  valuePlaceholder: "Unidades" },
  UNITS_EQUAL:                  { label: "Vendió exactamente X unidades",          needsValue: true,  needsVehicle: false, scope: "rule",  valuePlaceholder: "Unidades" },
  // Para BONOS
  MIN_TOTAL_UNITS:              { label: "Total de unidades ≥ X",                  needsValue: true,  needsVehicle: false, scope: "bonus", valuePlaceholder: "Unidades mínimas" },
  MIN_UNITS_OF_VEHICLE:         { label: "Vendió ≥ X unidades del vehículo",       needsValue: true,  needsVehicle: true,  scope: "bonus", valuePlaceholder: "Unidades mínimas" },
  EXACT_UNITS_OF_VEHICLE:       { label: "Vendió exactamente X del vehículo",      needsValue: true,  needsVehicle: true,  scope: "bonus", valuePlaceholder: "Unidades exactas" },
};

export const RULE_CONDITION_TYPES  = Object.entries(CONDITION_META).filter(([, m]) => m.scope === "rule").map(([k]) => k);
export const BONUS_CONDITION_TYPES = Object.entries(CONDITION_META).filter(([, m]) => m.scope === "bonus").map(([k]) => k);

export const EFFECT_LABELS = {
  FORCE_TIER:      { label: "Forzar tier",    icon: "⚡", color: "warning" },
  FIXED_ADD:       { label: "Sumar monto",    icon: "➕", color: "success" },
  FIXED_SUBTRACT:  { label: "Descontar monto",icon: "➖", color: "error"   },
};