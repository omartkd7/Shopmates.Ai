import { z } from "zod";

export const categoryIdParamSchema = z.object({
  id: z.coerce.number().int().positive("Category ID must be a positive integer"),
});

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(100, "Category name is too long"),
  description: z.string().trim().optional().nullable(),
});

export const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(100, "Category name is too long")
    .optional(),
  description: z.string().trim().optional().nullable(),
});

export type CategoryIdParam = z.infer<typeof categoryIdParamSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
