import { Op } from "sequelize";
import { sequelize } from "../../config/db.js";
import { HttpError } from "../../utils/httpError.js";

// Import directo (evita líos por index.js)
import Vehicle from "../../models/Vehicle.js";
import Brand from "../../models/Brand.js";

/**
 * Helpers
 */
function normalizeTierName(name) {
  const n = String(name || "").toUpperCase().trim();
  if (n === "TABLA_1" || n === "TABLA_2" || n === "TABLA_3") return n;
  return null;
}

async function getActiveSchemeIdByBrand(brand_id) {
  const [rows] = await sequelize.query(
    `
    SELECT cs.id
    FROM commission_schemes cs
    WHERE cs.brand_id = :brand_id
      AND cs.status = 'ACTIVE'
      AND (cs.valid_to IS NULL OR cs.valid_to >= CURDATE())
      AND cs.valid_from <= CURDATE()
    ORDER BY cs.valid_from DESC, cs.id DESC
    LIMIT 1
    `,
    { replacements: { brand_id } }
  );

  const schemeId = rows?.[0]?.id;
  if (!schemeId) {
    throw new HttpError(
      400,
      "No hay un plan de comisiones ACTIVO para esta marca. Crea/activa uno primero."
    );
  }
  return Number(schemeId);
}

async function getTierIdsByScheme(scheme_id) {
  const [rows] = await sequelize.query(
    `
    SELECT id, tier_name
    FROM commission_tiers
    WHERE scheme_id = :scheme_id
    `,
    { replacements: { scheme_id } }
  );

  const map = {};
  for (const r of rows || []) map[String(r.tier_name)] = Number(r.id);

  // Validación mínima: deben existir las 3 tablas
  if (!map.TABLA_1 || !map.TABLA_2 || !map.TABLA_3) {
    throw new HttpError(
      400,
      "El scheme activo no tiene configuradas TABLA_1, TABLA_2 y TABLA_3 en commission_tiers."
    );
  }

  return map; // {TABLA_1: id, TABLA_2: id, TABLA_3: id}
}

async function fetchRatesForVehicles({ scheme_id, vehicleCodes = [] }) {
  if (!vehicleCodes.length) return new Map();

  // Nota: IN con replacements en sequelize.query (array) funciona bien en MySQL/MariaDB
  const [rows] = await sequelize.query(
    `
    SELECT cvr.vehicle_code, ct.tier_name, cvr.amount
    FROM commission_vehicle_rates cvr
    JOIN commission_tiers ct ON ct.id = cvr.tier_id
    WHERE cvr.scheme_id = :scheme_id
      AND cvr.vehicle_code IN (:codes)
    `,
    { replacements: { scheme_id, codes: vehicleCodes } }
  );

  // Map: code -> {TABLA_1, TABLA_2, TABLA_3}
  const byCode = new Map();
  for (const r of rows || []) {
    const code = String(r.vehicle_code);
    const tier = normalizeTierName(r.tier_name);
    if (!tier) continue;

    if (!byCode.has(code)) {
      byCode.set(code, { TABLA_1: null, TABLA_2: null, TABLA_3: null });
    }
    byCode.get(code)[tier] = Number(r.amount);
  }

  return byCode;
}

async function upsertVehicleRates({ scheme_id, tierIds, vehicle_code, rates = {}, t }) {
  const entries = [
    ["TABLA_1", rates.TABLA_1],
    ["TABLA_2", rates.TABLA_2],
    ["TABLA_3", rates.TABLA_3],
  ];

  for (const [tierName, value] of entries) {
    if (value === undefined) continue; // si no viene, no lo tocamos
    const tier_id = tierIds[tierName];
    if (!tier_id) throw new HttpError(400, `Tier ${tierName} no existe en el scheme activo`);

    // Si value es null -> lo dejamos en null? No: amount es NOT NULL.
    if (value === null || Number.isNaN(Number(value))) {
      throw new HttpError(400, `Valor inválido para ${tierName}`);
    }

    await sequelize.query(
      `
      INSERT INTO commission_vehicle_rates (scheme_id, vehicle_code, model, version, tier_id, amount, created_at, updated_at)
      VALUES (:scheme_id, :vehicle_code, '', '', :tier_id, :amount, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        amount = VALUES(amount),
        updated_at = NOW()
      `,
      {
        transaction: t,
        replacements: {
          scheme_id,
          vehicle_code,
          tier_id,
          amount: Number(value),
        },
      }
    );
  }
}

/**
 * Public API
 */

