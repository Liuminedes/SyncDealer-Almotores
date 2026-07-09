// backend/src/middlewares/vehicles.import.middleware.js
// Multer configurado para aceptar solo archivos Excel en memoria
import multer from "multer";
import { HttpError } from "../utils/httpError.js";

// MIMES estrictos — application/octet-stream eliminado (acepta cualquier binario)
const ALLOWED_MIMES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel",                                           // .xls
];

const storage = multer.memoryStorage(); // buffer en RAM, no toca el disco

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB máx (suficiente para cualquier Excel de nómina)
    files: 1,                   // Un solo archivo por request
  },
  fileFilter: (_req, file, cb) => {
    const ext  = (file.originalname || "").toLowerCase();
    const mime = file.mimetype || "";

    const validExt  = ext.endsWith(".xlsx") || ext.endsWith(".xls");
    const validMime = ALLOWED_MIMES.includes(mime);

    // SEGURO: ambas condiciones deben cumplirse (AND, no OR)
    // Evita que un archivo malicioso con MIME genérico pase el filtro
    if (validExt && validMime) return cb(null, true);

    cb(new HttpError(400, "Solo se aceptan archivos Excel válidos (.xlsx o .xls)"));
  },
});

// Middleware listo para usar en la ruta: uploadExcel.single("file")
export const uploadExcel = upload;
