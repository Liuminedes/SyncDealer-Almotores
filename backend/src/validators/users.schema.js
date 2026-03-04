// src/validators/users.schema.js
import { z } from "zod";

export const listUsersSchema = {
  query: z.object({
    page:     z.coerce.number().int().min(1).optional(),
    limit:    z.coerce.number().int().min(1).max(100).optional(),
    q:        z.string().optional(),
    role:     z.string().optional(),
    status:   z.enum(["active", "inactive"]).optional(),
    brand_id: z.coerce.number().int().positive().optional(),
    _t:       z.coerce.number().optional(), // cache buster
  }),
};

export const userIdParamSchema = {
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
};

export const createUserSchema = {
  body: z.object({
    full_name:       z.string().min(3),
    email:           z.string().email(),
    password:        z.string().min(6),
    role_id:         z.number().int().positive(),
    document_number: z.string().max(30).optional().nullable(),
    phone:           z.string().max(30).optional().nullable(),
    hire_date:       z.string().optional().nullable(),
    branch_id:       z.number().int().positive().optional().nullable(),
    is_active:       z.boolean().optional(),
  }),
};

export const updateUserSchema = {
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    full_name:       z.string().min(3).optional(),
    email:           z.string().email().optional(),
    password:        z.string().min(6).optional(),
    role_id:         z.number().int().positive().optional(),
    document_number: z.string().max(30).optional().nullable(),
    phone:           z.string().max(30).optional().nullable(),
    hire_date:       z.string().optional().nullable(),
    branch_id:       z.number().int().positive().optional().nullable(),
    is_active:       z.boolean().optional(),
  }),
};

export const setStatusSchema = {
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    is_active: z.boolean(),
  }),
};

export const replaceUserBrandsSchema = {
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    brands: z
      .array(
        z.object({
          brand_id:     z.number().int().positive(),
          can_view:     z.boolean(),
          can_generate: z.boolean(),
        })
      )
      .default([]),
  }),
};