export async function listVehicles(query = {}) {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);
  const offset = (page - 1) * limit;

  const q = String(query.q || "").trim();
  const brand_id = query.brand_id ? Number(query.brand_id) : null;
  const status = String(query.status || "active").toLowerCase(); // active|inactive|all

  const where = {};
  if (brand_id) where.brand_id = brand_id;

  if (status === "active") where.is_active = true;
  if (status === "inactive") where.is_active = false;

  if (q) {
    where[Op.or] = [
      { code: { [Op.like]: `%${q}%` } },
      { model: { [Op.like]: `%${q}%` } },
      { version: { [Op.like]: `%${q}%` } },
    ];
  }

  const { rows, count } = await Vehicle.findAndCountAll({
    where,
    include: [{ model: Brand, as: "brand", attributes: ["id", "name", "code"] }],
    order: [["id", "DESC"]],
    limit,
    offset,
  });

  // Si viene brand_id: incluimos rates según scheme activo
  let ratesMap = new Map();
  if (brand_id) {
    const scheme_id = await getActiveSchemeIdByBrand(brand_id);
    const codes = rows.map((v) => String(v.code));
    ratesMap = await fetchRatesForVehicles({ scheme_id, vehicleCodes: codes });
  }

  const items = rows.map((v) => ({
    id: v.id,
    brand_id: v.brand_id,
    brand: v.brand ? { id: v.brand.id, name: v.brand.name, code: v.brand.code } : null,
    code: v.code,
    model: v.model,
    version: v.version,
    model_year: v.model_year,
    sale_price: v.sale_price ? Number(v.sale_price) : null,
    is_active: !!v.is_active,
    rates: brand_id
      ? (ratesMap.get(String(v.code)) || { TABLA_1: null, TABLA_2: null, TABLA_3: null })
      : { TABLA_1: null, TABLA_2: null, TABLA_3: null },
    created_at: v.created_at,
    updated_at: v.updated_at,
  }));

  return {
    items,
    page,
    limit,
    total: count,
    totalPages: Math.ceil(count / limit),
  };
}

export async function getVehicleById(id) {
  const v = await Vehicle.findByPk(id, {
    include: [{ model: Brand, as: "brand", attributes: ["id", "name", "code"] }],
  });
  if (!v) throw new HttpError(404, "Vehículo no encontrado");

  // rates solo si hay scheme activo
  const scheme_id = await getActiveSchemeIdByBrand(v.brand_id);
  const ratesMap = await fetchRatesForVehicles({ scheme_id, vehicleCodes: [String(v.code)] });

  return {
    id: v.id,
    brand_id: v.brand_id,
    brand: v.brand ? { id: v.brand.id, name: v.brand.name, code: v.brand.code } : null,
    code: v.code,
    model: v.model,
    version: v.version,
    model_year: v.model_year,
    sale_price: v.sale_price ? Number(v.sale_price) : null,
    is_active: !!v.is_active,
    rates: ratesMap.get(String(v.code)) || { TABLA_1: null, TABLA_2: null, TABLA_3: null },
    created_at: v.created_at,
    updated_at: v.updated_at,
  };
}

export async function createVehicle(payload) {
  const brand_id = Number(payload.brand_id);
  if (!brand_id) throw new HttpError(400, "brand_id requerido");

  const code = String(payload.code || "").trim();
  const model = String(payload.model || "").trim();
  const version = String(payload.version || "").trim();

  if (!code) throw new HttpError(400, "code requerido");
  if (!model) throw new HttpError(400, "model requerido");
  if (!version) throw new HttpError(400, "version requerido");

  const model_year = payload.model_year ? Number(payload.model_year) : null;
  const sale_price =
    payload.sale_price === null || payload.sale_price === undefined
      ? null
      : Number(payload.sale_price);

  // validar brand exista
  const brand = await Brand.findByPk(brand_id);
  if (!brand) throw new HttpError(400, "Marca inválida");

  // scheme activo + tier ids (para rates)
  const scheme_id = await getActiveSchemeIdByBrand(brand_id);
  const tierIds = await getTierIdsByScheme(scheme_id);

  // Transacción: vehicle + rates
  const created = await sequelize.transaction(async (t) => {
    // unique (brand_id, code)
    const exists = await Vehicle.findOne({ where: { brand_id, code }, transaction: t });
    if (exists) throw new HttpError(409, "Ya existe un vehículo con ese code para esta marca");

    const v = await Vehicle.create(
      {
        brand_id,
        code,
        model,
        version,
        model_year,
        sale_price,
        is_active: payload.is_active === undefined ? true : !!payload.is_active,
      },
      { transaction: t }
    );

    if (payload.rates) {
      await upsertVehicleRates({
        scheme_id,
        tierIds,
        vehicle_code: code,
        rates: payload.rates,
        t,
      });
    }

    return v;
  });

  return getVehicleById(created.id);
}

export async function updateVehicle(id, payload) {
  const v = await Vehicle.findByPk(id);
  if (!v) throw new HttpError(404, "Vehículo no encontrado");

  // no permitimos cambiar brand_id ni code por seguridad de consistencia
  const patch = {};

  if (payload.model !== undefined) patch.model = String(payload.model || "").trim();
  if (payload.version !== undefined) patch.version = String(payload.version || "").trim();
  if (payload.model_year !== undefined)
    patch.model_year = payload.model_year ? Number(payload.model_year) : null;

  if (payload.sale_price !== undefined) {
    patch.sale_price =
      payload.sale_price === null || payload.sale_price === ""
        ? null
        : Number(payload.sale_price);
  }

  if (payload.is_active !== undefined) patch.is_active = !!payload.is_active;

  const scheme_id = await getActiveSchemeIdByBrand(v.brand_id);
  const tierIds = await getTierIdsByScheme(scheme_id);

  await sequelize.transaction(async (t) => {
    await v.update(patch, { transaction: t });

    if (payload.rates) {
      await upsertVehicleRates({
        scheme_id,
        tierIds,
        vehicle_code: String(v.code),
        rates: payload.rates,
        t,
      });
    }
  });

  return getVehicleById(id);
}

export async function setVehicleStatus(id, is_active) {
  const v = await Vehicle.findByPk(id);
  if (!v) throw new HttpError(404, "Vehículo no encontrado");

  await v.update({ is_active: !!is_active });
  return { id: v.id, is_active: !!v.is_active };
}
