// backend/src/middlewares/vehicles.import.middleware.js
// Multer configurado para aceptar solo archivos Excel en memoria
import multer from "multer";
import { HttpError } from "../utils/httpError.js";

const ALLOWED_MIMES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel",                                           // .xls
  "application/octet-stream",                                           // algunos navegadores
];

const storage = multer.memoryStorage(); // buffer en RAM, no toca el disco

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB máx
  fileFilter: (_req, file, cb) => {
    const ext  = (file.originalname || "").toLowerCase();
    const mime = file.mimetype || "";

    const validExt  = ext.endsWith(".xlsx") || ext.endsWith(".xls");
    const validMime = ALLOWED_MIMES.includes(mime);

    if (validExt || validMime) return cb(null, true);
    cb(new HttpError(400, "Solo se aceptan archivos Excel (.xlsx o .xls)"));
  },
});

// Middleware listo para usar en la ruta: uploadExcel.single("file")
export const uploadExcel = upload;
