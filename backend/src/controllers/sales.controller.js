import Sale from "../models/Sale.js";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";

export const list = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    q,
    brand_id,
    date_from,
    date_to,
  } = req.query;

  const where = {};

  if (brand_id) where.brand_id = brand_id;

  if (date_from && date_to) {
    where.sale_date = {
      $between: [date_from, date_to],
    };
  }

  if (q) {
    where.$or = [
      { invoice: { $like: `%${q}%` } },
      { client_name: { $like: `%${q}%` } },
      { plate: { $like: `%${q}%` } },
    ];
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await Sale.findAndCountAll({
    where,
    limit: Number(limit),
    offset,
    order: [["sale_date", "DESC"]],
    include: [
      { model: User, as: "advisor", attributes: ["id", "full_name", "email"] },
      { model: Vehicle, as: "vehicle", attributes: ["id", "code", "model", "version"] },
    ],
  });

  res.json({
    data: {
      items: rows,
      total: count,
      page: Number(page),
      limit: Number(limit),
    },
  });
};

export const create = async (req, res) => {
  const saleDate = new Date(req.body.sale_date);
  const month = saleDate.getMonth() + 1;
  const day = saleDate.getDate();

  const payload = {
    ...req.body,
    cut_month: month,
    fortnight: day <= 15 ? "FIRST" : "SECOND",
    charge_month: null,
  };

  const sale = await Sale.create(payload);
  res.status(201).json({ sale });
};

export const getById = async (req, res) => {
  const sale = await Sale.findByPk(req.params.id);
  if (!sale) return res.status(404).json({ message: "Venta no encontrada" });
  res.json({ sale });
};

export const update = async (req, res) => {
  const sale = await Sale.findByPk(req.params.id);
  if (!sale) return res.status(404).json({ message: "Venta no encontrada" });

  const saleDate = new Date(req.body.sale_date);
  const month = saleDate.getMonth() + 1;
  const day = saleDate.getDate();

  await sale.update({
    ...req.body,
    cut_month: month,
    fortnight: day <= 15 ? "FIRST" : "SECOND",
    charge_month: null,
  });

  res.json({ sale });
};
