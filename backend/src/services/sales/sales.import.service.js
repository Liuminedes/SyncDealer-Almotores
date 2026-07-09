// backend/src/services/sales/sales.import.service.js
//
// Soporta DOS formatos automáticamente (detección por encabezados):
//
// FORMATO A — Export plataforma anterior (12 columnas):
//   0:Refer.  1:Prefijo fra.  2:Número  3:Vendedor  4:Nombre vendedor
//   5:Cédula/NIT  6:Nombre cliente  7:Placa  8:Cod.modelo
//   9:Fec.fact  10:F.cierre  11:F.placa
//   → invoice = Prefijo-Número, sale_date = F.placa
//
// FORMATO B — Base_Comisiones (16 columnas):
//   0:PEDIDO  1:Con.  2:Cliente  3:Vendedor  4:VEHICULO  5:Color
//   6:F.apert.  7:DIA MATRICULA  8:Serie/Nro  9:CIUDAD  10:SOAT
//   11:PLACA  12:Chasis  13:INDICADOR  14:MES  15:FAMILIA
//   → invoice = Serie/Nro, sale_date = F.apert(año+mes) + DIA MATRICULA(día)

import XLSX from "xlsx";
import { sequelize } from "../../config/db.js";
import { HttpError }  from "../../utils/httpError.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cellStr(val) {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

/**
 * Extrae código del vehículo — último token del campo VEHICULO.
 * "SPORTAGE MOD 2026 NQ2A35__25G2000" → "NQ2A35__25G2000"
 * "PICANTO MOD 2027 JA3M45__25G1202"  → "JA3M45__25G1202"
 */
function extractVehicleCode(rawModel) {
  const str = cellStr(rawModel);
  if (!str) return null;
  const parts = str.trim().split(/\s+/);
  const last  = parts[parts.length - 1];
  return /^[A-Z0-9_\-]{5,}$/i.test(last) ? last.toUpperCase() : null;
}

/** "1265 BRYAN LOSADA QUICENO" → "BRYAN LOSADA QUICENO" */
function cleanAdvisorName(raw) {
  return cellStr(raw).replace(/^\d+\s+/, "").trim();
}

function parseDateVal(val) {
  if (!val) return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof val === "number") {
    try {
      const date = XLSX.SSF.parse_date_code(val);
      if (date) return `${date.y}-${String(date.m).padStart(2,"0")}-${String(date.d).padStart(2,"0")}`;
    } catch { /* fallthrough */ }
  }
  const str = cellStr(val);
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,"0")}-${dmy[1].padStart(2,"0")}`;
  const ymd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2,"0")}-${ymd[3].padStart(2,"0")}`;
  return null;
}

/**
 * FORMATO B — construye la fecha de matrícula usando SOLO el día de la columna
 * y calculando el mes/año anterior al momento actual de importación.
 *
 * Lógica: si importas en Mayo 2026 → mes anterior = Abril 2026
 *         si importas en Enero 2027 → mes anterior = Diciembre 2026
 *
 * Ejemplo: DIA = 5, importando en Mayo 2026 → "2026-04-05"
 */
