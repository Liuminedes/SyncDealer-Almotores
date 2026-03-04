import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { sequelize } from "../../config/db.js";
import { HttpError } from "../../utils/httpError.js";
import User from "../../models/User.js";
import Role from "../../models/Role.js";
import Brand from "../../models/Brand.js";
import Branch from "../../models/Branch.js";
import UserBrandAccess from "../../models/UserBrandAccess.js";

function mapBrands(userInstance) {
  const raw = userInstance?.Brands || [];
  return raw.map((b) => ({
    brand_id: b.id,
    name: b.name,
    code: b.code,
    can_view: b.UserBrandAccess?.can_view ?? false,
    can_generate: b.UserBrandAccess?.can_generate ?? false,
  }));
}

function buildPasswordUpdate(userInstance, password_hash) {
  const attrs = userInstance?.rawAttributes || {};
  if (attrs.password_hash) return { password_hash };
  if (attrs.password) return { password: password_hash };
  throw new HttpError(500, "Modelo User no tiene campo password/password_hash");
}

// Campos públicos que se devuelven siempre
function serializeUser(u) {
  return {
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    document_number: u.document_number || null,
    phone: u.phone || null,
    hire_date: u.hire_date || null,
    is_active: u.is_active,
    role: u.role ? { id: u.role.id, name: u.role.name } : null,
    branch: u.branch ? { id: u.branch.id, name: u.branch.name, code: u.branch.code ?? null } : null,
    brands: mapBrands(u),
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

const USER_INCLUDE = [
  { model: Role, as: "role", attributes: ["id", "name"] },
  { model: Branch, as: "branch", attributes: ["id", "name"], required: false },
  {
    model: Brand,
    attributes: ["id", "name", "code"],
    through: { attributes: ["can_view", "can_generate"] },
    required: false,
  },
];

export async function listUsers(query = {}) {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);
  const offset = (page - 1) * limit;

  const q = (query.q || "").trim();
  const roleName = (query.role || "").trim();
  const status = query.status;
  const brand_id = query.brand_id ? Number(query.brand_id) : null;

  const where = {};
  if (q) {
    where[Op.or] = [
      { full_name: { [Op.like]: `%${q}%` } },
      { email: { [Op.like]: `%${q}%` } },
      { document_number: { [Op.like]: `%${q}%` } },
    ];
  }
  if (status === "active") where.is_active = true;
  if (status === "inactive") where.is_active = false;

  const include = [
    {
      model: Role,
      as: "role",
      attributes: ["id", "name"],
      ...(roleName ? { where: { name: roleName }, required: true } : { required: false }),
    },
    { model: Branch, as: "branch", attributes: ["id", "name"], required: false },
    {
      model: Brand,
      attributes: ["id", "name", "code"],
      through: { attributes: ["can_view", "can_generate"] },
      required: !!brand_id,
      ...(brand_id ? { where: { id: brand_id } } : {}),
    },
  ];

  const { rows, count } = await User.findAndCountAll({
    where, include, distinct: true,
    order: [["id", "DESC"]],
    limit, offset,
  });

  return {
    items: rows.map(serializeUser),
    page, limit,
    total: count,
    totalPages: Math.ceil(count / limit),
  };
}

export async function getUserById(id) {
  const user = await User.findByPk(id, { include: USER_INCLUDE });
  if (!user) throw new HttpError(404, "Usuario no encontrado");
  return serializeUser(user);
}

export async function createUser(payload) {
  const {
    full_name, email, password, role_id,
    document_number, phone, hire_date, branch_id,
    is_active = true,
  } = payload;

  const exists = await User.findOne({ where: { email } });
  if (exists) throw new HttpError(409, "Ya existe un usuario con ese email");

  const role = await Role.findByPk(role_id);
  if (!role) throw new HttpError(400, "Rol inválido");

  if (branch_id) {
    const branch = await Branch.findByPk(branch_id);
    if (!branch) throw new HttpError(400, "Sede inválida");
  }

  const password_hash = await bcrypt.hash(password, 10);

  const user = await User.create({
    full_name, email, role_id, is_active,
    document_number: document_number || null,
    phone: phone || null,
    hire_date: hire_date || null,
    branch_id: branch_id || null,
    ...buildPasswordUpdate(User, password_hash),
  });

  return getUserById(user.id);
}

export async function updateUser(id, payload) {
  const user = await User.findByPk(id);
  if (!user) throw new HttpError(404, "Usuario no encontrado");

  if (payload.email && payload.email !== user.email) {
    const exists = await User.findOne({ where: { email: payload.email } });
    if (exists) throw new HttpError(409, "Ya existe un usuario con ese email");
  }

  if (payload.role_id) {
    const role = await Role.findByPk(payload.role_id);
    if (!role) throw new HttpError(400, "Rol inválido");
  }

  if (payload.branch_id != null) {
    const branch = await Branch.findByPk(payload.branch_id);
    if (!branch) throw new HttpError(400, "Sede inválida");
  }

  if (payload.password) {
    const password_hash = await bcrypt.hash(payload.password, 10);
    Object.assign(payload, buildPasswordUpdate(user, password_hash));
    delete payload.password;
  }

  // Campos editables explícitos
  const editable = [
    "full_name", "email", "role_id", "branch_id",
    "document_number", "phone", "hire_date", "is_active",
    "password_hash",
  ];

  const patch = Object.fromEntries(
    Object.entries(payload)
      .filter(([k]) => editable.includes(k))
      .map(([k, v]) => [k, v === "" ? null : v])  // convierte strings vacíos a null
  );

  await user.update(patch);
  return getUserById(id);
}

export async function setUserStatus(id, is_active) {
  const user = await User.findByPk(id);
  if (!user) throw new HttpError(404, "Usuario no encontrado");
  await user.update({ is_active: !!is_active });
  return { id: user.id, is_active: user.is_active };
}

export async function getUserBrands(id) {
  const user = await User.findByPk(id, {
    include: [{
      model: Brand,
      attributes: ["id", "name", "code"],
      through: { attributes: ["can_view", "can_generate"] },
    }],
  });
  if (!user) throw new HttpError(404, "Usuario no encontrado");
  return mapBrands(user);
}

export async function replaceUserBrands(id, brandsPayload = []) {
  const user = await User.findByPk(id);
  if (!user) throw new HttpError(404, "Usuario no encontrado");

  const brandIds = brandsPayload.map((b) => Number(b.brand_id)).filter(Boolean);
  if (brandIds.length) {
    const brands = await Brand.findAll({ where: { id: brandIds } });
    if (brands.length !== brandIds.length)
      throw new HttpError(400, "Una o más marcas no existen");
  }

  await sequelize.transaction(async (t) => {
    await UserBrandAccess.destroy({ where: { user_id: id }, transaction: t });
    if (brandsPayload.length) {
      await UserBrandAccess.bulkCreate(
        brandsPayload.map((b) => ({
          user_id: id,
          brand_id: Number(b.brand_id),
          can_view: !!b.can_view,
          can_generate: !!b.can_generate,
        })),
        { transaction: t }
      );
    }
  });

  return getUserBrands(id);
}