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