function buildMatriculaDate(diaMat) {
  const dia = Number(diaMat);
  if (!dia || dia < 1 || dia > 31) return null;

  // Mes anterior al momento de la importación
  const now       = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const y = prevMonth.getFullYear();
  const m = String(prevMonth.getMonth() + 1).padStart(2, "0");
  const d = String(dia).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

// ─── Detección de formato ─────────────────────────────────────────────────────

function detectFormat(headers) {
  const h = headers.map(x => cellStr(x).toLowerCase());
  if (h.some(x => x.includes("dia matricula") || x.includes("dia mat"))) return "B";
  if (h.includes("pedido") || h.includes("familia") || h.includes("chasis")) return "B";
  if (h.some(x => x.includes("prefijo") || x.includes("f.placa"))) return "A";
  return h.length >= 14 ? "B" : "A";
}

// ─── Parseo por formato ───────────────────────────────────────────────────────

function parseRowA(row) {
  const p = cellStr(row[1]); const n = cellStr(row[2]);
  const invoice = (!p && !n) ? null : (!p ? n : !n ? p : `${p}-${n}`);
  return {
    invoice,
    vehicleCode: extractVehicleCode(row[8]),
    saleDate:    parseDateVal(row[11]),
    clientName:  cellStr(row[6]),
    plate:       cellStr(row[7]),
    rawAdvisor:  cellStr(row[4]),
  };
}

function parseRowB(row) {
  return {
    invoice:     cellStr(row[8]),             // Serie/Nro → "EVEM 5971"
    vehicleCode: extractVehicleCode(row[4]),  // VEHICULO
    saleDate:    buildMatriculaDate(row[7]),  // DIA MATRICULA → mes anterior + día
    clientName:  cellStr(row[2]),             // Cliente
    plate:       cellStr(row[11]),            // PLACA
    rawAdvisor:  cellStr(row[3]),             // Vendedor
  };
}

// ─── Catálogos BD ─────────────────────────────────────────────────────────────

async function loadVehicleMap(brand_id) {
  const [rows] = await sequelize.query(
    `SELECT id, code, model, version FROM vehicles WHERE brand_id = :brand_id AND is_active = 1`,
    { replacements: { brand_id } }
  );
  const map = {};
  for (const r of rows || [])
    map[String(r.code).toUpperCase()] = { id: Number(r.id), model: r.model, version: r.version, code: r.code };
  return map;
}

/**
 * Busca el vehículo más parecido cuando el código exacto no existe.
 * Estrategia: quitar el último carácter del código y buscar el candidato
 * que tenga el prefijo más largo en común desde el inicio.
 *
 * Ejemplos:
 *   "QY2A35__25G1503" → prefijo "QY2A35__25G150" → match: "QY2A35__25G1501"
 *   "AB1M23T_24G1404" → prefijo "AB1M23T_24G140" → match: "AB1M23T_24G1400"
 */
function findClosestVehicle(code, vehicleMap) {
  if (!code) return null;
  const truncated = code.slice(0, -1); // quitar último carácter
  if (truncated.length < 8) return null; // prefijo demasiado corto

  const codes = Object.keys(vehicleMap);
  let bestMatch = null;
  let bestScore = 0;

  for (const candidate of codes) {
    // Contar caracteres coincidentes desde el inicio
    let commonLen = 0;
    const minLen  = Math.min(truncated.length, candidate.length);
    for (let i = 0; i < minLen; i++) {
      if (truncated[i] === candidate[i]) commonLen++;
      else break;
    }
    // El candidato debe compartir todo el prefijo truncado
    // y no diferir más de 2 caracteres en longitud total
    const lengthDiff = Math.abs(candidate.length - code.length);
    if (commonLen >= truncated.length && lengthDiff <= 2 && commonLen > bestScore) {
      bestScore = commonLen;
      bestMatch = vehicleMap[candidate];
    }
  }

  return bestMatch;
}


async function loadAdvisorList(brand_id) {
  const [rows] = await sequelize.query(
    `SELECT DISTINCT u.id, u.full_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     JOIN user_brand_access uba ON uba.user_id = u.id
     WHERE uba.brand_id = :brand_id AND u.is_active = 1
       AND LOWER(r.name) LIKE '%advisor%'`,
    { replacements: { brand_id } }
  );
  // Devolver lista plana — el matching se hace por token scoring, no por mapa de partes
  return (rows || []).map(r => ({ id: Number(r.id), full_name: r.full_name }));
}

/**
 * Matching por token scoring:
 * Cuenta cuántas palabras del Excel coinciden con las del nombre en BD.
 * Elige el asesor con MÁS palabras en común. Mínimo 2 coincidencias.
 *
 * Ejemplo:
 *   Excel: "1789 PARADA ARIAS MIGUEL ANGEL"  → tokens: PARADA ARIAS MIGUEL ANGEL
 *   BD "Miguel Angel Parada Arias"           → 4 coincidencias ← GANADOR
 *   BD "Lizeth Yurany Parada Gutierrez"      → 1 coincidencia  (solo PARADA)
 */
function findAdvisor(rawName, advisorList) {
  const cleaned = cleanAdvisorName(rawName).toUpperCase().trim();
  if (!cleaned) return null;

  const excelTokens = new Set(cleaned.split(/\s+/).filter(w => w.length > 1));
  if (excelTokens.size === 0) return null;

  let bestAdvisor = null;
  let bestScore   = 0;

  for (const advisor of advisorList) {
    const dbTokens = new Set(advisor.full_name.toUpperCase().split(/\s+/).filter(w => w.length > 1));
    // Intersección: palabras que están en ambos
    let matches = 0;
    for (const token of excelTokens) {
      if (dbTokens.has(token)) matches++;
    }
    // Necesita al menos 2 palabras en común para evitar falsos positivos
    if (matches >= 2 && matches > bestScore) {
      bestScore   = matches;
      bestAdvisor = advisor;
    }
  }

  return bestAdvisor;
}

function readRows(fileBuffer) {
  let workbook;
  try {
    workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  } catch {
    throw new HttpError(400, "No se pudo leer el archivo. Verifica que sea .xlsx o .xls válido.");
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });
  if (rows.length < 2) throw new HttpError(400, "El archivo no tiene datos.");
  return rows;
}

