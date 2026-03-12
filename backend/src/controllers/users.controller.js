// src/controllers/users.controller.js
import * as usersService from "../services/users/users.service.js";

export async function listUsers(req, res, next) {
  try {
    const query = req.validated?.query || req.query;
    const data = await usersService.listUsers(query);
    return res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req, res, next) {
  try {
    const params = req.validated?.params || req.params;
    const data = await usersService.getUserById(Number(params.id));
    return res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const body = req.validated?.body || req.body;
    const data = await usersService.createUser(body);
    return res.status(201).json({ ok: true, data, message: "Usuario creado" });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const params = req.validated?.params || req.params;
    const body = req.validated?.body || req.body;

    const data = await usersService.updateUser(Number(params.id), body);
    return res.json({ ok: true, data, message: "Usuario actualizado" });
  } catch (err) {
    next(err);
  }
}

export async function setUserStatus(req, res, next) {
  try {
    const params = req.validated?.params || req.params;
    const body = req.validated?.body || req.body;

    const data = await usersService.setUserStatus(Number(params.id), body.is_active);
    return res.json({ ok: true, data, message: "Estado actualizado" });
  } catch (err) {
    next(err);
  }
}

export async function getUserBrands(req, res, next) {
  try {
    const params = req.validated?.params || req.params;
    const data = await usersService.getUserBrands(Number(params.id));
    return res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function replaceUserBrands(req, res, next) {
  try {
    const params = req.validated?.params || req.params;
    const body = req.validated?.body || req.body;

    // ✅ soporta ambos formatos:
    // - body = [{...}, {...}]  (recomendado)
    // - body = { brands: [...] } (tu versión anterior)
    const brandsPayload = Array.isArray(body) ? body : body.brands;

    const data = await usersService.replaceUserBrands(Number(params.id), brandsPayload);
    return res.json({
      ok: true,
      data,
      message: "Permisos por marca actualizados",
    });
  } catch (err) {
    next(err);
  }
}

// ── listAdvisorsForBrandOp — asesores de la marca del BrandOp ─────────────
export async function listAdvisorsForBrandOp(req, res, next) {
  try {
    const opUserId = req.user.id;

    const [advisors] = await sequelize.query(
      `SELECT
         u.id, u.full_name, u.email, u.phone, u.document_number,
         u.hire_date, u.is_active,
         br.name AS branch_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       JOIN user_brand_access uba_advisor ON uba_advisor.user_id = u.id
       JOIN user_brand_access uba_op      ON uba_op.brand_id = uba_advisor.brand_id
         AND uba_op.user_id = :opUserId
       LEFT JOIN branches br ON br.id = u.branch_id
       WHERE r.name = 'ADVISOR'
         AND u.is_active = 1
       ORDER BY u.full_name ASC`,
      { replacements: { opUserId } }
    );

    res.json({ ok: true, data: { items: advisors, total: advisors.length } });
  } catch (err) { next(err); }
}

// ── updateAdvisorVacationOnly — BrandOp solo puede modificar vacaciones ────
// Body esperado: { is_on_vacation: true/false }
// Esto es diferente al CRUD de AdvisorVacation (crear ausencias con fechas).
// Este endpoint es para el toggle rápido de estado de vacaciones del asesor.
export async function updateAdvisorVacationOnly(req, res, next) {
  try {
    const advisorId    = Number(req.params.id);
    const is_on_vacation = req.body?.is_on_vacation;

    if (typeof is_on_vacation !== "boolean")
      throw new HttpError(400, "Campo requerido: is_on_vacation (boolean)");

    // Verificar que el usuario es un ADVISOR activo
    const [rows] = await sequelize.query(
      `SELECT u.id FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = :advisorId AND r.name = 'ADVISOR' AND u.is_active = 1 LIMIT 1`,
      { replacements: { advisorId } }
    );
    if (!rows?.[0]) throw new HttpError(404, "Asesor no encontrado");

    // Nota: la columna is_on_vacation debe existir en la tabla users
    // Si no existe, se gestiona a través de la tabla advisor_vacations
    // En ese caso este endpoint crea/desactiva una entrada de vacaciones
    const today = new Date().toISOString().slice(0, 10);

    if (is_on_vacation) {
      // Crear entrada de vacación activa si no existe una vigente
      await sequelize.query(
        `INSERT INTO advisor_vacations (advisor_id, start_date, end_date, is_active, notes, created_at, updated_at)
         SELECT :advisorId, :today, '2099-12-31', 1, 'Activado manualmente', NOW(), NOW()
         WHERE NOT EXISTS (
           SELECT 1 FROM advisor_vacations
           WHERE advisor_id = :advisorId AND is_active = 1
             AND start_date <= :today AND end_date >= :today
         )`,
        { replacements: { advisorId, today } }
      );
    } else {
      // Desactivar todas las vacaciones activas del asesor
      await sequelize.query(
        `UPDATE advisor_vacations
         SET is_active = 0, end_date = :today, updated_at = NOW()
         WHERE advisor_id = :advisorId AND is_active = 1 AND end_date >= :today`,
        { replacements: { advisorId, today } }
      );
    }

    res.json({
      ok: true,
      message: is_on_vacation ? "Asesor marcado en vacaciones" : "Vacaciones desactivadas",
      data: { id: advisorId, is_on_vacation },
    });
  } catch (err) { next(err); }
}