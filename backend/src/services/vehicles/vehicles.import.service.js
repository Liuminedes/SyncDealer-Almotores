// backend/src/services/vehicles/vehicles.import.service.js
//
// Lógica de importación de vehículos desde Excel.
//
// Columnas esperadas (fila 1 = encabezados, fila 2 en adelante = datos):
//   A: CODIGO        — clave única por marca
//   B: MODELO
//   C: VERSION
//   D: AÑO MODELO    — opcional, numérico
//   E: TABLA 1       — valor comisión en pesos, puede estar vacío
//   F: TABLA 2
//   G: TABLA 3
//   H: TABLA 4
//   (precio comercial NO se importa — se gestiona manualmente)
//
// Comportamiento:
//   - Si el código ya existe para la marca → UPDATE (modelo, version, año, rates)
//   - Si no existe → CREATE
//   - Celdas de TABLA vacías → no se guardan (no sobreescriben valor existente)
//   - sale_price NUNCA se toca en este proceso

import XLSX from "xlsx";
import { sequelize } from "../../config/db.js";
import { HttpError }  from "../../utils/httpError.js";
import Vehicle         from "../../models/Vehicle.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Limpia y normaliza un string de celda */
function cellStr(val) {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

/** Convierte valor de celda monetaria a número limpio.
 *  El Excel puede venir con "$", ".", "," según locale.
 *  Retorna null si está vacío o no es numérico. */
function cellMoney(val) {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return Number.isFinite(val) ? Math.round(val * 100) / 100 : null;
  // String: quitar $, espacios, puntos de miles, reemplazar coma decimal
  const cleaned = String(val)
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")   // miles colombianos: 209.281 → 209281
    .replace(/,/g, ".");  // decimal: 209,28 → 209.28
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

/** Devuelve el ID del scheme activo para la marca, o null */
async function getActiveSchemeId(brand_id) {
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
  return rows?.[0]?.id ? Number(rows[0].id) : null;
}

/** Devuelve mapa { TABLA_1: tierId, TABLA_2: tierId, ... } para el scheme */
async function getTierMap(scheme_id) {
  const [rows] = await sequelize.query(
    `SELECT id, tier_name FROM commission_tiers WHERE scheme_id = :scheme_id`,
    { replacements: { scheme_id } }
  );
  const map = {};
  for (const r of rows || []) {
    const name = String(r.tier_name || "").toUpperCase().trim();
    if (/^TABLA_\d+$/.test(name)) map[name] = Number(r.id);
  }
  return map; // { TABLA_1: 5, TABLA_2: 6, ... }
}

/** Upsert de un rate: si existe lo actualiza, si no lo crea */
async function upsertRate({ scheme_id, vehicle_code, tier_id, amount, t }) {
  await sequelize.query(
    `INSERT INTO commission_vehicle_rates
       (scheme_id, vehicle_code, model, version, tier_id, amount, created_at, updated_at)
     VALUES (:scheme_id, :code, '', '', :tier_id, :amount, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       amount     = VALUES(amount),
       updated_at = NOW()`,
    { replacements: { scheme_id, code: vehicle_code, tier_id, amount }, transaction: t }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Función principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Procesa el buffer del archivo Excel y realiza el upsert en BD.
 *
 * @param {Buffer}  fileBuffer   — req.file.buffer de multer
 * @param {number}  brand_id     — ID de la marca destino
 * @returns {Object}             — resumen { created, updated, skipped, errors[] }
 */
export async function importVehiclesFromExcel(fileBuffer, brand_id) {
  if (!fileBuffer || !fileBuffer.length) throw new HttpError(400, "El archivo está vacío");
  const bid = Number(brand_id);
  if (!bid) throw new HttpError(400, "brand_id es requerido");

  // ── 1) Parsear Excel ────────────────────────────────────────────────────────
  let workbook;
  try {
    workbook = XLSX.read(fileBuffer, { type: "buffer", cellFormula: false });
  } catch {
    throw new HttpError(400, "No se pudo leer el archivo Excel. Verifica que sea .xlsx o .xls válido.");
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new HttpError(400, "El archivo Excel no tiene hojas.");

  // raw:false → valores formateados como string (respeta $ del formato de celda)
  // raw:true  → valores numéricos reales
  // Usamos raw:true para obtener los números reales y evitar el "$" del formato
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,        // array de arrays
    raw: true,        // valores numéricos
    defval: null,     // celdas vacías = null
    blankrows: false, // ignorar filas completamente vacías
  });

  if (rows.length < 2) throw new HttpError(400, "El archivo no tiene datos (mínimo 1 fila de encabezado + 1 de datos).");

  // ── 2) Validar encabezados (fila 0) ─────────────────────────────────────────
  const headers = (rows[0] || []).map(h => cellStr(h).toUpperCase());
  // Mapeo flexible: buscar columnas por nombre o usar posición fija
  const colIdx = {
    CODIGO:     headers.findIndex(h => h.includes("CODIGO") || h.includes("CÓDIGO")),
    MODELO:     headers.findIndex(h => h.includes("MODELO")),
    VERSION:    headers.findIndex(h => h.includes("VERSION") || h.includes("VERSIÓN")),
    ANO_MODELO: headers.findIndex(h => h.includes("AÑO") || h.includes("ANO") || h.includes("YEAR")),
    TABLA_1:    headers.findIndex(h => h.includes("TABLA 1") || h.includes("TABLA_1") || h === "E"),
    TABLA_2:    headers.findIndex(h => h.includes("TABLA 2") || h.includes("TABLA_2") || h === "F"),
    TABLA_3:    headers.findIndex(h => h.includes("TABLA 3") || h.includes("TABLA_3") || h === "G"),
    TABLA_4:    headers.findIndex(h => h.includes("TABLA 4") || h.includes("TABLA_4") || h === "H"),
  };

  // Fallback a posiciones fijas si no encontró por nombre (A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7)
  if (colIdx.CODIGO     < 0) colIdx.CODIGO     = 0;
  if (colIdx.MODELO     < 0) colIdx.MODELO     = 1;
  if (colIdx.VERSION    < 0) colIdx.VERSION    = 2;
  if (colIdx.ANO_MODELO < 0) colIdx.ANO_MODELO = 3;
  if (colIdx.TABLA_1    < 0) colIdx.TABLA_1    = 4;
  if (colIdx.TABLA_2    < 0) colIdx.TABLA_2    = 5;
  if (colIdx.TABLA_3    < 0) colIdx.TABLA_3    = 6;
  if (colIdx.TABLA_4    < 0) colIdx.TABLA_4    = 7;

  // ── 3) Obtener scheme y tiers ────────────────────────────────────────────────
  const scheme_id = await getActiveSchemeId(bid);
  const tierMap   = scheme_id ? await getTierMap(scheme_id) : {};
  // tierMap puede estar vacío si la marca no tiene scheme activo aún — en ese
  // caso se crean los vehículos pero sin rates (se importarán cuando haya scheme)

  // ── 4) Procesar filas ────────────────────────────────────────────────────────
  const dataRows  = rows.slice(1); // saltamos la fila de encabezados
  const results   = { created: 0, updated: 0, skipped: 0, errors: [] };

  const t = await sequelize.transaction();
  try {
    for (let i = 0; i < dataRows.length; i++) {
      const row     = dataRows[i];
      const rowNum  = i + 2; // número de fila en el Excel (para mensajes de error)

      const code    = cellStr(row[colIdx.CODIGO]);
      const model   = cellStr(row[colIdx.MODELO]);
      const version = cellStr(row[colIdx.VERSION]);

      // Fila sin código → saltar silenciosamente
      if (!code) { results.skipped++; continue; }
      // Fila sin modelo o versión → registrar error y continuar
      if (!model)   { results.errors.push({ row: rowNum, code, error: "MODELO vacío" });   results.skipped++; continue; }
      if (!version) { results.errors.push({ row: rowNum, code, error: "VERSION vacía" });  results.skipped++; continue; }

      const model_year = row[colIdx.ANO_MODELO] ? Number(row[colIdx.ANO_MODELO]) : null;

      // Rates — solo los que tengan valor numérico positivo
      const rawRates = {
        TABLA_1: cellMoney(row[colIdx.TABLA_1]),
        TABLA_2: cellMoney(row[colIdx.TABLA_2]),
        TABLA_3: cellMoney(row[colIdx.TABLA_3]),
        TABLA_4: cellMoney(row[colIdx.TABLA_4]),
      };
      // Filtrar solo los que vengan con valor (los vacíos no se tocan)
      const rates = Object.fromEntries(
        Object.entries(rawRates).filter(([, v]) => v !== null)
      );

      try {
        // ── Buscar si ya existe ────────────────────────────────────────────────
        const existing = await Vehicle.findOne({
          where: { brand_id: bid, code },
          transaction: t,
        });

        if (existing) {
          // UPDATE — nunca tocamos sale_price
          await existing.update({ model, version, model_year, updated_at: new Date() }, { transaction: t });

          // Actualizar rates que vengan en el Excel (los vacíos los dejamos igual)
          if (scheme_id) {
            for (const [tierName, amount] of Object.entries(rates)) {
              const tier_id = tierMap[tierName];
              if (!tier_id) continue; // tier no existe en el scheme, saltar
              await upsertRate({ scheme_id, vehicle_code: code, tier_id, amount, t });
            }
          }
          results.updated++;
        } else {
          // CREATE — sale_price queda null (se pone manualmente después)
          await Vehicle.create(
            { brand_id: bid, code, model, version, model_year, sale_price: null, is_active: true },
            { transaction: t }
          );

          // Crear rates iniciales
          if (scheme_id) {
            for (const [tierName, amount] of Object.entries(rates)) {
              const tier_id = tierMap[tierName];
              if (!tier_id) continue;
              await upsertRate({ scheme_id, vehicle_code: code, tier_id, amount, t });
            }
          }
          results.created++;
        }
      } catch (rowErr) {
        // Error en una fila no aborta todo — lo registramos y seguimos
        results.errors.push({
          row:   rowNum,
          code,
          error: rowErr?.parent?.sqlMessage || rowErr?.message || "Error desconocido",
        });
        results.skipped++;
      }
    }

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  return results;
}

/**
 * Genera el buffer de un Excel plantilla con las columnas correctas
 * para que el usuario no adivine el formato.
 */
export function generateImportTemplate() {
  const wb = XLSX.utils.book_new();

  const data = [
    // Fila 1: Encabezados
    ["CODIGO", "MODELO", "VERSION", "AÑO MODELO", "TABLA 1", "TABLA 2", "TABLA 3", "TABLA 4"],
    // Filas de ejemplo
    ["JA3M20__25G1001", "NEW PICANTO", "VIBRANT",   2026, 209281, 292994, 334850, 376707],
    ["BL1A60__24G1602", "K3 SEDÁN",   "ZENITH",    2027, 342812, 479936, 548499, 617061],
    ["AB1M20__24G1400", "SOLUTO",     "EMOTION",   2026, 248980, 348572, 398367, 448163],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Ancho de columnas
  ws["!cols"] = [
    { wch: 20 }, // CODIGO
    { wch: 16 }, // MODELO
    { wch: 12 }, // VERSION
    { wch: 12 }, // AÑO MODELO
    { wch: 12 }, // TABLA 1
    { wch: 12 }, // TABLA 2
    { wch: 12 }, // TABLA 3
    { wch: 12 }, // TABLA 4
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Vehículos");

  // Hoja de instrucciones
  const instrData = [
    ["INSTRUCCIONES DE IMPORTACIÓN"],
    [""],
    ["Columna",      "Descripción",                          "Obligatorio"],
    ["CODIGO",       "Código único del vehículo por marca",  "SÍ"],
    ["MODELO",       "Nombre del modelo (ej: NEW PICANTO)",  "SÍ"],
    ["VERSION",      "Versión (ej: VIBRANT, ZENITH)",        "SÍ"],
    ["AÑO MODELO",   "Año del modelo (ej: 2026)",            "No"],
    ["TABLA 1",      "Valor comisión en pesos para tabla 1", "No"],
    ["TABLA 2",      "Valor comisión en pesos para tabla 2", "No"],
    ["TABLA 3",      "Valor comisión en pesos para tabla 3", "No"],
    ["TABLA 4",      "Valor comisión en pesos para tabla 4", "No"],
    [""],
    ["NOTAS:"],
    ["- El precio comercial NO se importa. Se gestiona manualmente en el CRUD."],
    ["- Si el CODIGO ya existe para la marca, se actualizarán los campos."],
    ["- Si el CODIGO no existe, se creará un vehículo nuevo."],
    ["- Las celdas de TABLA vacías no sobreescriben el valor existente en BD."],
    ["- Los valores de TABLA deben ser números en pesos (sin $ ni puntos de miles)."],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instrData);
  wsInstr["!cols"] = [{ wch: 18 }, { wch: 50 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, "Instrucciones");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
