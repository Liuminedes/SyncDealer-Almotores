// backend/src/services/users/users.import.service.js  v3
// FIX: marca no se asignaba por insertId null + mejor detección de columna marca
// SECURITY: contraseña inicial ahora es aleatoria (crypto.randomBytes), no la cédula
import XLSX      from "xlsx";
import bcrypt    from "bcryptjs";
import crypto    from "crypto";
import { sequelize } from "../../config/db.js";
import { HttpError }  from "../../utils/httpError.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cellStr(val) {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function parseDate(val) {
  if (!val) return null;
  if (typeof val === "number") {
    try {
      const date = XLSX.SSF.parse_date_code(val);
      if (date) return `${date.y}-${String(date.m).padStart(2,"0")}-${String(date.d).padStart(2,"0")}`;
    } catch { /* continuar */ }
  }
  const str = cellStr(val);
  if (!str) return null;
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,"0")}-${dmy[1].padStart(2,"0")}`;
  const ymd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2,"0")}-${ymd[3].padStart(2,"0")}`;
  return null;
}

async function loadBranchMap() {
  const [rows] = await sequelize.query(`SELECT id, name FROM branches`);
  const map = {};
  for (const r of rows || []) map[String(r.name).toLowerCase().trim()] = Number(r.id);
  return map;
}

async function loadBrandMap() {
  const [rows] = await sequelize.query(`SELECT id, name, code FROM brands`);
  const map = {};
  for (const r of rows || []) {
    if (r.code) map[String(r.code).toLowerCase().trim()] = Number(r.id);
    if (r.name) map[String(r.name).toLowerCase().trim()] = Number(r.id);
  }
  return map;
}

async function getAdvisorRoleId() {
  const [rows] = await sequelize.query(
    `SELECT id FROM roles WHERE LOWER(name) IN ('advisor','asesor','asesor comercial') LIMIT 1`
  );
  if (rows?.[0]?.id) return Number(rows[0].id);
  const [rows2] = await sequelize.query(
    `SELECT id FROM roles WHERE LOWER(name) LIKE '%advisor%' OR LOWER(name) LIKE '%asesor%' LIMIT 1`
  );
  if (rows2?.[0]?.id) return Number(rows2[0].id);
  throw new HttpError(500, "No se encontró el rol ADVISOR en la BD.");
}

