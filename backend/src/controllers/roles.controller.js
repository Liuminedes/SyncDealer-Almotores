import { Role } from "../models/index.js";

export async function listRoles(req, res, next) {
  try {
    const roles = await Role.findAll({
      where: { is_active: true },
      order: [["id", "ASC"]],
    });
    return res.json({ ok: true, data: roles });
  } catch (err) {
    next(err);
  }
}
