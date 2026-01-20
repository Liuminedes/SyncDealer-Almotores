import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { ENV } from "../../config/env.js";
import { sequelize } from "../../config/db.js";
import { HttpError } from "../../utils/httpError.js";

async function getUserByEmail(email) {
  const [rows] = await sequelize.query(
    `
    SELECT u.id, u.full_name, u.email, u.password_hash, u.role_id, u.branch_id, u.is_active
    FROM users u
    WHERE u.email = :email
    LIMIT 1
    `,
    { replacements: { email } }
  );

  return rows?.[0] || null;
}

async function getRoleName(roleId) {
  const [rows] = await sequelize.query(
    `SELECT name FROM roles WHERE id = :roleId LIMIT 1`,
    { replacements: { roleId } }
  );
  return rows?.[0]?.name || null;
}

async function getUserBrandAccess(userId) {
  const [rows] = await sequelize.query(
    `
    SELECT b.id AS brand_id, b.name, b.code, uba.can_view, uba.can_generate
    FROM user_brand_access uba
    JOIN brands b ON b.id = uba.brand_id
    WHERE uba.user_id = :userId
    ORDER BY b.code
    `,
    { replacements: { userId } }
  );
  return rows || [];
}

function signToken(payload) {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: ENV.JWT_EXPIRES_IN });
}

export const authService = {
  async login({ email, password }) {
    const user = await getUserByEmail(email);
    if (!user) throw new HttpError(401, "Credenciales inválidas");

    if (!user.is_active) throw new HttpError(403, "Usuario inactivo");

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new HttpError(401, "Credenciales inválidas");

    const roleName = await getRoleName(user.role_id);
    if (!roleName) throw new HttpError(500, "Rol inválido");

    const brands = await getUserBrandAccess(user.id);

    const token = signToken({
      id: user.id,
      role: roleName,
    });

    return {
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: roleName,
        branch_id: user.branch_id,
        brands,
      },
    };
  },

  async getMe(userId) {
    const [rows] = await sequelize.query(
      `
      SELECT u.id, u.full_name, u.email, u.role_id, u.branch_id, u.is_active
      FROM users u
      WHERE u.id = :userId
      LIMIT 1
      `,
      { replacements: { userId } }
    );

    const user = rows?.[0];
    if (!user) throw new HttpError(404, "Usuario no encontrado");
    if (!user.is_active) throw new HttpError(403, "Usuario inactivo");

    const roleName = await getRoleName(user.role_id);
    const brands = await getUserBrandAccess(user.id);

    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: roleName,
      branch_id: user.branch_id,
      brands,
    };
  },
};