// ─── Pre-validación ───────────────────────────────────────────────────────────

export async function preValidateSalesExcel(fileBuffer, brand_id) {
  if (!fileBuffer?.length) throw new HttpError(400, "El archivo está vacío");
  const bid = Number(brand_id);
  if (!bid) throw new HttpError(400, "brand_id es requerido");

  const allRows  = readRows(fileBuffer);
  const format   = detectFormat(allRows[0] || []);
  const dataRows = allRows.slice(1);

  const [vehicleMap, advisorList] = await Promise.all([
    loadVehicleMap(bid),
    loadAdvisorList(bid),
  ]);

  const valid              = [];
  const missingVehicles    = [];
  const missingAdvisors    = [];
  const skipped            = [];
  const vehicleCodesNotFound = new Set();

  for (let i = 0; i < dataRows.length; i++) {
    const row    = dataRows[i];
    const rowNum = i + 2;

    const parsed = format === "B" ? parseRowB(row) : parseRowA(row);
    const { invoice, vehicleCode, saleDate, clientName, plate, rawAdvisor } = parsed;

    if (!vehicleCode && !clientName && !saleDate) {
      skipped.push({ row: rowNum, reason: "Fila vacía" }); continue;
    }
    if (!saleDate) {
      skipped.push({ row: rowNum, invoice, reason: "Sin fecha de matrícula" }); continue;
    }
    if (!clientName) {
      skipped.push({ row: rowNum, invoice, reason: "Sin nombre de cliente" }); continue;
    }

    // 1) Búsqueda exacta
    let vehicle      = vehicleCode ? vehicleMap[vehicleCode] : null;
    let vehicleMatched = vehicleCode; // código que finalmente se usó
    let fuzzyMatch   = false;

    // 2) Si no hay match exacto → buscar el más parecido (quitar último carácter)
    if (!vehicle && vehicleCode) {
      const closest = findClosestVehicle(vehicleCode, vehicleMap);
      if (closest) {
        vehicle       = closest;
        vehicleMatched = closest.code;
        fuzzyMatch    = true; // flag para mostrarlo en el preview
      }
    }

    // 3) Si aún no hay vehículo → bloqueado, no se importa
    if (!vehicle) {
      const rawCol = format === "B" ? cellStr(row[4]) : cellStr(row[8]);
      vehicleCodesNotFound.add(vehicleCode || rawCol);
      missingVehicles.push({ row: rowNum, invoice,
        vehicleCode: vehicleCode || "(no extraído)", rawModel: rawCol, clientName, saleDate });
      continue;
    }

    const advisor = findAdvisor(rawAdvisor, advisorList);
    if (!advisor)
      missingAdvisors.push({ row: rowNum, invoice,
        rawAdvisor: cleanAdvisorName(rawAdvisor), vehicleCode, clientName, saleDate });

    valid.push({
      row: rowNum, invoice,
      vehicleCode:   vehicleMatched,         // código real usado
      vehicleCodeOrig: vehicleCode,          // código original del Excel
      fuzzyMatch,                            // true si fue match aproximado
      vehicleId:    vehicle.id,
      vehicleLabel: `${vehicle.model} ${vehicle.version}`.trim(),
      advisorId:    advisor?.id     || null,
      advisorName:  advisor?.full_name || cleanAdvisorName(rawAdvisor),
      advisorFound: !!advisor,
      clientName, plate: plate || null, saleDate, format,
    });
  }

  return {
    total: dataRows.length, format,
    valid, missingVehicles, missingAdvisors, skipped,
    vehicleCodesNotFound: [...vehicleCodesNotFound],
    summary: {
      canImport:        valid.length,
      blockedByVehicle: missingVehicles.length,
      withoutAdvisor:   missingAdvisors.length,
      skipped:          skipped.length,
    },
  };
}

// ─── Importación ──────────────────────────────────────────────────────────────

