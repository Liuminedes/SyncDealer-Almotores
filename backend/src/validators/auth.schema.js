import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    // maxLength en email y password previene ataque DoS via bcrypt con strings masivos
    email:    z.string().email().max(120),
    password: z.string().min(6).max(128),
  }),
});

