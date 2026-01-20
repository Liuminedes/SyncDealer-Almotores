import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";

export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      throw new HttpError(401, "No autenticado");
    }

    const payload = jwt.verify(token, ENV.JWT_SECRET);
    req.user = payload; // { id, role, iat, exp }
    next();
  } catch (err) {
    next(new HttpError(401, "Token inválido o expirado"));
  }
}