export async function importSalesFromExcel(fileBuffer, brand_id) {
  const { valid, summary } = await preValidateSalesExcel(fileBuffer, brand_id);
  if (!valid.length) throw new HttpError(400, "No hay ventas válidas para importar.");

  const bid     = Number(brand_id);
  const results = { created: 0, updated: 0, skipped: 0, errors: [] };
  const t = await sequelize.transaction();

  try {
    for (const row of valid) {
      try {
        const [, mStr, dStr] = row.saleDate.split("-");
        const m  = Number(mStr);
        const d  = Number(dStr);
        const fn = d <= 15 ? "FIRST" : "SECOND";

        const [existing] = await sequelize.query(
          `SELECT id FROM sales WHERE invoice = :invoice AND brand_id = :bid LIMIT 1`,
          { replacements: { invoice: row.invoice, bid }, transaction: t }
        );

        if (existing?.length > 0) {
          await sequelize.query(
            `UPDATE sales SET vehicle_id=:vid, advisor_id=:aid, client_name=:cn, plate=:plate,
             sale_date=:sd, cut_month=:cm, fortnight=:fn, charge_month=NULL, updated_at=NOW()
             WHERE id=:id`,
            { replacements: { vid: row.vehicleId, aid: row.advisorId, cn: row.clientName,
                plate: row.plate, sd: row.saleDate, cm: m, fn, id: Number(existing[0].id) }, transaction: t }
          );
          results.updated++;
        } else {
          await sequelize.query(
            `INSERT INTO sales (brand_id,vehicle_id,advisor_id,invoice,client_name,plate,
             sale_date,cut_month,fortnight,charge_month,created_at,updated_at)
             VALUES (:bid,:vid,:aid,:inv,:cn,:plate,:sd,:cm,:fn,NULL,NOW(),NOW())`,
            { replacements: { bid, vid: row.vehicleId, aid: row.advisorId, inv: row.invoice,
                cn: row.clientName, plate: row.plate, sd: row.saleDate, cm: m, fn }, transaction: t }
          );
          results.created++;
        }
      } catch (rowErr) {
        results.errors.push({ row: row.row, invoice: row.invoice,
          error: rowErr?.parent?.sqlMessage || rowErr?.message || "Error" });
        results.skipped++;
      }
    }
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  return { ...results, summary };
}

// ─── Plantilla ────────────────────────────────────────────────────────────────

export function generateSalesImportTemplate() {
  const wb = XLSX.utils.book_new();

  const data = [
    ["PEDIDO","Con.","Cliente","Vendedor","VEHICULO","Color","F.apert.","DIA MATRICULA","Serie/Nro","CIUDAD","SOAT","PLACA","Chasis","INDICADOR","MES","FAMILIA"],
    [83422960,13,"HOYOS MOTATO LUIS ANGEL","1265 BRYAN LOSADA QUICENO","SPORTAGE MOD 2026 NQ2A35__25G2000","PLATA","2026-03-31",1,"EVEM 5971","CALI","ok","QOK422","KNAPU81DBT7481469","MATRICULADO","ABRIL","SPORTAGE"],
    [83439162,11,"MOLINA RIASCOS MABEL KARINA","1697 MELENDEZ LOPEZ CLARET YAZMIN","PICANTO MOD 2027 JA3M45__25G1202","PLATA","2026-03-31",6,"EVEK 5845","CALI","OK","QNZ830","KNAB2512AVT452132","MATRICULADO","ABRIL","PICANTO"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = Array(16).fill({ wch: 20 });
  XLSX.utils.book_append_sheet(wb, ws, "Formato Base_Comisiones");

  const instr = [
    ["INSTRUCCIONES"], [""],
    ["Columna","Descripción","¿Se usa?"],
    ["PEDIDO","Número de pedido","No"],
    ["Con.","Contador","No"],
    ["Cliente","Nombre del cliente","SÍ → client_name"],
    ["Vendedor","Código + nombre del asesor","SÍ → advisor"],
    ["VEHICULO","Modelo completo — se extrae código final","SÍ → vehicle"],
    ["Color","Color","No"],
    ["F.apert.","Fecha base (año y mes)","SÍ (combinada con DIA)"],
    ["DIA MATRICULA","Día exacto de matrícula","SÍ → sale_date"],
    ["Serie/Nro","Número de serie/factura","SÍ → invoice"],
    ["CIUDAD","Ciudad","No"],
    ["SOAT","Estado SOAT","No"],
    ["PLACA","Placa del vehículo","SÍ → plate"],
    ["Chasis","Número de chasis","No"],
    ["INDICADOR","Estado","No"],
    ["MES","Mes","No"],
    ["FAMILIA","Familia del vehículo","No"],
    [""],
    ["Fecha de venta = F.apert (año y mes) + DIA MATRICULA (día exacto)"],
    ["Código del vehículo = último bloque de VEHICULO:"],
    ["  'SPORTAGE MOD 2026 NQ2A35__25G2000' → 'NQ2A35__25G2000'"],
    ["El sistema detecta automáticamente el formato del archivo."],
  ];
  const wsI = XLSX.utils.aoa_to_sheet(instr);
  wsI["!cols"] = [{ wch: 20 }, { wch: 48 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsI, "Instrucciones");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}