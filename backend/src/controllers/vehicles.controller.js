import {
  listVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  setVehicleStatus,
} from "../services/vehicles/vehicles.service.js";

export async function list(req, res, next) {
  try {
    const data = await listVehicles(req.query);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const data = await getVehicleById(req.params.id);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const data = await createVehicle(req.body);
    res.status(201).json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const data = await updateVehicle(req.params.id, req.body);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function setStatus(req, res, next) {
  try {
    const { is_active } = req.body;
    const data = await setVehicleStatus(req.params.id, is_active);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
