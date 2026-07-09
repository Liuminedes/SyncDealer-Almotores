import { Op } from "sequelize";
import { sequelize } from "../../config/db.js";
import { HttpError } from "../../utils/httpError.js";

import Vehicle from "../../models/Vehicle.js";
import Brand   from "../../models/Brand.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers privados
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valida que un nombre de tier tenga formato TABLA_<número>.
 * Retorna el nombre normalizado en mayúsculas, o null si no aplica.
 */
function normalizeTierName(name) {
  const n = String(name || "").toUpperCase().trim();
  return /^TABLA_\d+$/.test(n) ? n : null;
}

/**
 * Obtiene el ID del scheme activo para una marca.
 * Lanza 400 si no hay scheme activo.
 */
async function getActiveSchemeIdByBrand(brand_id) {
  const [rows] = await sequelize.query(
    `SELECT cs.id
     FROM commission_schemes cs
     WHERE cs.brand_id  = :brand_id
       AND cs.status    = 'ACTIVE'
       AND (cs.valid_to IS NULL OR cs.valid_to >= CURDATE())
       AND cs.valid_from <= CURDATE()
     ORDER BY cs.valid_from DESC, cs.id DESC
     LIMIT 1`,
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

/**
 * Devuelve un mapa { TABLA_1: id, TABLA_2: id, ... } con todos los tiers
 * que existan en el scheme. Dinámico: no depende de nombres específicos.
 * Lanza 400 si no hay ningún tier configurado.
 */
async function getTierIdsByScheme(scheme_id) {
  const [rows] = await sequelize.query(
    `SELECT id, tier_name
     FROM commission_tiers
     WHERE scheme_id = :scheme_id`,
    { replacements: { scheme_id } }
  );

  const map = {};
  for (const r of rows || []) {
    const name = normalizeTierName(r.tier_name);
    if (name) map[name] = Number(r.id);
  }

  if (Object.keys(map).length === 0) {
    throw new HttpError(
      400,
      "El scheme activo no tiene tablas de comisión configuradas (TABLA_1, TABLA_2…)."
    );
  }

  return map; // ej: { TABLA_1: 5, TABLA_2: 6, TABLA_3: 7, TABLA_4: 8 }
}

/**
 * Carga las rates de comisión para una lista de códigos de vehículo.
 * Devuelve un Map: vehicleCode → { TABLA_1: amount, TABLA_2: amount, ... }
 * Solo incluye las tablas que existan en BD; el caller decide qué hacer
 * con las que falten (null).
 */
async function fetchRatesForVehicles({ scheme_id, vehicleCodes = [] }) {
  if (!vehicleCodes.length) return new Map();

  const [rows] = await sequelize.query(
    `SELECT cvr.vehicle_code, ct.tier_name, cvr.amount
     FROM commission_vehicle_rates cvr
     JOIN commission_tiers ct ON ct.id = cvr.tier_id
     WHERE cvr.scheme_id    = :scheme_id
       AND cvr.vehicle_code IN (:codes)`,
    { replacements: { scheme_id, codes: vehicleCodes } }
  );

  const byCode = new Map();
  for (const r of rows || []) {
    const code = String(r.vehicle_code);
    const tier = normalizeTierName(r.tier_name);
    if (!tier) continue;

    if (!byCode.has(code)) byCode.set(code, {});
    byCode.get(code)[tier] = Number(r.amount);
  }

  return byCode;
}

/**
 * Obtiene todos los nombres de tier del scheme activo de una marca.
 * Se usa para construir el objeto "rates vacío" por defecto.
 */
async function getEmptyRatesTemplate(scheme_id) {
  const [rows] = await sequelize.query(
    `SELECT tier_name FROM commission_tiers WHERE scheme_id = :scheme_id ORDER BY priority ASC, id ASC`,
    { replacements: { scheme_id } }
  );
  const template = {};
  for (const r of rows || []) {
    const name = normalizeTierName(r.tier_name);
    if (name) template[name] = null;
  }
  return template;
}

/**
 * Inserta o actualiza los rates de un vehículo para cada tabla que venga
 * en el payload. Solo procesa claves con formato TABLA_N.
 * No toca las tablas que no vengan en rates.
 */
async function upsertVehicleRates({ scheme_id, tierIds, vehicle_code, rates = {}, t }) {
  // Iterar dinámicamente solo las claves TABLA_N que lleguen en el payload
  const entries = Object.entries(rates).filter(([k]) => normalizeTierName(k) !== null);

  for (const [tierName, value] of entries) {
    const normalName = normalizeTierName(tierName);
    const tier_id    = tierIds[normalName];

    if (!tier_id) {
      // El tier está en el payload pero no existe en BD para este scheme → ignorar silenciosamente
      // (puede pasar si se envía TABLA_4 antes de que esté en BD)
      continue;
    }

    if (value === null || value === undefined || value === "") {
      // Valor vacío → saltar (no borrar rate existente)
      continue;
    }

    const amount = Number(value);
    if (isNaN(amount) || amount < 0) {
      throw new HttpError(400, `Valor inválido para ${normalName}: ${value}`);
    }

    await sequelize.query(
      `INSERT INTO commission_vehicle_rates
         (scheme_id, vehicle_code, model, version, tier_id, amount, created_at, updated_at)
       VALUES (:scheme_id, :vehicle_code, '', '', :tier_id, :amount, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         amount     = VALUES(amount),
         updated_at = NOW()`,
      {
        transaction: t,
        replacements: { scheme_id, vehicle_code, tier_id, amount },
      }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────────────────────

export async function listVehicles(query = {}) {
  const page   = Number(query.page  || 1);
  const limit  = Math.min(Number(query.limit || 10), 100);
  const offset = (page - 1) * limit;

  const q        = String(query.q || "").trim();
  const brand_id = query.brand_id ? Number(query.brand_id) : null;
  const status   = String(query.status || "active").toLowerCase();

  const where = {};
  if (brand_id) where.brand_id  = brand_id;
  if (status === "active")   where.is_active = true;
  if (status === "inactive") where.is_active = false;

  if (q) {
    where[Op.or] = [
      { code:    { [Op.like]: `%${q}%` } },
      { model:   { [Op.like]: `%${q}%` } },
      { version: { [Op.like]: `%${q}%` } },
    ];
  }

  const { rows, count } = await Vehicle.findAndCountAll({
    where,
    include: [{ model: Brand, as: "brand", attributes: ["id", "name", "code"] }],
    order:   [["id", "DESC"]],
    limit,
    offset,
  });

  // Rates y template de tablas vacías (dinámico)
  let ratesMap      = new Map();
  let emptyTemplate = {};

  if (brand_id) {
    const scheme_id  = await getActiveSchemeIdByBrand(brand_id);
    const codes      = rows.map((v) => String(v.code));
    ratesMap         = await fetchRatesForVehicles({ scheme_id, vehicleCodes: codes });
    emptyTemplate    = await getEmptyRatesTemplate(scheme_id);
  }

  const items = rows.map((v) => {
    const existingRates = ratesMap.get(String(v.code)) || {};
    // Mezclar template vacío con los rates que existan → garantiza todas las claves
    const rates = { ...emptyTemplate, ...existingRates };

    return {
      id:         v.id,
      brand_id:   v.brand_id,
      brand:      v.brand ? { id: v.brand.id, name: v.brand.name, code: v.brand.code } : null,
      code:       v.code,
      model:      v.model,
      version:    v.version,
      model_year: v.model_year,
      sale_price: v.sale_price ? Number(v.sale_price) : null,
      is_active:  !!v.is_active,
      rates,
      created_at: v.created_at,
      updated_at: v.updated_at,
    };
  });

  return { items, page, limit, total: count, totalPages: Math.ceil(count / limit) };
}

export async function getVehicleById(id) {
  const v = await Vehicle.findByPk(id, {
    include: [{ model: Brand, as: "brand", attributes: ["id", "name", "code"] }],
  });
  if (!v) throw new HttpError(404, "Vehículo no encontrado");

  const scheme_id     = await getActiveSchemeIdByBrand(v.brand_id);
  const ratesMap      = await fetchRatesForVehicles({ scheme_id, vehicleCodes: [String(v.code)] });
  const emptyTemplate = await getEmptyRatesTemplate(scheme_id);
  const rates         = { ...emptyTemplate, ...(ratesMap.get(String(v.code)) || {}) };

  return {
    id:         v.id,
    brand_id:   v.brand_id,
    brand:      v.brand ? { id: v.brand.id, name: v.brand.name, code: v.brand.code } : null,
    code:       v.code,
    model:      v.model,
    version:    v.version,
    model_year: v.model_year,
    sale_price: v.sale_price ? Number(v.sale_price) : null,
    is_active:  !!v.is_active,
    rates,
    created_at: v.created_at,
    updated_at: v.updated_at,
  };
}

export async function createVehicle(payload) {
  const brand_id = Number(payload.brand_id);
  if (!brand_id) throw new HttpError(400, "brand_id requerido");

  const code    = String(payload.code    || "").trim();
  const model   = String(payload.model   || "").trim();
  const version = String(payload.version || "").trim();

  if (!code)    throw new HttpError(400, "code requerido");
  if (!model)   throw new HttpError(400, "model requerido");
  if (!version) throw new HttpError(400, "version requerido");

  const model_year  = payload.model_year  ? Number(payload.model_year) : null;
  const sale_price  = (payload.sale_price == null) ? null : Number(payload.sale_price);

  const brand = await Brand.findByPk(brand_id);
  if (!brand) throw new HttpError(400, "Marca inválida");

  const scheme_id = await getActiveSchemeIdByBrand(brand_id);
  const tierIds   = await getTierIdsByScheme(scheme_id);

  const created = await sequelize.transaction(async (t) => {
    const exists = await Vehicle.findOne({ where: { brand_id, code }, transaction: t });
    if (exists) throw new HttpError(409, "Ya existe un vehículo con ese código para esta marca");

    const v = await Vehicle.create(
      {
        brand_id, code, model, version, model_year, sale_price,
        is_active: payload.is_active === undefined ? true : !!payload.is_active,
      },
      { transaction: t }
    );

    if (payload.rates) {
      await upsertVehicleRates({ scheme_id, tierIds, vehicle_code: code, rates: payload.rates, t });
    }

    return v;
  });

  return getVehicleById(created.id);
}

export async function updateVehicle(id, payload) {
  const v = await Vehicle.findByPk(id);
  if (!v) throw new HttpError(404, "Vehículo no encontrado");

  const patch = {};
  if (payload.model      !== undefined) patch.model      = String(payload.model || "").trim();
  if (payload.version    !== undefined) patch.version    = String(payload.version || "").trim();
  if (payload.model_year !== undefined) patch.model_year = payload.model_year ? Number(payload.model_year) : null;
  if (payload.sale_price !== undefined) {
    patch.sale_price = (payload.sale_price === null || payload.sale_price === "") ? null : Number(payload.sale_price);
  }
  if (payload.is_active !== undefined) patch.is_active = !!payload.is_active;

  const scheme_id = await getActiveSchemeIdByBrand(v.brand_id);
  const tierIds   = await getTierIdsByScheme(scheme_id);

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
