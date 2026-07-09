import { z } from "zod";

export const listRunsSchema = {
  query: z.object({
    brand:      z.string().min(1).optional(),
    page:       z.coerce.number().int().min(1).optional(),
    limit:      z.coerce.number().int().min(1).max(100).optional(),
    advisor_id: z.coerce.number().int().positive().optional(),
    cut_year:   z.coerce.number().int().min(2000).max(2100).optional(),
    cut_month:  z.coerce.number().int().min(1).max(12).optional(),
    fortnight:  z.enum(["FIRST", "SECOND"]).optional(),
    status: z
      .enum(["DRAFT", "CALCULATED", "ADVISOR_APPROVED", "ADVISOR_REJECTED", "ASST_VALIDATED", "SENT_TO_HR"])
      .optional(),
  }),
};

export const runIdParamSchema = {
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
};

export const calculateRunSchema = {
  body: z.object({
    advisor_id: z.coerce.number().int().positive(),
    cut_year:   z.coerce.number().int().min(2000).max(2100),
    cut_month:  z.coerce.number().int().min(1).max(12),
    fortnight:  z.enum(["FIRST", "SECOND"]),
    notes: z
      .string()
      .max(255)
      .optional()
      .nullable()
      .transform((v) => (v == null ? undefined : String(v).trim())),
  }),
};

export const updateRunStatusSchema = {
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    status: z.enum([
      "DRAFT",
      "CALCULATED",
      "ADVISOR_APPROVED",
      "ADVISOR_REJECTED",
      "ASST_VALIDATED",
      "SENT_TO_HR",
    ]),
  }),
};

// Nuevo: schema para PATCH /:id/adjustment
export const adjustmentSchema = {
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    // Monto siempre positivo; el campo type determina si suma o resta
    amount: z.coerce
      .number()
      .positive({ message: "amount debe ser mayor a 0" }),

    // ADD = suma, SUBTRACT = resta
    type: z.enum(["ADD", "SUBTRACT"], {
      errorMap: () => ({ message: "type debe ser 'ADD' o 'SUBTRACT'" }),
    }),

    // Concepto obligatorio (mínimo 5 caracteres)
    note: z
      .string()
      .min(5, { message: "note debe tener al menos 5 caracteres" })
      .max(500),
  }),
};