// FIX: assignBrand ahora recibe email como fallback para buscar userId
async function assignBrand({ userId, brandId, t }) {
  if (!userId || !brandId) return;
  await sequelize.query(
    `INSERT INTO user_brand_access (user_id, brand_id, can_view, can_generate, created_at, updated_at)
     VALUES (:user_id, :brand_id, 1, 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE can_view = 1, can_generate = 1, updated_at = NOW()`,
    { replacements: { user_id: userId, brand_id: brandId }, transaction: t }
  );
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function importUsersFromExcel(fileBuffer) {
  if (!fileBuffer?.length) throw new HttpError(400, "El archivo está vacío");

  let workbook;
  try {
    workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: false, raw: false });
  } catch {
    throw new HttpError(400, "No se pudo leer el archivo. Verifica que sea .xlsx o .xls válido.");
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new HttpError(400, "El archivo no tiene hojas.");

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1, raw: false, defval: null, blankrows: false,
  });
  const rowsRaw = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1, raw: true, defval: null, blankrows: false,
  });

  if (rows.length < 2) throw new HttpError(400, "El archivo no tiene datos.");

  // Detectar columnas por encabezado
  const headers = (rows[0] || []).map(h => cellStr(h).toLowerCase());
  const colIdx = {
    nombre:   headers.findIndex(h => h.includes("nombre")),
    correo:   headers.findIndex(h => h.includes("correo") || h.includes("email") || h.includes("mail")),
    sede:     headers.findIndex(h => h.includes("sede")),
    marca:    headers.findIndex(h => h.includes("marca")),
    telefono: headers.findIndex(h => h.includes("tel") || h.includes("phone")),
    cedula:   headers.findIndex(h => h.includes("cedula") || h.includes("cédula") || h.includes("documento")),
    ingreso:  headers.findIndex(h => h.includes("ingreso") || h.includes("fecha")),
  };
  // Fallback posición fija A=0 B=1 C=2 D=3 E=4 F=5 G=6
  if (colIdx.nombre   < 0) colIdx.nombre   = 0;
  if (colIdx.correo   < 0) colIdx.correo   = 1;
  if (colIdx.sede     < 0) colIdx.sede     = 2;
  if (colIdx.marca    < 0) colIdx.marca    = 3;
  if (colIdx.telefono < 0) colIdx.telefono = 4;
  if (colIdx.cedula   < 0) colIdx.cedula   = 5;
  if (colIdx.ingreso  < 0) colIdx.ingreso  = 6;

  const [branchMap, brandMap, advisorRoleId] = await Promise.all([
    loadBranchMap(),
    loadBrandMap(),
    getAdvisorRoleId(),
  ]);

  const dataRows = rows.slice(1);
  const results  = { created: 0, updated: 0, skipped: 0, errors: [] };
  const t = await sequelize.transaction();

  try {
    for (let i = 0; i < dataRows.length; i++) {
      const row    = dataRows[i];
      const rawRow = rowsRaw[i + 1];
      const rowNum = i + 2;

      const fullName = cellStr(row[colIdx.nombre]);
      const email    = cellStr(row[colIdx.correo]).toLowerCase();
      const sedeName = cellStr(row[colIdx.sede]);
      const marcaVal = cellStr(row[colIdx.marca]);
      const telefono = cellStr(row[colIdx.telefono]);
      const cedula   = cellStr(row[colIdx.cedula]);
      const hireDate = parseDate(rawRow?.[colIdx.ingreso]) || parseDate(row[colIdx.ingreso]);

      if (!fullName) { results.skipped++; continue; }
      if (!email || !email.includes("@")) {
        results.errors.push({ row: rowNum, nombre: fullName, error: "Email inválido o vacío" });
        results.skipped++; continue;
      }

      // Resolver sede
      const branchId = sedeName ? (branchMap[sedeName.toLowerCase()] || null) : null;
      if (sedeName && !branchId) {
        results.errors.push({ row: rowNum, nombre: fullName,
          error: `Sede "${sedeName}" no encontrada. Disponibles: ${Object.keys(branchMap).join(", ")}` });
        results.skipped++; continue;
      }

      // Resolver marca
      const brandId = marcaVal ? (brandMap[marcaVal.toLowerCase()] || null) : null;
      if (marcaVal && !brandId) {
        results.errors.push({ row: rowNum, nombre: fullName,
          error: `Marca "${marcaVal}" no encontrada. Disponibles: ${Object.keys(brandMap).join(", ")}` });
        results.skipped++; continue;
      }

      try {
        const [existing] = await sequelize.query(
          `SELECT id FROM users WHERE email = :email LIMIT 1`,
          { replacements: { email }, transaction: t }
        );

        if (existing?.length > 0) {
          // ── UPDATE ────────────────────────────────────────────────────────
          const userId = Number(existing[0].id);
          const updateFields = ["full_name = :full_name", "phone = :phone", "updated_at = NOW()"];
          const updateRepl   = { full_name: fullName, phone: telefono || null, userId };

          if (branchId) { updateFields.push("branch_id = :branch_id");            updateRepl.branch_id       = branchId; }
          if (cedula)   { updateFields.push("document_number = :document_number"); updateRepl.document_number = cedula;   }
          if (hireDate) { updateFields.push("hire_date = :hire_date");             updateRepl.hire_date       = hireDate; }

          await sequelize.query(
            `UPDATE users SET ${updateFields.join(", ")} WHERE id = :userId`,
            { replacements: updateRepl, transaction: t }
          );

          // Asignar marca (siempre, aunque ya exista — ON DUPLICATE KEY UPDATE la confirma)
          if (brandId) await assignBrand({ userId, brandId, t });
          results.updated++;

        } else {
          // ── CREATE ────────────────────────────────────────────────────────
          // SEGURO: contraseña temporal aleatoria, nunca la cédula (dato público)
          // El admin deberá comunicar la contraseña al asesor por canal seguro
          const rawPassword   = crypto.randomBytes(12).toString("base64url");
          const password_hash = await bcrypt.hash(rawPassword, 12); // cost 12 para prod

          await sequelize.query(
            `INSERT INTO users
               (full_name, email, password_hash, role_id, document_number,
                phone, branch_id, hire_date, is_active, created_at, updated_at)
             VALUES
               (:full_name, :email, :password_hash, :role_id, :document_number,
                :phone, :branch_id, :hire_date, 1, NOW(), NOW())`,
            {
              replacements: {
                full_name:       fullName,
                email,
                password_hash,
                role_id:         advisorRoleId,
                document_number: cedula    || null,
                phone:           telefono  || null,
                branch_id:       branchId  || null,
                hire_date:       hireDate  || null,
              },
              transaction: t,
            }
          );

          // FIX: buscar el id recién insertado por email en lugar de confiar en insertId
          // Esto es más robusto con todas las versiones de MySQL/Sequelize
          const [newUserRows] = await sequelize.query(
            `SELECT id FROM users WHERE email = :email LIMIT 1`,
            { replacements: { email }, transaction: t }
          );
          const newUserId = newUserRows?.[0]?.id ? Number(newUserRows[0].id) : null;

          if (newUserId && brandId) await assignBrand({ userId: newUserId, brandId, t });
          results.created++;
        }
      } catch (rowErr) {
        results.errors.push({
          row:    rowNum,
          nombre: fullName,
          error:  rowErr?.parent?.sqlMessage || rowErr?.message || "Error desconocido",
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

// ─── Plantilla descargable ────────────────────────────────────────────────────

export function generateUsersImportTemplate() {
  const wb = XLSX.utils.book_new();

  const data = [
    ["Nombre", "Correo", "Sede", "Marca", "Telefono", "Cedula", "Ingreso"],
    ["Vicente Emilio Muñoz Quiceno", "vmunoz@almotores.com",   "Sede 39",   "KIA", "3116350420", "94273355",   "10/12/2025"],
    ["Daniela Zamora Hoyos",         "dzamora@almotores.com",  "Sede 39",   "KIA", "3155202468", "1144048319", "9/04/2025" ],
    ["Carlos Valencia Cano",         "cvalencia@almotores.com","Pasoancho",  "KIA", "3122827436", "1130620540", "21/03/2025"],
    ["Ana Coronel Lozano",           "acoronel@almotores.com", "Pasoancho",  "KIA", "3155733511", "30718327",   "19/02/2025"],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 30 }, { wch: 28 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, "Asesores");

  const instrData = [
    ["INSTRUCCIONES DE IMPORTACIÓN DE ASESORES"],
    [""],
    ["Columna",  "Descripción",                                       "Obligatorio"],
    ["Nombre",   "Nombre completo del asesor",                         "SÍ"],
    ["Correo",   "Email corporativo — clave de upsert",                "SÍ"],
    ["Sede",     "Nombre exacto de la sede registrada en el sistema",  "SÍ"],
    ["Marca",    "Código de marca: KIA, JAC, VW, REN…",               "SÍ"],
    ["Telefono", "Número de contacto",                                 "No"],
    ["Cedula",   "Cédula — también se usa como contraseña inicial",     "Recomendado"],
    ["Ingreso",  "Fecha de ingreso DD/MM/YYYY",                        "No"],
    [""],
    ["REGLAS:"],
    ["- Si el correo ya existe → actualiza nombre, sede, teléfono, cédula y fecha ingreso."],
    ["- Si no existe → crea con rol ADVISOR y contraseña = cédula."],
    ["- La Sede debe coincidir exactamente con el nombre en el sistema (ej: 'Sede 39')."],
    ["- La Marca debe coincidir con el código o nombre registrado (ej: KIA)."],
    ["- Se puede subir el mismo archivo varias veces sin duplicar datos."],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instrData);
  wsInstr["!cols"] = [{ wch: 20 }, { wch: 58 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, "Instrucciones");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}