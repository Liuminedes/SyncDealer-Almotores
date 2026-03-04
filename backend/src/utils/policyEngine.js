/**
 * Motor de evaluación de condiciones para reglas y bonos.
 * Todas las condiciones de una policy se evalúan con AND.
 */

export const CONDITION_TYPES = {
  // Reglas
  ADVISOR_ON_VACATION:        "ADVISOR_ON_VACATION",
  ADVISOR_TENURE_LESS_THAN:   "ADVISOR_TENURE_LESS_THAN",
  ADVISOR_TENURE_GREATER_EQUAL:"ADVISOR_TENURE_GREATER_EQUAL",
  UNITS_LESS_THAN:            "UNITS_LESS_THAN",
  UNITS_GREATER_EQUAL:        "UNITS_GREATER_EQUAL",
  UNITS_EQUAL:                "UNITS_EQUAL",
  // Bonos
  MIN_TOTAL_UNITS:            "MIN_TOTAL_UNITS",
  MIN_UNITS_OF_VEHICLE:       "MIN_UNITS_OF_VEHICLE",
  EXACT_UNITS_OF_VEHICLE:     "EXACT_UNITS_OF_VEHICLE",
};

export const CONDITION_META = {
  ADVISOR_ON_VACATION:         { label: "Asesor en vacaciones",          needsValue: false, needsVehicle: false, scope: "rule" },
  ADVISOR_TENURE_LESS_THAN:    { label: "Antigüedad menor a X meses",    needsValue: true,  needsVehicle: false, scope: "rule", valuePlaceholder: "Meses" },
  ADVISOR_TENURE_GREATER_EQUAL:{ label: "Antigüedad mayor o igual a X meses", needsValue: true, needsVehicle: false, scope: "rule", valuePlaceholder: "Meses" },
  UNITS_LESS_THAN:             { label: "Vendió menos de X unidades",    needsValue: true,  needsVehicle: false, scope: "rule", valuePlaceholder: "Unidades" },
  UNITS_GREATER_EQUAL:         { label: "Vendió X o más unidades",       needsValue: true,  needsVehicle: false, scope: "rule", valuePlaceholder: "Unidades" },
  UNITS_EQUAL:                 { label: "Vendió exactamente X unidades", needsValue: true,  needsVehicle: false, scope: "rule", valuePlaceholder: "Unidades" },
  MIN_TOTAL_UNITS:             { label: "Total de unidades ≥ X",         needsValue: true,  needsVehicle: false, scope: "bonus", valuePlaceholder: "Unidades mínimas" },
  MIN_UNITS_OF_VEHICLE:        { label: "Vendió ≥ X unidades del vehículo", needsValue: true, needsVehicle: true, scope: "bonus", valuePlaceholder: "Unidades mínimas" },
  EXACT_UNITS_OF_VEHICLE:      { label: "Vendió exactamente X unidades del vehículo", needsValue: true, needsVehicle: true, scope: "bonus", valuePlaceholder: "Unidades exactas" },
};

/**
 * Evalúa una condición individual dado el contexto de la corrida.
 * @param {object} condition  - { type, value?, vehicle_id? }
 * @param {object} ctx        - { unitsTotal, salesRows, hireDate, isOnVacation, unitsByVehicle }
 */
export function evaluateCondition(condition, ctx) {
  const v = Number(condition.value ?? 0);

  switch (condition.type) {
    case "ADVISOR_ON_VACATION":
      return ctx.isOnVacation === true;

    case "ADVISOR_TENURE_LESS_THAN":
      return ctx.tenureMonths !== null && ctx.tenureMonths < v;

    case "ADVISOR_TENURE_GREATER_EQUAL":
      return ctx.tenureMonths !== null && ctx.tenureMonths >= v;

    case "UNITS_LESS_THAN":
      return ctx.unitsTotal < v;

    case "UNITS_GREATER_EQUAL":
      return ctx.unitsTotal >= v;

    case "UNITS_EQUAL":
      return ctx.unitsTotal === v;

    case "MIN_TOTAL_UNITS":
      return ctx.unitsTotal >= v;

    case "MIN_UNITS_OF_VEHICLE": {
      const vehicleId = Number(condition.vehicle_id);
      const count = ctx.unitsByVehicle?.get(vehicleId) ?? 0;
      return count >= v;
    }

    case "EXACT_UNITS_OF_VEHICLE": {
      const vehicleId = Number(condition.vehicle_id);
      const count = ctx.unitsByVehicle?.get(vehicleId) ?? 0;
      return count === v;
    }

    default:
      return false;
  }
}

/**
 * Evalúa todas las condiciones de una policy (AND).
 * Retorna true solo si TODAS se cumplen.
 */
export function evaluatePolicy(conditions, ctx) {
  if (!Array.isArray(conditions) || conditions.length === 0) return false;
  return conditions.every((c) => evaluateCondition(c, ctx));
}

/**
 * Valida que un array de condiciones sea estructuralmente correcto.
 * Lanza un error descriptivo si hay problemas.
 */
export function validateConditions(conditions, scope = "any") {
  if (!Array.isArray(conditions)) throw new Error("conditions debe ser un array");
  if (conditions.length === 0) throw new Error("Debe tener al menos una condición");

  for (const [i, c] of conditions.entries()) {
    if (!c.type) throw new Error(`Condición ${i + 1}: falta el tipo`);
    if (!CONDITION_META[c.type]) throw new Error(`Condición ${i + 1}: tipo '${c.type}' no reconocido`);

    const meta = CONDITION_META[c.type];

    if (scope !== "any" && meta.scope !== scope) {
      throw new Error(`Condición ${i + 1}: '${c.type}' no aplica para ${scope}`);
    }
    if (meta.needsValue && (c.value === undefined || c.value === null || c.value === "")) {
      throw new Error(`Condición ${i + 1}: '${c.type}' requiere un valor numérico`);
    }
    if (meta.needsValue && isNaN(Number(c.value))) {
      throw new Error(`Condición ${i + 1}: el valor debe ser numérico`);
    }
    if (meta.needsValue && Number(c.value) < 0) {
      throw new Error(`Condición ${i + 1}: el valor no puede ser negativo`);
    }
    if (meta.needsVehicle && !c.vehicle_id) {
      throw new Error(`Condición ${i + 1}: '${c.type}' requiere seleccionar un vehículo`);
    }
  }
}